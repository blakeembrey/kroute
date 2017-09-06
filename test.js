/* global describe, it, before, beforeEach */

const assert = require('assert')
const Koa = require('koa')
const popsicle = require('popsicle').request
const popsicleServer = require('popsicle-server')
const kroute = require('./')

const methods = require('methods')
  .filter(function (method) {
    return method !== 'connect'
  })

describe('kroute', function () {
  describe('router initialization', function () {
    let request

    before(function () {
      const koa = new Koa()

      function create (body) {
        return async function (context) {
          assert.equal(context.state.user.name, 'blakeembrey')

          context.body = body
        }
      }

      koa.use(kroute({
        use: async function (context, next) {
          context.state.user = {
            name: 'blakeembrey'
          }

          await next()
        },
        index: create('index'),
        new: create('new'),
        create: create('create'),
        show: create('show'),
        edit: create('edit'),
        update: create('update'),
        destroy: create('destroy')
      }))

      request = createRequest(koa)
    })

    it('should respond to index', async function () {
      const res = await request('/')

      assert.equal(res.body, 'index')
      assert.equal(res.status, 200)
    })

    it('should respond to new', async function () {
      const res = await request('/new')

      assert.equal(res.body, 'new')
      assert.equal(res.status, 200)
    })

    it('should respond to create', async function () {
      const res = await request({ url: '/', method: 'post' })

      assert.equal(res.body, 'create')
      assert.equal(res.status, 200)
    })

    it('should respond to show', async function () {
      const res = await request('/test')

      assert.equal(res.body, 'show')
      assert.equal(res.status, 200)
    })

    it('should respond to edit', async function () {
      const res = await request('/test/edit')

      assert.equal(res.body, 'edit')
      assert.equal(res.status, 200)
    })

    it('should respond to update', async function () {
      const res = await request({ url: '/test', method: 'put' })

      assert.equal(res.body, 'update')
      assert.equal(res.status, 200)
    })

    it('should respond to destroy', async function () {
      const res = await request({ url: '/test', method: 'delete' })

      assert.equal(res.body, 'destroy')
      assert.equal(res.status, 200)
    })
  })

  describe('router', function () {
    let router
    let request

    beforeEach(async function () {
      const koa = new Koa()

      koa.use(router = kroute())

      request = createRequest(koa)
    })

    methods.forEach(function (method) {
      describe('#' + method + '()', function () {
        describe('params', function () {
          it('should provide access to path params', async function () {
            router[method]('/:user', async function (context) {
              assert.equal(context.params.user, '123')

              context.body = 'success'
            })

            const res = await request({
              url: '/123',
              method: method
            })

            assert.equal(res.body, method === 'head' ? '' : 'success')
            assert.equal(res.status, 200)
          })

          it('should provide every param in an array', async function () {
            router[method]('/:foo/([^/]+?)', async function (context) {
              assert.equal(context.params[0], '456')
              assert.equal(context.params.foo, '123')

              context.body = 'success'
            })

            const res = await request({
              url: '/123/456',
              method: method
            })

            assert.equal(res.body, method === 'head' ? '' : 'success')
            assert.equal(res.status, 200)
          })
        })

        describe('options', function () {
          it('should accept a passed in options object', async function () {
            router[method]('/test', async function (context) {
              context.body = 'success'
            }, {
              sensitive: true
            })

            const success = await request({
              url: '/test',
              method: method
            })

            assert.equal(success.body, method === 'head' ? '' : 'success')
            assert.equal(success.status, 200)

            const failure = await request({
              url: '/TEST',
              method: method
            })

            assert.equal(failure.status, 404)
          })
        })

        describe('path', function () {
          beforeEach(function () {
            router[method]('/test', async function (context) {
              context.body = 'success'
            })
          })

          describe('when method and path match', function () {
            it('should 200', async function () {
              const res = await request({
                url: '/test',
                method: method
              })

              assert.equal(res.body, method === 'head' ? '' : 'success')
              assert.equal(res.status, 200)
            })
          })

          describe('when using query string and path and method match', function () {
            it('should 200', async function () {
              const res = await request({
                url: '/test?query=test',
                method: method
              })

              assert.equal(res.body, method === 'head' ? '' : 'success')
              assert.equal(res.status, 200)
            })
          })

          describe('when only method matches', function () {
            it('should 404', async function () {
              const res = await request({
                url: '/user',
                method: method
              })

              assert.equal(res.status, 404)
            })
          })

          describe('when only path matches', function () {
            it('should 404', async function () {
              const res = await request({
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
        router.all('/test', async function (context) {
          context.body = 'success'
        })
      })

      methods.forEach(function (method) {
        describe('when method is ' + method + ' and path match', function () {
          it('should 200', async function () {
            const res = await request({
              url: '/test',
              method: method
            })

            assert.equal(res.body, method === 'head' ? '' : 'success')
            assert.equal(res.status, 200)
          })
        })
      })

      describe('when only method matches', function () {
        it('should 404', async function () {
          const res = await request('/something')

          assert.equal(res.status, 404)
        })
      })
    })

    describe('#use()', function () {
      it('should mount any middleware', async function () {
        const mount = async function (context) {
          assert.equal(context.url, '/')
          assert.equal(context.path, '/')

          context.body = 'success'
        }

        router.use(mount)

        const res = await request('/')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })

      it('should override url with mounted route', async function () {
        const mount = async function (context) {
          assert.equal(context.url, '/app')
          assert.equal(context.originalUrl, '/mount/app')

          context.body = 'success'
        }

        router.use('/mount', mount)

        const res = await request('/mount/app')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })

      it('should support nested routers', async function () {
        const mounted = kroute({
          use: async function (context, next) {
            context.state.user = { name: 'blakeembrey' }

            await next()
          },
          index: async function (context) {
            context.body = context.params.user
          }
        })

        const nested = kroute({
          index: async function (context) {
            assert.equal(context.url, '/')
            assert.equal(context.path, '/')

            context.body = context.params.user + ' ' + context.params.id
          }
        })

        router.use('/:user', mounted)
        mounted.use('/:id', nested)

        router.post('/123', async function (context, next) {
          assert.equal(context.url, '/123')
          assert.equal(context.path, '/123')
          assert.equal(context.state.user.name, 'blakeembrey')

          await next()
        }, async function (context) {
          context.body = 'test'
        })

        const mountedResponse = await request('/abc')

        assert.equal(mountedResponse.body, 'abc')
        assert.equal(mountedResponse.status, 200)

        const nestedResponse = await request('/abc/123')

        assert.equal(nestedResponse.body, 'abc 123')
        assert.equal(nestedResponse.status, 200)

        const failoverResponse = await request({ url: '/123', method: 'post' })

        assert.equal(failoverResponse.body, 'test')
        assert.equal(failoverResponse.status, 200)

        const failureResponse = await request({ url: '/456', method: 'post' })

        assert.equal(failureResponse.status, 404)
      })

      it('should mount with query string', async function () {
        const mount = async function (context) {
          assert.equal(context.url, '/?query=true')
          assert.equal(context.path, '/')

          context.body = 'success'
        }

        router.use('/mount', mount)

        const res = await request('/mount?query=true')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })

      it('should reset the params after each request', async function () {
        router.use('/:param', async function (context, next) {
          assert.deepEqual(context.url, '/')
          assert.deepEqual(context.path, '/')
          assert.deepEqual(context.params, { param: '123' })

          await next()

          assert.deepEqual(context.url, '/')
          assert.deepEqual(context.path, '/')
          assert.deepEqual(context.params, { param: '123' })
        })

        router.get('/:anotherParam', async function (context) {
          assert.deepEqual(context.url, '/123')
          assert.deepEqual(context.path, '/123')
          assert.deepEqual(context.params, { anotherParam: '123' })

          context.body = 'success'
        })

        const res = await request('/123')

        assert.equal(res.body, 'success')
        assert.equal(res.status, 200)
      })
    })

    describe('chaining', function () {
      it('should chain methods together', async function () {
        router
          .get('/', async function (context) {
            context.body = 'get'
          })
          .post('/', async function (context) {
            context.body = 'post'
          })
          .all('/', async function (context) {
            context.body = 'all'
          })

        const res = await Promise.all([
          request('/'),
          request({ url: '/', method: 'post' }),
          request({ url: '/', method: 'put' })
        ])

        assert.equal(res[0].body, 'get')
        assert.equal(res[1].body, 'post')
        assert.equal(res[2].body, 'all')

        assert.equal(res[0].status, 200)
        assert.equal(res[1].status, 200)
        assert.equal(res[2].status, 200)
      })
    })

    describe('optional parameters', function () {
      it('should not decode null values', async function () {
        router.get('/:id?', async function (context) {
          assert.equal(context.params.id, undefined)

          context.body = 'success'
        })

        const res = await request('/')

        assert.equal(res.body, 'success')
      })
    })
  })
})

/**
 * Create a request function.
 *
 * @param  {Koa}      koa
 * @return {Function}
 */
function createRequest (koa) {
  return function (options) {
    return popsicle(options).use(popsicleServer(koa.listen()))
  }
}
