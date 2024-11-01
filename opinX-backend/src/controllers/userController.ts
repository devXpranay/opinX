import { Request, Response } from "express";
import { insertTail, pubsubclient } from "../utils/talkToRedis";
import { v4 as uuidv4 } from 'uuid';
import { pendingRequests } from "../pubsub/pubsub";
export const createUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });
        const requestId = uuidv4();
        const message = {
            kind: 'createUser',
            requestId,
            data: {
                name,
                email
            }
        }
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
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
};

export const onRampMoney = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId, amount } = req.body;
        if (!userId || amount == null) return res.status(400).json({ message: 'User ID and amount are required.' });
        const requestId = uuidv4();
        const message = {
            kind: 'onRampMoney',
            requestId,
            data: {
                userId,
                amount
            }
        }
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
    } catch (error: any) {
        console.error('Error onramping money:', error);
        return res.status(500).json({ message: 'Error onramping money', error: error.message || error });    
    }
};

export const getUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.params.userId;
        if (!userId) return res.status(400).json({ message: 'User ID is required.' });
        const requestId = uuidv4();
        const message = {
            kind: 'getUser',
            requestId,
            data: {
                userId
            }
        }
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
    } catch (error) {
        return res.status(500).json({ message: 'Error getting user balance', error });
    }
};

