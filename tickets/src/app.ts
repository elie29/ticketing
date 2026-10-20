import { currentUser, errorHandler, NotFoundError } from '@elie29/ticketing-common';
import cookieSession from 'cookie-session';
import dotenv from 'dotenv';
import express from 'express';

import { indexTicketRouter } from './routes';
import { createTicketRouter } from './routes/new';
import { showTicketRouter } from './routes/show';
import { updateTicketRouter } from './routes/update';

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

app.use(createTicketRouter);
app.use(showTicketRouter);
app.use(indexTicketRouter);
app.use(updateTicketRouter);

app.use((req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
