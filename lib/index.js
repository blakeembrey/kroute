var proto = require('./proto')
var extend = require('./extend')

/**
 * Map of actions to the method and path.
 *
 * @type {Array}
 */
var actions = [
  ['get', '/', 'index'],
  ['get', '/new', 'new'],
  ['post', '/', 'create'],
  ['get', '/:id', 'show'],
  ['get', '/:id/edit', 'edit'],
  ['put', '/:id', 'update'],
  ['delete', '/:id', 'destroy']
]

/**
 * Router stack handler.
 *
 * @param {Array}    stack
 * @param {Function} next
 */
function * handle (stack, next) {
  var index = 0

  function * proceed () {
    var handler = stack[index++]

    if (!handler) {
      yield next

      return
    }

    if (handler.method && handler.method !== this.method) {
      yield proceed

      return
    }

    if (handler.match(this.path)) {
      var previousParams = this.params
      var params = extend({}, this.params, handler.params)

      this.params = params

      yield handler.fn.call(this, function * () {
        this.params = previousParams
        yield proceed
        this.params = params
      })

      this.params = previousParams

      return
    }

    yield proceed
  }

  yield proceed
}

/**
 * Simple router function that returns a generator to be used as Koa middleware.
 *
 * @param  {Object}            map
 * @return {GeneratorFunction}
 */
module.exports = function (map, options) {
  var router = extend(function * (next) {
    yield handle.call(this, router._stack || [], next)
  }, proto)

  router._options = options

  if (typeof map === 'object') {
    if (map.use) {
      router.use(map.use)
    }

    actions.forEach(function (action) {
      var method = action[0]
      var path = action[1]
      var handler = map[action[2]]

      if (!handler) {
        return
      }

      router[method](path, handler)
    })
  }

  return router
}
