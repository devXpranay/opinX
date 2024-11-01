import { Request, Response } from "express";
import { insertTail } from "../utils/talkToRedis";
import { pendingRequests } from "../pubsub/pubsub";
import { v4 as uuidv4 } from 'uuid';

export const stockTransaction = async (req: Request, res: Response): Promise<any> => { 
    try{
        const { eventId, userId, stockType, orderType, price, quantity } = req.body;
        if (!eventId || !userId || !stockType || !orderType || !price || !quantity) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const requestId = uuidv4();
        const message = {
        kind: 'transact',
        requestId,
        data: {
            eventId,
            userId,
            stockType,
            orderType,
            price,
            quantity
        }
        };
        await insertTail('unProcessedQueue', JSON.stringify(message));
        return new Promise((resolve, reject) => {
            pendingRequests.set(requestId, (messageData)=> {
                if(!res.headersSent) {
                    return res.status(messageData.statusCode).json({
                        message: messageData.data,
                        requestId: messageData.requestId
                    });
                }
            });
        })
    }
    catch(e) {
        res.status(400).json({message: "Error while transaction of stock", e})
    }
}

