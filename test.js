/* global describe, it */

var assert = require('assert');
var koa    = require('koa');
var kroute = require('./');
var retest = require('co-retest');

/**
 * Map of valid request methods.
 */
var methods = require('methods').filter(function (method) {
  return method !== 'connect';
});

describe('kroute', function () {
  describe('router initialization', function () {
    var request;

    before(function () {
      var app = koa();

      var create = function (body) {
        return function* () {
          assert.equal(this.user.name, 'Blake');
          this.body = body;
        };
      };

      app.use(kroute({
        load: function* (next) {
          this.user = { name: 'Blake' };
          yield next;
        },
        index:   create('index'),
        new:     create('new'),
        create:  create('create'),
        show:    create('show'),
        edit:    create('edit'),
        update:  create('update'),
        destroy: create('destroy')
      }));

      request = retest(app.listen());
    });

    it('should respond to index', function* () {
      var res = yield request.get('/');

      assert.equal(res.body, 'index');
      assert.equal(res.statusCode, 200);
    });

    it('should respond to new', function* () {
      var res = yield request.get('/new');

      assert.equal(res.body, 'new');
      assert.equal(res.statusCode, 200);
    });

    it('should respond to create', function* () {
      var res = yield request.post('/');

      assert.equal(res.body, 'create');
      assert.equal(res.statusCode, 200);
    });

    it('should respond to show', function* () {
      var res = yield request.get('/test');

      assert.equal(res.body, 'show');
      assert.equal(res.statusCode, 200);
    });

    it('should respond to edit', function* () {
      var res = yield request.get('/test/edit');

      assert.equal(res.body, 'edit');
      assert.equal(res.statusCode, 200);
    });

    it('should respond to update', function* () {
      var res = yield request.put('/test');

      assert.equal(res.body, 'update');
      assert.equal(res.statusCode, 200);
    });

    it('should respond to destroy', function* () {
      var res = yield request.del('/test');

      assert.equal(res.body, 'destroy');
      assert.equal(res.statusCode, 200);
    });
  });

  describe('router', function () {
    var router;
    var request;

    beforeEach(function* () {
      var app = koa();

      app.use(router = kroute());

      request = retest(app.listen());
    });

    methods.forEach(function (method) {
      describe('#' + method + '()', function () {
        describe('params', function () {
          it('should provide access to path params', function* () {
            router[method]('/:user', function* () {
              assert.equal(this.params[0],   '123');
              assert.equal(this.params.user, '123');

              this.body = 'success';
            });

            var res = yield request({
              uri: '/123',
              method: method
            });

            assert.equal(res.body, method === 'head' ? '' : 'success');
            assert.equal(res.statusCode, 200);
          });

          it('should provide every param in an array', function* () {
            router[method]('/:foo/:bar', function* () {
              assert.ok(Array.isArray(this.params));
              assert.equal(this.params[0], '123');
              assert.equal(this.params[1], '456');
              assert.equal(this.params.foo, '123');
              assert.equal(this.params.bar, '456');

              this.body = 'success';
            });

            var res = yield request({
              uri: '/123/456',
              method: method
            });

            assert.equal(res.body, method === 'head' ? '' : 'success');
            assert.equal(res.statusCode, 200);
          });
        });

        describe('options', function () {
          it('should accept a passed in options object', function* () {
            router[method]('/test', function* () {
              this.body = 'success';
            }, {
              sensitive: true
            });

            var success = yield request({
              uri: '/test',
              method: method,
            });

            assert.equal(success.body, method === 'head' ? '' : 'success');
            assert.equal(success.statusCode, 200);

            var failure = yield request({
              uri: '/TEST',
              method: method,
            });

            assert.equal(failure.statusCode, 404);
          });
        });

        describe('path', function () {
          beforeEach(function () {
            router[method]('/test', function* () {
              this.body = 'success';
            });
          });

          describe('when method and path match', function () {
            it('should 200', function* () {
              var res = yield request({
                uri: '/test',
                method: method
              });

              assert.equal(res.body, method === 'head' ? '' : 'success');
              assert.equal(res.statusCode, 200);
            });
          });

          describe('when using query string and path and method match', function () {
            it('should 200', function* () {
              var res = yield request({
                uri: '/test?query=test',
                method: method
              });

              assert.equal(res.body, method === 'head' ? '' : 'success');
              assert.equal(res.statusCode, 200);
            });
          });

          describe('when only method matches', function () {
            it('should 404', function* () {
              var res = yield request({
                uri: '/user',
                method: method
              });

              assert.equal(res.statusCode, 404);
            });
          });

          describe('when only path matches', function () {
            it('should 404', function* () {
              var res = yield request({
                uri: '/test',
                method: method === 'get' ? 'post' : 'get'
              });

              assert.equal(res.statusCode, 404);
            });
          });
        });
      });
    });

    describe('#all()', function () {
      beforeEach(function () {
        router.all('/test', function* () {
          this.body = 'success';
        });
      });

      methods.forEach(function (method) {
        describe('when method is ' + method + ' and path match', function () {
          it('should 200', function* () {
            var res = yield request({
              uri: '/test',
              method: method
            });

            assert.equal(res.body, method === 'head' ? '' : 'success');
            assert.equal(res.statusCode, 200);
          });
        });
      });

      describe('when only method matches', function () {
        it('should 404', function* () {
          var res = yield request.get('/something');

          assert.equal(res.statusCode, 404);
        });
      });
    });

    describe('#use()', function () {
      it('should mount any middleware', function* () {
        var mount = function* () {
          this.body = 'success';
        };

        router.use(mount);

        var res = yield request.get('/');

        assert.equal(res.body, 'success');
        assert.equal(res.statusCode, 200);
      });

      it('should override url with mounted route', function* () {
        var mount = function* () {
          assert.equal(this.url, '/app');
          assert.equal(this.originalUrl, '/mount/app');

          this.body = 'success';
        };

        router.use('/mount', mount);

        var res = yield request.get('/mount/app');

        assert.equal(res.body, 'success');
        assert.equal(res.statusCode, 200);
      });

      it('should support nested routers', function* () {
        var mounted = kroute({
          load: function* (next) {
            this.user = { name: 'Blake' };

            yield next;
          },
          index: function* () {
            this.body = 'mounted';
          }
        });

        var nested = kroute({
          index: function* () {
            this.body = 'nested';
          }
        });

        router.use('/:user', mounted);
        mounted.use('/:id', nested);

        router.post('/123', function* (next) {
          assert.equal(this.user.name, 'Blake');

          yield next;
        }, function* () {
          this.body = 'test';
        });

        var mounted = yield request.get('/abc');

        assert.equal(mounted.body, 'mounted');
        assert.equal(mounted.statusCode, 200);

        var nested = yield request.get('/abc/123');

        assert.equal(nested.body, 'nested');
        assert.equal(nested.statusCode, 200);

        var failover = yield request.post('/123');

        assert.equal(failover.body, 'test');
        assert.equal(failover.statusCode, 200);

        var failure = yield request.post('/456');

        assert.equal(failure.statusCode, 404);
      });

      it('should mount with query string', function* () {
        var mount = function* () {
          assert.equal(this.url, '/?query=true');
          assert.equal(this.path, '/');

          this.body = 'success';
        };

        router.use('/mount', mount);

        var res = yield request.get('/mount?query=true');

        assert.equal(res.body, 'success');
        assert.equal(res.statusCode, 200);
      });
    });

    describe('chaining', function () {
      it('should chain methods together', function* () {
        router
          .get('/', function* () {
            this.body = 'get';
          })
          .post('/', function* () {
            this.body = 'post';
          })
          .all('/', function* () {
            this.body = 'all';
          });

        var res = yield [
          request.get('/'),
          request.post('/'),
          request.put('/')
        ];

        assert.equal(res[0].body, 'get');
        assert.equal(res[1].body, 'post');
        assert.equal(res[2].body, 'all');

        assert.equal(res[0].statusCode, 200);
        assert.equal(res[1].statusCode, 200);
        assert.equal(res[2].statusCode, 200);
      });
    });
  });
});
