var methods = require('methods')
var flatten = require('array-flatten')
var compose = require('koa-compose')
var Layer = require('./layer')
var extend = require('./extend')

/**
 * Return the function execution stack or create a new one.
 *
 * @return {Array}
 */
function stack (self) {
  return self._stack || (self._stack = [])
}

/**
 * Sanitize a function to accept an optional path and unlimited middleware.
 *
 * @param  {Function} fn
 * @return {Function}
 */
function sanitize (fn) {
  return function (/* path, ...middleware */) {
    var middleware = []
    var startindex = 0
    var endindex = arguments.length
    var path
    var options

    if (typeof arguments[0] === 'string') {
      path = arguments[0]
      startindex = 1
    }

    if (typeof arguments[arguments.length - 1] === 'object') {
      endindex = arguments.length - 1
      options = arguments[endindex]
    }

    // Concat all the middleware functions.
    for (var i = startindex; i < endindex; i++) {
      middleware.push(arguments[i])
    }

    middleware = flatten(middleware)

    if (middleware.length === 0) {
      throw new TypeError('Expected a function but got no arguments')
    }

    if (middleware.length === 1) {
      middleware = middleware[0]
    } else {
      middleware = compose(middleware)
    }

    fn.call(this, path, middleware, extend({}, this._options, options))

    return this
  }
}

/**
 * Mount an application using `.use`, a la Express.js.
 *
 * @param {String}   path
 * @param {Function} fn
 */
exports.use = sanitize(function (path, fn, options) {
  var opts = extend(options, { end: false })

  var layer = new Layer(null, path, function * (next) {
    var len = layer.path.length

    var originalUrl = this.url
    var originalPath = this.path

    var url = this.url.substr(len) || '/'
    var path = this.path.substr(len) || '/'

    this.originalUrl = this.originalUrl || originalUrl

    function restore (self) {
      self.url = originalUrl
      self.path = originalPath
    }

    function setup (self) {
      self.url = url
      self.path = path
    }

    setup(this)

    yield fn.call(this, function * () {
      restore(this)
      yield next
      setup(this)
    })

    restore(this)
  }, opts)

  stack(this).push(layer)
})

/**
 * Register a middleware function to execute on every request method.
 *
 * @param {String}   path
 * @param {Function} fn
 */
exports.all = sanitize(function (path, fn, options) {
  stack(this).push(new Layer(null, path, fn, options))
})

/**
 * Iterate over every available method and attach as shorthand.
 */
methods.forEach(function (method) {
  exports[method] = sanitize(function (path, fn, options) {
    stack(this).push(new Layer(method, path, fn, options))
  })
})
