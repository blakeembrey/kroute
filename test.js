/* global describe, it, before, beforeEach */

var assert = require('assert')
var koa = require('koa')
var popsicle = require('popsicle')
var popsicleServer = require('popsicle-server')
var kroute = require('./')

var methods = require('methods')
  .filter(function (method) {
    return method !== 'connect'
  })

describe('kroute', function () {
  describe('router initialization', function () {
    var request

    before(function () {
      var app = koa()

      function create (body) {
        return function * () {
          assert.equal(this.user.name, 'blakeembrey')

          this.body = body
        }
      }

      app.use(kroute({
        use: function * (next) {
          this.user = {
            name: 'blakeembrey'
          }

          yield next
        },
        index: create('index'),
        new: create('new'),
        create: create('create'),
        show: create('show'),
        edit: create('edit'),
        update: create('update'),
        destroy: create('destroy')
      }))

      request = createRequest(app)
    })

    it('should respond to index', function * () {
      var res = yield request('/')

      assert.equal(res.body, 'index')
      assert.equal(res.status, 200)
    })

    it('should respond to new', function * () {
      var res = yield request('/new')

      assert.equal(res.body, 'new')
      assert.equal(res.status, 200)
    })

    it('should respond to create', function * () {
      var res = yield request({ url: '/', method: 'post' })

      assert.equal(res.body, 'create')
      assert.equal(res.status, 200)
    })

    it('should respond to show', function * () {
      var res = yield request('/test')

      assert.equal(res.body, 'show')
      assert.equal(res.status, 200)
    })

    it('should respond to edit', function * () {
      var res = yield request('/test/edit')

      assert.equal(res.body, 'edit')
      assert.equal(res.status, 200)
    })

    it('should respond to update', function * () {
      var res = yield request({ url: '/test', method: 'put' })

      assert.equal(res.body, 'update')
      assert.equal(res.status, 200)
    })

    it('should respond to destroy', function * () {
      var res = yield request({ url: '/test', method: 'delete' })

      assert.equal(res.body, 'destroy')
      assert.equal(res.status, 200)
    })
  })

  describe('router', function () {
    var router
    var request

    beforeEach(function * () {
      var app = koa()

      app.use(router = kroute())

      request = createRequest(app)
    })

    methods.forEach(function (method) {
      describe('#' + method + '()', function () {
        describe('params', function () {
          it('should provide access to path params', function * () {
            router[method]('/:user', function * () {
              assert.equal(this.params.user, '123')

              this.body = 'success'
            })

            var res = yield request({
              url: '/123',
              method: method
            })

            assert.equal(res.body, method === 'head' ? null : 'success')
            assert.equal(res.status, 200)
          })

          it('should provide every param in an array', function * () {
            router[method]('/:foo/([^/]+?)', function * () {
              assert.equal(this.params[0], '456')
              assert.equal(this.params.foo, '123')

              this.body = 'success'
            })

            var res = yield request({
              url: '/123/456',
              method: method
            })

            assert.equal(res.body, method === 'head' ? null : 'success')
            assert.equal(res.status, 200)
          })
        })

        describe('options', function () {
          it('should accept a passed in options object', function * () {
            router[method]('/test', function * () {
              this.body = 'success'
            }, {
              sensitive: true
            })

            var success = yield request({
              url: '/test',
              method: method
            })

            assert.equal(success.body, method === 'head' ? null : 'success')
            assert.equal(success.status, 200)

            var failure = yield request({
              url: '/TEST',
              method: method
            })

            assert.equal(failure.status, 404)
          })
        })

        describe('path', function () {
          beforeEach(function () {
            router[method]('/test', function * () {
              this.body = 'success'
            })
          })

          describe('when method and path match', function () {
            it('should 200', function * () {
              var res = yield request({
                url: '/test',
                method: method
              })

              assert.equal(res.body, method === 'head' ? null : 'success')
              assert.equal(res.status, 200)
            })
          })

          describe('when using query string and path and method match', function () {
            it('should 200', function * () {
              var res = yield request({
                url: '/test?query=test',
                method: method
              })

              assert.equal(res.body, method === 'head' ? null : 'success')
              assert.equal(res.status, 200)
            })
          })

          describe('when only method matches', function () {
            it('should 404', function * () {
              var res = yield request({
                url: '/user',
                method: method
              })

              assert.equal(res.status, 404)
            })
          })

          describe('when only path matches', function () {
            it('should 404', function * () {
              var res = yield request({
                url: '/test',
                method: method === 'get' ? 'post' : 'get'
              })

              assert.equal(res.status, 404)
            })
          })
        })
      })
    })

    describe('#all()', function () {
      beforeEach(function () {
        router.all('/test', function * () {
          this.body = 'success'
        })
      })

      methods.forEach(function (method) {
        describe('when method is ' + method + ' and path match', function () {
          it('should 200', function * () {
            var res = yield request({
              url: '/test',
              method: method
            })

            assert.equal(res.body, method === 'head' ? null : 'success')
            assert.equal(res.status, 200)
          })
        })
      })

      describe('when only method matches', function () {
        it('should 404', function * () {
          var res = yield request('/something')

          assert.equal(res.status, 404)
        })
      })
    })

    describe('#use()', function () {
      it('should mount any middleware', function * () {
        var mount = function * () {
          assert.equal(this.url, '/')
          assert.equal(this.path, '/')

          this.body = 'success'
        }

        router.use(mount)

        var res = yield request('/')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })

      it('should override url with mounted route', function * () {
        var mount = function * () {
          assert.equal(this.url, '/app')
          assert.equal(this.originalUrl, '/mount/app')

          this.body = 'success'
        }

        router.use('/mount', mount)

        var res = yield request('/mount/app')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })

      it('should support nested routers', function * () {
        var mounted = kroute({
          use: function * (next) {
            this.user = { name: 'blakeembrey' }

            yield next
          },
          index: function * () {
            this.body = this.params.user
          }
        })

        var nested = kroute({
          index: function * () {
            assert.equal(this.url, '/')
            assert.equal(this.path, '/')

            this.body = this.params.user + ' ' + this.params.id
          }
        })

        router.use('/:user', mounted)
        mounted.use('/:id', nested)

        router.post('/123', function * (next) {
          assert.equal(this.url, '/123')
          assert.equal(this.path, '/123')
          assert.equal(this.user.name, 'blakeembrey')

          yield next
        }, function * () {
          this.body = 'test'
        })

        var mountedResponse = yield request('/abc')

        assert.equal(mountedResponse.body, 'abc')
        assert.equal(mountedResponse.status, 200)

        var nestedResponse = yield request('/abc/123')

        assert.equal(nestedResponse.body, 'abc 123')
        assert.equal(nestedResponse.status, 200)

        var failoverResponse = yield request({ url: '/123', method: 'post' })

        assert.equal(failoverResponse.body, 'test')
        assert.equal(failoverResponse.status, 200)

        var failureResponse = yield request({ url: '/456', method: 'post' })

        assert.equal(failureResponse.status, 404)
      })

      it('should mount with query string', function * () {
        var mount = function * () {
          assert.equal(this.url, '/?query=true')
          assert.equal(this.path, '/')

          this.body = 'success'
        }

        router.use('/mount', mount)

        var res = yield request('/mount?query=true')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })

      it('should reset the params after each request', function * () {
        router.use('/:param', function * (next) {
          assert.deepEqual(this.url, '/')
          assert.deepEqual(this.path, '/')
          assert.deepEqual(this.params, { param: '123' })

          yield next

          assert.deepEqual(this.url, '/')
          assert.deepEqual(this.path, '/')
          assert.deepEqual(this.params, { param: '123' })
        })

        router.get('/:anotherParam', function * () {
          assert.deepEqual(this.url, '/123')
          assert.deepEqual(this.path, '/123')
          assert.deepEqual(this.params, { anotherParam: '123' })

          this.body = 'success'
        })

        var res = yield request('/123')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })
    })

    describe('chaining', function () {
      it('should chain methods together', function * () {
        router
          .get('/', function * () {
            this.body = 'get'
          })
          .post('/', function * () {
            this.body = 'post'
          })
          .all('/', function * () {
            this.body = 'all'
          })

        var res = yield [
          request('/'),
          request({ url: '/', method: 'post' }),
          request({ url: '/', method: 'put' })
        ]

        assert.equal(res[0].body, 'get')
        assert.equal(res[1].body, 'post')
        assert.equal(res[2].body, 'all')

        assert.equal(res[0].status, 200)
        assert.equal(res[1].status, 200)
        assert.equal(res[2].status, 200)
      })
    })

    describe('optional parameters', function () {
      it('should not decode null values', function * () {
        router.get('/:id?', function * () {
          assert.equal(this.params.id, undefined)

          this.body = 'success'
        })

        var res = yield request('/')

        assert.equal(res.body, 'success')
      })
    })
  })
})

/**
 * Create a request function.
 *
 * @param  {Koa}      app
 * @return {Function}
 */
function createRequest (app) {
  return function (options) {
    return popsicle(options).use(popsicleServer(app.listen()))
  }
}
