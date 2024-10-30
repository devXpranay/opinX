import { processedMessage, Stock, User, Event, Order, payout } from "./globalVariables.variable";
import { placeSellOrder } from "./processSellOrders";
import { setGlobalVariable } from "./talkToRedis";
import { createId, createOrder, createStock, createTradeMatch } from "./utils/helperFunc.util";

export const processBuyOrders = async (message: {
    userId: string,
    price: number,
    quantity: number,
    eventId: string,
    stockType: 'YES' | 'NO',
    events: {[key: string]: Event},
    users: {[key: string]: User},
    event: Event,
    buyer: User
}): Promise<undefined | processedMessage> => {
    try {
        const { userId, price, quantity, eventId, stockType, events, users, event, buyer } = message;
        if(!userId || !price || !quantity || !eventId || !stockType || !events || !users || !event || !buyer) return; 
        
        let matchingOrders: Order[] | undefined = stockType === 'YES' ? event.orderBook.yesBuyOrders[price] : event.orderBook.noBuyOrders[price];

        if(!matchingOrders || matchingOrders === undefined) {
            placeBuyOrder(buyer, event, userId, price, quantity, stockType, users);
            placeComplimentarySellOrder(event, userId, price, quantity, stockType);

            const processedMessage: processedMessage = {
                eventId,
                orderBook: event.orderBook,
                success: true,
                message: 'Order placed, awating match'
            }
            events[eventId] = event;
            await setGlobalVariable('events', events)
            await setGlobalVariable('users', users)
            return processedMessage
        }
        let remainingBuyQuantity: number = quantity;
        const processed = matchOrders(buyer, event, stockType, price, matchingOrders, remainingBuyQuantity, users)
        matchingOrders = processed.matchingOrders;
        remainingBuyQuantity = processed.remainingBuyQuantity
        if(matchingOrders.length === 0) {
            placeBuyOrder(buyer, event, userId, price, remainingBuyQuantity, stockType, users);
            const processedMessage: processedMessage = {
                eventId,
                orderBook: event.orderBook,
                success: true,
                message: 'Order placed, awating match'
            }
            await updateGlobalVariables(events, users, eventId, userId, event, buyer)
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

export const placeBuyOrder = (buyer: User, event: Event, userId: string, price: number, quantity: number, stockType: 'YES' | 'NO', users: {[key: string]:User}): void => {
    const buyOrder = createOrder(userId, quantity, price, stockType, 'BUY')
    if (stockType === 'YES') {
        event.orderBook.yesBuyOrders[price] = [...(event.orderBook.yesBuyOrders[price] || []), buyOrder];
    } else {
        event.orderBook.noBuyOrders[price] = [...(event.orderBook.noBuyOrders[price] || []), buyOrder];
    }
    buyer.wallet.locked += quantity*price;
    buyer.wallet.balance -= quantity*price;

    users[userId] = buyer;
}

export const placeComplimentarySellOrder = (event: Event, userId: string, price: number, quantity: number, stockType: 'YES' | 'NO'): void => {
    const pseudo_transac_id: string = createId('pseudo_transac_id_')
    const pseudo_user_id: string = createId('pseudo_user_id_')
    const complimentaryPrice: number = payout - price
    const complimentaryStockType: 'YES' | 'NO' = stockType === 'YES' ? 'NO' : 'YES'
    const complimentarySellOrder: Order = {
        transacId: pseudo_transac_id,
        price: complimentaryPrice,
        quantity,
        userId: pseudo_user_id,
        orderType: 'SELL',
        stockType: complimentaryStockType,
        stockId: createId('stock_'),
        psuedo: {
            isPsuedo: true,
            userId,
        },
    }
    if (complimentaryStockType === 'YES') {
        event.orderBook.yesSellOrders[complimentaryPrice] = [...(event.orderBook.yesSellOrders[complimentaryPrice] || []), complimentarySellOrder];
    } else {
        event.orderBook.noSellOrders[complimentaryPrice] = [...(event.orderBook.noSellOrders[complimentaryPrice] || []), complimentarySellOrder];
    }

}

export const updateGlobalVariables = async (events: {[key: string]: Event}, users: {[key: string]: User}, eventId: string, userId: string, event: Event, seller: User): Promise<void> => {
    events[eventId] = event;
    users[userId] = seller;
    await setGlobalVariable('events', events)
    await setGlobalVariable('users', users)
    return
}

export const matchOrders = (buyer: User, event: Event, stockType: 'YES' | 'NO', price: number, matchingOrders: Order[], remainingBuyQuantity: number, users: {[key:string]:User}): {matchingOrders: Order[], remainingBuyQuantity: number} => {
    for(let i = 0; i < matchingOrders.length && remainingBuyQuantity > 0; i++) {
        const sellOrder = matchingOrders[i];

        if(remainingBuyQuantity < sellOrder.quantity) {
            if(sellOrder.psuedo?.isPsuedo) {
                const tradeMatch = createTradeMatch(buyer.userId, sellOrder.psuedo.userId, remainingBuyQuantity, price, stockType);
                event.tradeMatches[tradeMatch.tradeId] = tradeMatch;
                buyer.wallet.balance += remainingBuyQuantity*price;
                buyer.wallet.locked -= remainingBuyQuantity*price;

                // create stocks for buyer
                const stock: Stock = createStock(stockType, remainingBuyQuantity, price, event.eventId, buyer.userId)
                const buyerStocks: Stock[] | undefined = buyer.stocks[event.eventId]
                buyer.stocks[event.eventId] = [...(buyerStocks || []), stock]

                // update the psuedo order
                sellOrder.quantity -= remainingBuyQuantity;
                matchingOrders[i] = sellOrder;

                // give the stock to the user inside the psuedo order
                const ogBuyer = users[sellOrder.psuedo.userId] as User;
                const ogStock = createStock(stockType, remainingBuyQuantity, price, event.eventId, sellOrder.psuedo.userId)
                ogBuyer.stocks[event.eventId] = [...(ogBuyer.stocks[event.eventId] || []), ogStock]
                users[sellOrder.psuedo.userId] = ogBuyer;
                // update the psuedo.userId wallet
                ogBuyer.wallet.locked -= remainingBuyQuantity*price;
                remainingBuyQuantity = 0;
                return {matchingOrders, remainingBuyQuantity}
            }
            sellOrder.quantity -= remainingBuyQuantity;
            const tradeMatch = createTradeMatch(buyer.userId, sellOrder.userId, remainingBuyQuantity, price, stockType);
            event.tradeMatches[tradeMatch.tradeId] = tradeMatch;

            // update stocks of seller
            const seller: User | undefined = users[sellOrder.userId] as User;
            const sellerStocks: Stock[] | undefined = seller.stocks[event.eventId]
            const stockIndex: number | undefined = sellerStocks?.findIndex(s=> s.stockId === sellOrder.stockId)
            if(stockIndex === undefined || stockIndex === -1) break;
            if(!sellerStocks) break;
            sellerStocks[stockIndex].locked -= remainingBuyQuantity
            seller.wallet.balance += remainingBuyQuantity*price;
            seller.wallet.locked -= remainingBuyQuantity*price;
            users[sellOrder.userId] = seller

            // create stocks for buyer
            const stock: Stock = createStock(stockType, remainingBuyQuantity, price, event.eventId, buyer.userId)
            const buyerStocks: Stock[] | undefined = buyer.stocks[event.eventId]
            buyer.stocks[event.eventId] = [...(buyerStocks || []), stock]
            buyer.wallet.locked = 0;
            users[buyer.userId] = buyer

            // update sellOrder
            matchingOrders[i] = sellOrder
            remainingBuyQuantity = 0;
            matchingOrders[i] = sellOrder;
            return {matchingOrders, remainingBuyQuantity}
        }
        if(sellOrder.psuedo?.isPsuedo) {
            matchingOrders.splice(i, 1)
            const stock: Stock = createStock(stockType, sellOrder.quantity, price, event.eventId, buyer.userId)
            const buyerStocks: Stock[] | undefined = buyer.stocks[event.eventId]
            buyer.stocks[event.eventId] = [...(buyerStocks || []), stock]
            users[buyer.userId] = buyer

            if(stockType === 'YES') {
                const buyComplimentary: Order = event.orderBook.yesBuyOrders[payout-price]?.find(o => o.psuedo?.userId === sellOrder.userId) as Order
                // remove buyComplimentary from orderbook
                const buyComplimentaryIndex: number | undefined = event.orderBook.yesBuyOrders[payout-price]?.findIndex(o => o.transacId === buyComplimentary.transacId)
                if(buyComplimentaryIndex === undefined || buyComplimentaryIndex === -1) break;
                event.orderBook.yesBuyOrders[payout-price]?.splice(buyComplimentaryIndex, 1)
                const stock: Stock = createStock(stockType, sellOrder.quantity, payout-price, event.eventId, sellOrder.userId)
                const buyerStocks: Stock[] | undefined = users[sellOrder.psuedo?.userId].stocks[event.eventId]
                users[sellOrder.psuedo?.userId].stocks[event.eventId] = [...(buyerStocks || []), stock]
                const buyUser = users[sellOrder.psuedo?.userId]
                buyUser.wallet.locked = 0

            } else {
                const buyComplimentary: Order = event.orderBook.noBuyOrders[payout-price]?.find(o => o.psuedo?.userId === sellOrder.userId) as Order
                const buyComplimentaryIndex: number | undefined = event.orderBook.noBuyOrders[payout-price]?.findIndex(o => o.transacId === buyComplimentary.transacId)
                if(buyComplimentaryIndex === undefined || buyComplimentaryIndex === -1) break;
                event.orderBook.noBuyOrders[payout-price]?.splice(buyComplimentaryIndex, 1)
                const stock: Stock = createStock(stockType, sellOrder.quantity, payout-price, event.eventId, sellOrder.userId)
                const buyerStocks: Stock[] | undefined = users[sellOrder.psuedo?.userId].stocks[event.eventId]
                users[sellOrder.psuedo?.userId].stocks[event.eventId] = [...(buyerStocks || []), stock]
                const buyUser = users[sellOrder.psuedo?.userId]
                buyUser.wallet.locked = 0
            }
            remainingBuyQuantity -= sellOrder.quantity
            break;
        }
        const tradeMatch = createTradeMatch(buyer.userId, sellOrder.userId, sellOrder.quantity, price, stockType);
        event.tradeMatches[tradeMatch.tradeId] = tradeMatch;
        // delete stocks from seller
        const seller: User = users[sellOrder.userId] as User;
        const sellerStocks: Stock[] = seller.stocks[event.eventId];
        const stockIndex: number | undefined = sellerStocks?.findIndex(s => s.stockId === sellOrder.stockId)
        if(stockIndex === undefined || stockIndex === -1) break;
        sellerStocks?.splice(stockIndex, 1)
        users[sellOrder.userId] = seller

        // create stocks for buyer
        const stock: Stock = createStock(stockType, sellOrder.quantity, price, event.eventId, buyer.userId)
        const buyerStocks: Stock[] | undefined = buyer.stocks[event.eventId]
        buyer.stocks[event.eventId] = [...(buyerStocks || []), stock]
        users[buyer.userId] = buyer

        // delete the sellOrder from matchingOrders
        matchingOrders.splice(i, 1)
        remainingBuyQuantity -= sellOrder.quantity
        i--;
    }
    return {matchingOrders, remainingBuyQuantity};
}



