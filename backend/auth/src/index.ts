import mongoose from 'mongoose';

import { app } from './app';

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error("JWT_KEY must be defined");
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI must be defined");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      authSource: "admin",
      user: process.env.MONGO_USR,
      pass: process.env.MONGO_PWD,
    });
    console.log(`Connected to MongoDb: ${process.env.MONGO_URI}`);
  } catch (err) {
    console.error(err);
  }

  const PORT = process.env.SERVER_PORT || 3001;
  app.listen(PORT, () => console.log(`Listening on port ${PORT}!!`));
};

start();
