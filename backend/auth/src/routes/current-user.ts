import { currentUser, requireAuth } from '@elie29/ticketing-common';
import express from 'express';

const router = express.Router();

// first middleware extracts current user, the next verify if not empty
router.get("/api/users/currentuser", currentUser, requireAuth, (req, res) => {
  res.send({ currentUser: req.currentUser });
});

export { router as currentUserRouter };
