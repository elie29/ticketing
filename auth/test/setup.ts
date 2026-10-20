import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as os from 'node:os';
import request from 'supertest';

import { app } from '../src/app';

declare global {
  var signin: () => Promise<string[]>;
}

let mongo: MongoMemoryServer | undefined;
beforeAll(async () => {
  process.env.JWT_KEY = "af001ab22";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { runtimeAdapters: { os } });
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();

  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

global.signin = async () => {
  const email = "test@test.com";
  const password = "password";

  const response = await request(app)
    .post("/api/users/signup")
    .send({
      email,
      password,
    })
    .expect(201);

  const cookie = response.get("Set-Cookie");
  if (!cookie) {
    throw new Error('Sign-in response did not set a cookie');
  }

  return cookie;
};
