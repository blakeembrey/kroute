var proto  = require('./proto');
var extend = require('./extend');

/**
 * Map of actions to the method and path.
 *
 * @type {Array}
 */
var actions = [
  ['get',    '/',         'index'],
  ['get',    '/new',      'new'],
  ['post',   '/',         'create'],
  ['get',    '/:id',      'show'],
  ['get',    '/:id/edit', 'edit'],
  ['put',    '/:id',      'update'],
  ['delete', '/:id',      'destroy']
];

/**
 * Router stack handler.
 *
 * @param {Array}    stack
 * @param {Function} next
 */
var handle = function* (stack, next) {
  var index = stack.length;

  // Pass the previous generator into the next generator function. This
  // allows us to chain the execution in order.
  while (index--) {
    var handler = stack[index];

    // Request method does not match.
    if (handler.method && handler.method !== this.method) {
      continue;
    }

    if (handler.match(this.path)) {
      // Alias the matched params onto the current request.
      this.params = handler.params;

      next = handler.fn.call(this, next);
    }
  }

  yield* next;
};

/**
 * Simple router function that returns a generator to be used as Koa middleware.
 *
 * @param  {Object}            map
 * @return {GeneratorFunction}
 */
module.exports = function (map, options) {
  var router = extend(function* (next) {
    yield* handle.call(this, router._stack || [], next);
  }, proto);

  // Alias the options onto our router instance.
  router._options = options;

  // Iterate over the initialization map and attach to the router.
  if (typeof map === 'object') {
    // Allow a `use` function to be defined before any route handlers.
    if (map.use) {
      router.use(map.use);
    }

    // Iterate over available actions and attach to the current router.
    actions.forEach(function (action) {
      var method  = action[0];
      var path    = action[1];
      var handler = map[action[2]];

      if (!handler) { return; }

      router[method](path, handler);
    });
  }

  return router;
};
