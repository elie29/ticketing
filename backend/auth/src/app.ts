import { errorHandler, NotFoundError } from '@elie29/ticketing-common';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import express from 'express';

import { currentUserRouter } from './routes/current-user';
import { signinRouter } from './routes/signin';
import { signoutRouter } from './routes/signout';
import { signupRouter } from './routes/signup';

// Load config from .env file at root
dotenv.config({ quiet: true });

const app = express();
app.set("trust proxy", true);

// ------------ Middlewares

app.use(express.json());

// add automatically req.session object from cookie
app.use(
  cookieSession({
    name: 'express:sess',
    signed: false,
    secure: false,
  })
);

app.use(currentUserRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

app.use((req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
