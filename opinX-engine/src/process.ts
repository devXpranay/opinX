import { messageToQueue, User, Event, processedMessage } from "./globalVariables.variable";
import { processBuyOrders } from "./processBuyOrders";
import { processSellOrders } from "./processSellOrders";
import { retrieveHead, getGlobalVariable } from "./talkToRedis";

export const process = async (queueName: string): Promise<processedMessage | undefined> => {
    const headElement: {key: string, element: string} = await retrieveHead(queueName);
    const message: messageToQueue = JSON.parse(headElement.element) as messageToQueue;
    const {userId, price, orderType, quantity, eventId, stockId, stockType} = message;
    if(!userId || !price || !orderType || !quantity || !eventId || !stockType) return;
    let processedMessage: processedMessage | undefined;
    let events: {[key: string]: Event}
    let users:  {[key: string]: User}
    events = await getGlobalVariable('events');
    users = await getGlobalVariable('users');

    if(orderType === 'SELL' && stockId) {
        processedMessage = await processSellOrders({userId, price, quantity, eventId, stockId, stockType, events, users, event: events[eventId], seller: users[userId]})
    }
    processedMessage = await processBuyOrders({userId, price, quantity, eventId, stockType, events, users, event: events[eventId], buyer: users[userId]})
}