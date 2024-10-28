import { messageToQueue, User, Order, TradeMatch, Stock, payout, Event, processedMessage } from "./globalVariables.variable";
import { getGlobalVariable, retrieveHead, setGlobalVariable } from "./talkToRedis";
import { findFunc, createId, createTradeMatch, createStock } from "./utils/helperFunc.util";


export const processOrder = async (queueName: string): Promise<undefined | processedMessage> => {
    try {
        const headElement: {key: string, element: string} = await retrieveHead(queueName);
        console.log(headElement)
        const message: messageToQueue = JSON.parse(headElement.element) as messageToQueue;
        const {userId, price, orderType, quantity, eventId, stockId, stockType} = message;
        if(!userId || !price || !orderType || !quantity || !eventId || !stockType) return;

        const event: Event | undefined = await findFunc('event', eventId) as Event;
        if(!event) return;

        let users: Map<User['userId'], User> = await getGlobalVariable('users');
        const user: User | undefined = users.get(userId) as User
        if(!user) return;


        if(orderType === 'BUY') {
            const lockedFunds: number = price*quantity
            user.wallet.locked = lockedFunds
            user.wallet.balance = user.wallet.balance - lockedFunds
            
            let remainingBuyQuantity: number = quantity;
            const matchingOrders: Order[] | undefined = stockType === 'YES' ? event.orderBook.yesSellOrders.get(price) as Order[] : event.orderBook.noSellOrders.get(price) as Order[]
            if(matchingOrders.length === 0) {
                const transacId: string = createId('transac')
                const buyOrder: Order = {
                    transacId,
                    price,
                    quantity,
                    userId,
                    orderType,
                    stockType
                }
                if(stockType === 'YES') {
                    const existingYesOrders: Order[] | undefined = event.orderBook.yesBuyOrders.get(price)
                    event.orderBook.yesBuyOrders.set(price, [...(existingYesOrders || []), buyOrder])
                } else {
                    const existingNoOrders: Order[] | undefined = event.orderBook.noBuyOrders.get(price)
                    event.orderBook.noBuyOrders.set(price, [...(existingNoOrders || []), buyOrder])
                }

                const pseudo_transac_id: string = createId('pseudo_transac_id')
                const pseudo_user_id: string = createId('pseudo_user_id')
                const complimentaryPrice: number = payout - price
                const complimentaryStockType: 'YES' | 'NO' = stockType === 'YES' ? 'NO' : 'YES'
                const complimentarySellOrder: Order = {
                    transacId: pseudo_transac_id,
                    price: complimentaryPrice,
                    quantity,
                    userId: pseudo_user_id,
                    orderType: 'SELL',
                    stockType: complimentaryStockType
                }
                if(stockType === 'YES') {
                    const existingNoOrders: Order[] | undefined = event.orderBook.noSellOrders.get(complimentaryPrice)
                    event.orderBook.noSellOrders.set(complimentaryPrice, [...(existingNoOrders || []), complimentarySellOrder])
                } else {
                    const existingYesOrders: Order[] | undefined = event.orderBook.yesSellOrders.get(complimentaryPrice)
                    event.orderBook.yesSellOrders.set(complimentaryPrice, [...(existingYesOrders || []), complimentarySellOrder])
                }

            }
            else {
                for (let i=0; i<matchingOrders.length; i++) {
                    if(remainingBuyQuantity <= 0) break;
                    const sellOrder: Order = matchingOrders[i]
                    if(remainingBuyQuantity < sellOrder.quantity) {
                        sellOrder.quantity -= remainingBuyQuantity;
                        
                        const tradeMatch: TradeMatch = createTradeMatch(userId, sellOrder.userId, remainingBuyQuantity, price, stockType)
                        event.tradeMatches.set(tradeMatch.tradeId, tradeMatch)
    
                        // update stocks of seller
                        const seller: User | undefined = users.get(sellOrder.userId) as User;
                        const sellerStocks: Stock[] | undefined = seller.stocks.get(eventId)
                        const stockIndex: number | undefined = sellerStocks?.findIndex(s=> s.stockId === sellOrder.stockId)
                        if(stockIndex === undefined || stockIndex === -1) break;
                        if(!sellerStocks) break;
                        sellerStocks[stockIndex].locked -= remainingBuyQuantity
                        users.set(sellOrder.userId, seller)
    
                        // create stocks for buyer
                        const stock: Stock = createStock(stockType, remainingBuyQuantity, price, eventId, userId)
                        const buyerStocks: Stock[] | undefined = user.stocks.get(eventId)
                        user.stocks.set(eventId, [...(buyerStocks || []), stock])
                        users.set(userId, user)
    
                        // update sellOrder
                        matchingOrders[i] = sellOrder
                        remainingBuyQuantity = 0;
                        break;
                    }
                    const tradeMatch: TradeMatch = createTradeMatch(userId, sellOrder.userId, sellOrder.quantity, price, stockType)
                    event.tradeMatches.set(tradeMatch.tradeId, tradeMatch)
    
                    // delete stocks from seller
                    const seller: User = users.get(sellOrder.userId) as User;
                    const sellerStocks: Stock[] | undefined = seller.stocks.get(eventId)
                    const stockIndex: number | undefined = sellerStocks?.findIndex(s => s.stockId === sellOrder.stockId)
                    if(stockIndex === undefined || stockIndex === -1) break;
                    sellerStocks?.splice(stockIndex, 1)
                    users.set(sellOrder.userId, seller)
    
                    // create stocks for buyer
                    const stock: Stock = createStock(stockType, sellOrder.quantity, price, eventId, userId)
                    const buyerStocks: Stock[] | undefined = user.stocks.get(eventId)
                    user.stocks.set(eventId, [...(buyerStocks || []), stock])
                    users.set(userId, user)
    
                    // delete the sellOrder from matchingOrders
                    matchingOrders.splice(i, 1)
                    remainingBuyQuantity -= sellOrder.quantity
                }
                if(stockType === 'YES'){
                    event.orderBook.yesSellOrders.set(price, matchingOrders)
                } else {
                    event.orderBook.noSellOrders.set(price, matchingOrders)
                }
            }
            const remainingFunds: number = remainingBuyQuantity*price
            event.opinXFunds += lockedFunds
            user.wallet.locked = remainingFunds

            users.set(userId, user)
        }
        else {
            const stock: Stock | undefined = user.stocks.get(eventId)?.find(s => s.stockId === stockId)
            if(!stock) return;
            if(stock.quantity === 0) return;
            if(stock.price !== price) return;
            if(stock.quantity < quantity) return;
            
            let remainingSellQuantity: number = quantity;
            const matchingOrders: Order[] | undefined = stockType === 'YES' ? event.orderBook.yesBuyOrders.get(price) as Order[] : event.orderBook.noBuyOrders.get(price) as Order[]

            if(matchingOrders.length === 0) {
                const transacId: string = createId('transac')
                const sellOrder: Order = {
                    transacId,
                    price,
                    quantity,
                    userId,
                    orderType,
                    stockType
                } 
                stock.locked = quantity;
                if(stockType === 'YES') {
                    const existingYesOrders: Order[] | undefined = event.orderBook.yesSellOrders.get(price)
                    event.orderBook.yesSellOrders.set(price, [...(existingYesOrders || []), sellOrder])
                } else {
                    const existingNoOrders: Order[] | undefined = event.orderBook.noSellOrders.get(price)
                    event.orderBook.noSellOrders.set(price, [...(existingNoOrders || []), sellOrder])
                }
            } else {
                for (let i=0; i<matchingOrders.length; i++) {
                    if(remainingSellQuantity <= 0) break;
                    const buyOrder: Order = matchingOrders[i]
                    if(remainingSellQuantity < buyOrder.quantity) {
                        buyOrder.quantity -= remainingSellQuantity;
                        
                        const tradeMatch: TradeMatch = createTradeMatch(userId, buyOrder.userId, remainingSellQuantity, price, stockType)
                        event.tradeMatches.set(tradeMatch.tradeId, tradeMatch)
    
                        // remove stock of seller
                        const seller: User = user
                        const sellerStocks: Stock[] | undefined = seller.stocks.get(eventId)
                        const stockIndex: number | undefined = sellerStocks?.findIndex(s=> s.stockId === stockId)
                        if(stockIndex === undefined || stockIndex === -1) break;
                        if(!sellerStocks) break;
                        sellerStocks.splice(stockIndex, 1)
                        users.set(seller.userId, seller)
    
                        // create stocks for buyer
                        const buyer: User | undefined = users.get(buyOrder.userId)
                        if(!buyer) break;
                        const stock: Stock = createStock(stockType, remainingSellQuantity, price, eventId, buyOrder.userId)
                        const buyerStocks: Stock[] | undefined = buyer?.stocks.get(eventId)
                        buyer?.stocks.set(eventId, [...(buyerStocks || []), stock])
                        users.set(buyOrder.userId, buyer)
    
                        // update buyOrder
                        matchingOrders[i] = buyOrder
                        remainingSellQuantity = 0;
                        break;
                    }
                    const tradeMatch: TradeMatch = createTradeMatch(userId, buyOrder.userId, buyOrder.quantity, price, stockType)
                    event.tradeMatches.set(tradeMatch.tradeId, tradeMatch)
    
                    // update stocks of seller
                    const seller: User = user
                    const sellerStock: Stock | undefined = seller.stocks.get(eventId)?.find(s=> s.stockId === stockId)
                    if(!sellerStock) break;
                    sellerStock.locked = 0;
                    sellerStock.quantity -= buyOrder.quantity;
                    users.set(seller.userId, seller)
                    
                    
                    // create stocks for buyer
                    const stock: Stock = createStock(stockType, buyOrder.quantity, price, eventId, buyOrder.userId)
                    const buyer : User | undefined = users.get(buyOrder.userId)
                    if(!buyer) break;
                    const buyerStocks: Stock[] | undefined = buyer?.stocks.get(eventId)
                    buyer?.stocks.set(eventId, [...(buyerStocks || []), stock])
                    users.set(buyOrder.userId, buyer)
                    
                    remainingSellQuantity -= buyOrder.quantity
                    // delete the buyOrder from matchingOrders
                    matchingOrders.splice(i,1)
                }
                if(stockType === 'YES'){
                    event.orderBook.yesBuyOrders.set(price, matchingOrders)
                } else {
                    event.orderBook.noBuyOrders.set(price, matchingOrders)
                }
            }
        }
        const processedMessage: processedMessage = {
            eventId,
            orderBook: event.orderBook,
            success: true
        }
        const events: Map<Event['eventId'], Event> = await getGlobalVariable('events');
        events.set(eventId, event);
        await setGlobalVariable('events', events);
        await setGlobalVariable('users', users)
        return processedMessage;
    }
    catch(e) {
        console.log("Error while processing order - Engine", e);
    }
}