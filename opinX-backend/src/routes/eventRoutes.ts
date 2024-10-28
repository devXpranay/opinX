import express from 'express';
import { createEvent, getEvent } from '../controllers/eventController';

const router = express.Router();

router.post('/create', createEvent);
router.get('/getevent/:eventId', getEvent);

export default router;
