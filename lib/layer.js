var pathToRegExp = require('path-to-regexp')

/**
 * URI decode a string.
 *
 * @param  {String} param
 * @return {String}
 */
function decode (param) {
  try {
    return decodeURIComponent(param)
  } catch (_) {
    var err = new Error('Failed to decode param "' + param + '"')
    err.status = 400
    throw err
  }
}

/**
 * Create a new layer handling instance.
 *
 * @param {String}   method
 * @param {String}   path
 * @param {Function} fn
 */
var Layer = module.exports = function (method, path, fn, options) {
  this.fn = fn
  this.method = method && method.toUpperCase()

  if (path) {
    this.regexp = pathToRegExp(path, this.keys = [], options)
  }
}

/**
 * Match a path against the layer and collect the resulting params and match.
 *
 * @param  {String}  path
 * @return {Boolean}
 */
Layer.prototype.match = function (path) {
  var params = this.params = {}

  this.path = ''

  if (!this.regexp) {
    return true
  }

  var m = this.regexp.exec(path)

  if (!m) {
    return false
  }

  this.path = m[0]

  for (var i = 1; i < m.length; i++) {
    var key = this.keys[i - 1]

    params[key.name] = m[i] == null ? m[i] : decode(m[i])
  }

  return true
}
