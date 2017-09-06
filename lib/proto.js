const methods = require('methods')
const flatten = require('array-flatten')
const compose = require('koa-compose')
const Layer = require('./layer')

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
    let middleware = []
    let startindex = 0
    let endindex = arguments.length
    let path
    let options

    if (typeof arguments[0] === 'string') {
      path = arguments[0]
      startindex = 1
    }

    if (typeof arguments[arguments.length - 1] === 'object') {
      endindex = arguments.length - 1
      options = arguments[endindex]
    }

    // Concat all the middleware functions.
    for (let i = startindex; i < endindex; i++) {
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

    fn.call(this, path, middleware, Object.assign({}, this._options, options))

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
  const opts = Object.assign(options, { end: false })

  const layer = new Layer(null, path, async function (context, next) {
    const len = layer.path.length

    const originalUrl = context.url
    const originalPath = context.path

    const url = context.url.substr(len) || '/'
    const path = context.path.substr(len) || '/'

    context.originalUrl = context.originalUrl || originalUrl

    function restore (context) {
      context.url = originalUrl
      context.path = originalPath
    }

    function setup (context) {
      context.url = url
      context.path = path
    }

    setup(context)

    await fn(context, async function () {
      restore(context)
      await next()
      setup(context)
    })

    restore(context)
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
