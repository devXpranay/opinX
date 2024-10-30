import { Request, Response } from 'express';
import { insertTail, pubsubclient } from '../utils/talkToRedis';
import { pendingRequests } from '../pubsub/pubsub';
import { v4 as uuidv4 } from 'uuid';

export const createEvent = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, startTime, endTime } = req.body;
    if (!title || !description || !startTime || !endTime) return res.status(400).json({ message: 'Missing required fields' });
    const requestId = uuidv4();
    const message = {
      kind: 'createEvent',
      requestId,
      data: {
        title,
        description,
        startTime,
        endTime
      }
    }
    await insertTail('unProcessedQueue', JSON.stringify(message));
    return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, (messageData)=> {
            if(!res.headersSent) {
                return res.status(200).json({
                    message: 'Event created successfully',
                    data: messageData
                });
            }
        });
    })
  } catch (error: any) {
    console.error('Error creating event:', error);
    return res.status(500).json({ message: 'Error creating event', error: error.message || error });
  }
};

export const getEvent = async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = req.params.eventId;
    if (!eventId) return res.status(400).json({ message: 'Event ID is required.' });
    const requestId = uuidv4();
    const message = {
      kind: 'getEvent',
      requestId,
      data: {
        eventId
      }
    }
    await insertTail('unProcessedQueue', JSON.stringify(message));
    return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, (messageData)=> {
            if(!res.headersSent) {
                return res.status(200).json({
                    message: 'Event created successfully',
                    data: messageData
                });
            }
        });
    })
  } catch (error) {
    return res.status(500).json({ message: 'Error getting event', error });
  }
}