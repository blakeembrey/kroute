const proto = require('./proto')

/**
 * Map of actions to the method and path.
 *
 * @type {Array}
 */
const actions = [
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
async function handle (stack, context, next) {
  let index = 0

  async function proceed () {
    const handler = stack[index++]

    if (!handler) {
      await next()

      return
    }

    if (handler.method && handler.method !== context.method) {
      await proceed()

      return
    }

    if (handler.match(context.path)) {
      const previousParams = context.params
      const params = Object.assign({}, context.params, handler.params)

      context.params = params

      await handler.fn(context, async function () {
        context.params = previousParams
        await proceed()
        context.params = params
      })

      context.params = previousParams

      return
    }

    await proceed()
  }

  await proceed()
}

/**
 * Simple router function that returns a generator to be used as Koa middleware.
 *
 * @param  {Object}            map
 * @return {GeneratorFunction}
 */
module.exports = function (map, options) {
  const router = Object.assign(async function (context, next) {
    await handle(router._stack || [], context, next)
  }, proto)

  router._options = options

  if (typeof map === 'object') {
    if (map.use) {
      router.use(map.use)
    }

    actions.forEach(function (action) {
      const method = action[0]
      const path = action[1]
      const handler = map[action[2]]

      if (!handler) {
        return
      }

      router[method](path, handler)
    })
  }

  return router
}
