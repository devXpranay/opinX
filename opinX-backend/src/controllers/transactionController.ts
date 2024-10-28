import { Request, Response } from "express";
import { Event, messageToQueue, User } from "../globalVariables.variable";
import { findFunc } from "../utils/helperFunc.util";
import { insertTail, pubsubclient } from "../utils/talkToRedis";

export const stockTransaction = async (req: Request, res: Response): Promise<any> => {    
    const userId: string = req.body.userId;
    const price: number = req.body.price;
    const orderType: 'BUY' | 'SELL' = req.body.orderType;
    const quantity: number = req.body.quantity;
    const eventId: string = req.body.eventId;
    const stockId: string = req.body.stockId;
    const stockType: 'YES' | 'NO' = req.params.stockType as 'YES' | 'NO';
    const event: Event = await findFunc('event', eventId) as Event;
    const user: User = await findFunc('user', userId) as User;
    if(!userId || !price || !orderType || !stockType || !quantity || !eventId) return res.status(400).json({message: 'required fields missing'})
    if(!event) return res.status(400).json({message: "Event not found"})
    if(!user) return res.status(400).json({message: "User not found"})
    if(user.wallet.balance < (price * quantity)) return res.status(400).json({message: "Insufficient balance"})
    const message: messageToQueue = {
        userId,
        price,
        orderType,
        quantity,
        stockId,
        stockType,
        eventId,
    }
    try{
        await insertTail('unProcessedQueue', JSON.stringify(message));
        await pubsubclient.subscribe('backend', (pubMessage) => {
            const messageData: boolean = JSON.parse(pubMessage);
            if (!res.headersSent) {
                return res.status(200).json({
                    message: "Transaction successful, awaiting confirmation",
                    data: messageData
                });
            }
        });
    }
    catch(e) {
        res.status(400).json({message: "Error while transaction of stock", e})
    }
    finally {
        await pubsubclient.unsubscribe('backend');
    }
}

