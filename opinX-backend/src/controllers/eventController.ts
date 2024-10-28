import { NextFunction, Request, Response } from 'express';
import { Event } from '../globalVariables.variable';
import { createId, findFunc } from '../utils/helperFunc.util';
import { getGlobalVariable, setGlobalVariable } from '../utils/talkToRedis';


export const createEvent = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'Missing required fields' });
    const eventId = createId('event_');
    const event: Event = {
      eventId: eventId,
      title,
      description,
      yes: 0,
      no: 0,
      isClosed: false,
      startTime: new Date().toISOString(),
      endTime: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
      users: [],
      tradeMatches: new Map(),
      orderBook: {
        yesSellOrders: new Map(),
        noSellOrders: new Map(),
        yesBuyOrders: new Map(),
        noBuyOrders: new Map()
      },
      opinXFunds: 0
    }
    let events: Map<Event['eventId'], Event> = await getGlobalVariable('events');
    if (events === null || Object.keys(events).length === 0) {
      events = new Map<string, Event>();
    } else {
      events = new Map<string, Event>(Object.entries(events));
    }

    events.set(eventId, event);
    await setGlobalVariable('events', Object.fromEntries(events));

    return res.status(201).json({ message: 'Event created successfully', event });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return res.status(500).json({ message: 'Error creating event', error: error.message || error });
  }
};

export const getEvent = async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = req.params.eventId;
    const event: Event = await findFunc('event', eventId) as Event;
    if (!event) return res.status(404).json({ message: 'Event not found' });
    return res.status(200).json({ message: 'Event found', event });
  } catch (error) {
    return res.status(500).json({ message: 'Error getting event', error });
  }
}
