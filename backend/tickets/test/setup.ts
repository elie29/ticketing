import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as os from 'node:os';

declare global {
  var signin: () => string[];
}

vi.mock("../src/nats-wrapper", () => import("./mocks/nats-wrapper.js"));

let mongo: MongoMemoryServer | undefined;
beforeAll(async () => {
  process.env.JWT_KEY = "ab001098ff";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { runtimeAdapters: { os } });
});

beforeEach(async () => {
  vi.clearAllMocks();
  const collections = await mongoose.connection.db!.collections();

  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

global.signin = () => {
  // Build a JWT payload.  { id, email }
  const payload = {
    id: new mongoose.Types.ObjectId().toHexString(),
    email: "test@test.com",
  };

  // Create the JWT!
  const token = jwt.sign(payload, process.env.JWT_KEY!);

  // Build session Object. { jwt: MY_JWT }
  const session = { jwt: token };

  // Turn that session into JSON
  const sessionJSON = JSON.stringify(session);

  // Take JSON and encode it as base64
  const base64 = Buffer.from(sessionJSON).toString("base64");

  // return a string thats the cookie with the encoded data
  return [`express:sess=${base64}`];
};
