import { User, TradeMatch, Stock, Event } from "../globalVariables.variable";
import { v4 as uuidv4 } from 'uuid';
import { getGlobalVariable } from "../utils/talkToRedis";


const findUser = async (userId: string): Promise<any> => {
    const users = await getGlobalVariable('users');
    return users.get(userId);
}

const findEvent = async (eventId: string): Promise<any> => {
    const events= await getGlobalVariable('events');
    return events.get(eventId);
}

export const findFunc = async (prefix: string, id: string): Promise<any> => {
    return prefix === 'user' ? await findUser(id) : await findEvent(id)
}

export const createId = (prefix: string): string => {
    return `${prefix}+${uuidv4()}`
}

export const createTradeMatch = (sellerId: string, buyerId: string, quantity: number, price: number, stockType: 'YES' | 'NO'): TradeMatch => {
    return {
        tradeId: 'trade_'+uuidv4(),
        sellerId,
        buyerId,
        quantity,
        createdAt: new Date().toISOString(),
        price,
        stockType
    }
}

export const createStock = (stockType: 'YES' | 'NO', quantity: number, price: number, eventId: string, userId: string): Stock => {
    return {
        stockId: 'stock_'+stockType+'_'+uuidv4(),
        eventId,
        stockType,
        quantity,
        price,
        locked: 0,
        userId
    }
}