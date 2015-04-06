/**
 * Extend the destination object with multiple source objects.
 *
 * @param  {Object} dest
 * @return {Object}
 */
module.exports = function (dest /*, ...src */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      dest[key] = arguments[i][key]
    }
  }

  return dest
}
