var methods = require('methods');
var flatten = require('array-flatten');
var compose = require('koa-compose');
var Layer   = require('./layer');
var extend  = require('./extend');

/**
 * Return the function execution stack or create a new one.
 *
 * @return {Array}
 */
var stack = function () {
  return this._stack || (this._stack = []);
};

/**
 * Sanitize a function to accept an optional path and unlimited middleware.
 *
 * @param  {Function} fn [description]
 * @return {[type]}      [description]
 */
var sanitize = function (fn) {
  return function (/* path, ...middleware */) {
    var path       = null;
    var options    = null;
    var middleware = arguments;

    // Allow an optional path prefix.
    if (typeof middleware[0] === 'string') {
      path       = middleware[0];
      middleware = Array.prototype.slice.call(middleware, 1);
    }

    // Allow an optional trailing options object.
    if (typeof middleware[middleware.length - 1] === 'object') {
      options    = middleware[middleware.length - 1];
      middleware = Array.prototype.slice.call(middleware, 0, -1);
    }

    // Flatten the middleware stack.
    middleware = flatten(middleware);

    // If we only have a single middleware function, use it directly.
    if (middleware.length === 1) {
      middleware = middleware[0];
    } else {
      middleware = compose(middleware);
    }

    fn.call(this, path, middleware, extend({}, this._options, options));

    return this;
  }
};

/**
 * Mount an application using `.use`, a la Express.js.
 *
 * @param {String}   path
 * @param {Function} fn
 */
exports.use = sanitize(function (path, fn, options) {
  var layer = new Layer(null, path, function* (next) {
    var baseUrl = this.url;

    // Set the original url property. This will stop it from being overriden.
    Object.defineProperty(this, 'originalUrl', {
      value: this.url
    });

    if (layer.path) {
      this.path = this.path.substr(layer.path.length) || '/';
    }

    yield* fn.call(this, next);

    // Set the url back to the original url.
    this.url = baseUrl;
  }, extend(options, {
    end: false
  }));

  stack.call(this).push(layer);
});

/**
 * Register a middleware function to execute on every request method.
 *
 * @param {String}   path
 * @param {Function} fn
 */
exports.all = sanitize(function (path, fn, options) {
  stack.call(this).push(new Layer(null, path, fn, options));
});

/**
 * Iterate over every available method and attach as shorthand.
 */
methods.forEach(function (method) {
  exports[method] = sanitize(function (path, fn, options) {
    stack.call(this).push(new Layer(method, path, fn, options));
  });
});
