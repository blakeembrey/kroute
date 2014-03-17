# Kroute

Modular Koa router middleware with Express-style routes and middleware mounting.

## Install

```
npm install kroute
```

## Usage

Kroute exports a function which can be used to create a router instance that works with Koa.

```js
var koa    = require('koa');
var kroute = require('kroute');

var app    = koa();
var router = kroute();

app.use(router);
```

### Initialization

A router can be initialized with default handlers based on a resourceful routing object.

```js
router({
  load: authorizeUser(),
  index: function* () {},
  create: [function* () {}, function* () {}]
});
```

Actions are mapped as follows:

```
GET     /                 ->  index
GET     /new              ->  new
POST    /                 ->  create
GET     /:id              ->  show
GET     /:id/edit         ->  edit
PUT     /:id              ->  update
DELETE  /:id              ->  destroy
```

The object can also contain a `load` property which is mounted before the routes.

### Routes

Every router instance can used to attach request handlers.

```js
router.get('/user', function* () {});
```

Omitting the path name will ensure the handler is always executed when the method matches.

```js
router.post(function* () {});
```

Every route method accepts multiple middleware handlers.

```js
router.delete(authorizeUser(), function* () {});
```

### All Methods

Every router provides a `.all` method for attaching request handlers to every method.

```js
router.all(function* () {});
```

It accepts a path and multiple middleware like any other method.

```js
router.all('/', authorizeUser(), function* () {});
```

### Mounting Middleware

Every router comes with the ability to mount middleware and handlers.

```js
var mount = kroute();

router.use('/users', mount);
```

As long as the middleware follows the Koa generator pattern, it can be mounted.

```js
router.use('/users', function* (next) {
  console.log(this.url); //=> "/123" -> Strips route prefix.

  yield next;
});
```

Like every other method, `.use` also accepts multiple request handlers and an optional path.

```js
router.use(authorizeUser(), function* () {});
```

### Params

Every path can be dynamic and use Express-style parameter notation.

```js
router.get('/:user', function* () {
  console.log(this.params.user); //=> "123"
});
```

Every match is stored in the params as an array and named params as properties of the array.

```js
router.get('/:foo/:bar', function* () {
  console.log(this.params); //=> ["123", "456"]
  console.log(this.params.foo); //=> "123"
  console.log(this.params.bar); //=> "456"
});
```

The route can also be a regular expression.

```js
router.get(/^\/blog\/(\d{4})-(\d{2})-(\d{2})\/?$/i, function* (next) {
  console.log(this.params); // => ['2014', '03', '17']
});
```

### Chaining

Every method returns it's own instance, so routes can be chained as your used to with Express.

```js
router
  .get('/foo', function* () {})
  .post('/bar', function* () {});
```

### Options

Every method accepts an options object as the last argument.

```js
router.get('/foo', function* () {}, { strict: true, sensitive: true });
```

## License

MIT
