import { processedMessage, Stock, User, Event, Order } from "./globalVariables.variable";
import { setGlobalVariable } from "./talkToRedis";
import { createOrder, createStock, createTradeMatch } from "./utils/helperFunc.util";

export const processSellOrders = async (message: {
    userId: string,
    price: number,
    quantity: number,
    eventId: string,
    stockId: string,
    stockType: 'YES' | 'NO',
    events: {[key: string]: Event},
    users: {[key: string]: User},
    event: Event,
    seller: User
}): Promise<undefined | processedMessage> => {
    try {
        const { userId, price, quantity, eventId, stockId, stockType, events, users, event, seller } = message;
        if(!userId || !price || !quantity || !eventId || !stockType || !stockId || !events || !users || !event || !seller) return; 
        
        const stockIndex: number = seller.stocks[eventId]?.findIndex(s=> s.stockId === stockId)
        const stock: Stock | undefined = seller.stocks[eventId][stockIndex]
        if(!stock || stock.quantity < quantity || stock.price!==price || stock.quantity === 0) return;

        let matchingOrders: Order[] | undefined = stockType === 'YES' ? event.orderBook.yesBuyOrders[price] : event.orderBook.noBuyOrders[price];

        if(!matchingOrders || matchingOrders === undefined) {
            placeSellOrder(stock, seller, event, userId, price, quantity, stockId, stockType, stockIndex);
            const processedMessage: processedMessage = {
                eventId,
                orderBook: event.orderBook,
                success: true,
                message: 'Order placed, awating match'
            }
            await updateGlobalVariables(events, users, eventId, userId, event, seller)
            return processedMessage
        }
        let remainingSellQuantity: number = quantity;
        const processed = matchOrders(seller, event, stockId, stockType, price, matchingOrders, remainingSellQuantity, users)
        matchingOrders = processed.matchingOrders;
        remainingSellQuantity = processed.remainingSellQuantity
        if(matchingOrders.length === 0) {
            placeSellOrder(stock, seller, event, userId, price, remainingSellQuantity, stockId, stockType, stockIndex);
            const processedMessage: processedMessage = {
                eventId,
                orderBook: event.orderBook,
                success: true,
                message: 'Order placed, awating match'
            }
            await updateGlobalVariables(events, users, eventId, userId, event, seller)
            return processedMessage
        }
        const processedMessage: processedMessage = {
            eventId,
            orderBook: event.orderBook,
            success: true,
            message: 'Order placed, match orders found'
        }
        if (stockType === 'YES') {
            event.orderBook.yesBuyOrders[price] = matchingOrders;
        } else {
            event.orderBook.noBuyOrders[price] = matchingOrders;
        }
        events[event.eventId] = event;
        await setGlobalVariable('events', events)
        await setGlobalVariable('users', users)
        return processedMessage
    } catch (error) {
        
    }
}

export const placeSellOrder = (stock: Stock, seller: User, event: Event, userId: string, price: number, quantity: number, stockId: string, stockType: 'YES' | 'NO', stockIndex: number): void => {
    const sellOrder = createOrder(userId, quantity, price, stockType, 'SELL', stockId)
    if (stockType === 'YES') {
        event.orderBook.yesSellOrders[price] = [...(event.orderBook.yesSellOrders[price] || []), sellOrder];
    } else {
        event.orderBook.noSellOrders[price] = [...(event.orderBook.noSellOrders[price] || []), sellOrder];
    }
    seller.wallet.locked += quantity*price;
    stock.locked = quantity;
    stock.quantity -= quantity;
    seller.stocks[event.eventId][stockIndex] = stock;
}

export const updateGlobalVariables = async (events: {[key: string]: Event}, users: {[key: string]: User}, eventId: string, userId: string, event: Event, seller: User): Promise<void> => {
    events[eventId] = event;
    users[userId] = seller;
    await setGlobalVariable('events', events)
    await setGlobalVariable('users', users)
    return
}

export const matchOrders = (seller: User, event: Event, stockId: string, stockType: 'YES' | 'NO', price: number, matchingOrders: Order[], remainingSellQuantity: number, users: {[key:string]:User}): {matchingOrders: Order[], remainingSellQuantity: number} => {
    for(let i = 0; i < matchingOrders.length && remainingSellQuantity > 0; i++) {
        const buyOrder = matchingOrders[i];

        if(remainingSellQuantity < buyOrder.quantity) {
            buyOrder.quantity -= remainingSellQuantity;
            const tradeMatch = createTradeMatch(seller.userId, buyOrder.userId, remainingSellQuantity, price, stockType);
            event.tradeMatches[tradeMatch.tradeId] = tradeMatch;
            seller.wallet.balance += remainingSellQuantity*price;
            seller.wallet.locked -= remainingSellQuantity*price;

            const buyer: User = users[buyOrder.userId]
            buyer.wallet.locked = 0;
            const buyerStock = createStock(stockType, remainingSellQuantity, price, event.eventId, buyOrder.userId)
            buyer.stocks[event.eventId] = [...(buyer.stocks[event.eventId] || []), buyerStock]

            users[buyOrder.userId] = buyer;
            remainingSellQuantity = 0;
            matchingOrders[i] = buyOrder;
            return {matchingOrders, remainingSellQuantity}
        }
        const tradeMatch = createTradeMatch(seller.userId, buyOrder.userId, buyOrder.quantity, price, stockType);
        event.tradeMatches[tradeMatch.tradeId] = tradeMatch;
        seller.wallet.balance += buyOrder.quantity*price;
        seller.wallet.locked -= buyOrder.quantity*price;

        const buyer: User = users[buyOrder.userId]
        buyer.wallet.locked = 0;
        const buyerStock = createStock(stockType, buyOrder.quantity, price, event.eventId, buyOrder.userId)
        buyer.stocks[event.eventId] = [...(buyer.stocks[event.eventId] || []), buyerStock]

        remainingSellQuantity -= buyOrder.quantity;
        matchingOrders.splice(i, 1);
        users[buyOrder.userId] = buyer;
        i--;
    }
    return {matchingOrders, remainingSellQuantity};
}



