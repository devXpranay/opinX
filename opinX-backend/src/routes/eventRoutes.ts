import express from 'express';
import { createEvent, getAllEvents, getEvent } from '../controllers/eventController';

const router = express.Router();

router.post('/create', createEvent);
router.get('/:eventId', getEvent);
router.get('/', getAllEvents)

export default router;
