import { currentUser, errorHandler, NotFoundError } from '@elie29/ticketing-common';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import express from 'express';

import { indexOrderRouter } from './routes';
import { deleteOrderRouter } from './routes/delete';
import { newOrderRouter } from './routes/new';
import { showOrderRouter } from './routes/show';

// Load config from .env file at root
dotenv.config({ quiet: true });

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use(
  cookieSession({
    name: 'express:sess',
    signed: false,
    secure: false,
  })
);
app.use(currentUser);

app.use(deleteOrderRouter);
app.use(indexOrderRouter);
app.use(newOrderRouter);
app.use(showOrderRouter);

app.use((req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
