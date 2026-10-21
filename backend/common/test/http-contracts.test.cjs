const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { body } = require('express-validator');
const { BadRequestError, errorHandler, requireAuth, validateRequest } = require('../build');

async function start(context, app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.onTestFinished(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('validation preserves field names and the serialized error contract', async context => {
  const app = express();
  app.use(express.json());
  app.post('/users', body('email').isEmail().withMessage('Email must be valid'), validateRequest, (req, res) => {
    res.status(201).send({ email: req.body.email });
  });
  app.use(errorHandler);
  const baseURL = await start(context, app);
  const response = await fetch(`${baseURL}/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'invalid' }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    errors: [{ message: 'Email must be valid', field: 'email' }],
  });
});

test('rejected async handlers preserve custom error status and body', async context => {
  const app = express();
  app.get('/failure', async () => { throw new BadRequestError('Request denied'); });
  app.use(errorHandler);
  const baseURL = await start(context, app);
  const response = await fetch(`${baseURL}/failure`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { errors: [{ message: 'Request denied' }] });
});

test('unauthenticated requests remain unauthorized', async context => {
  const app = express();
  app.get('/private', requireAuth, (req, res) => res.send({ ok: true }));
  app.use(errorHandler);
  const baseURL = await start(context, app);
  const response = await fetch(`${baseURL}/private`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { errors: [{ message: 'Not authorized' }] });
});