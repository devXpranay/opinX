import { messageToQueue, User, Order, TradeMatch, Stock, payout, Event, processedMessage } from "./globalVariables.variable";
import { getGlobalVariable, retrieveHead, setGlobalVariable } from "./talkToRedis";
import { createId, createTradeMatch, createStock } from "./utils/helperFunc.util";

export const processOrder = async (queueName: string): Promise<undefined | processedMessage> => {
    try {
        const headElement: {key: string, element: string} = await retrieveHead(queueName);
        const message: messageToQueue = JSON.parse(headElement.element) as messageToQueue;
        const {userId, price, orderType, quantity, eventId, stockId, stockType} = message;
        if(!userId || !price || !orderType || !quantity || !eventId || !stockType) return;

        let events: {[key: string]: Event}
        let users: {[key: string]: User}
        events = await getGlobalVariable('events');
        users = await getGlobalVariable('users');
        const event: Event = events[eventId];
        if(!event) return;

        const user: User = users[userId];
        if(!user) return;


        if(orderType === 'BUY') {
            const lockedFunds: number = price*quantity
            user.wallet.locked = lockedFunds
            user.wallet.balance = user.wallet.balance - lockedFunds
            
            let remainingBuyQuantity: number = quantity;
            const matchingOrders: Order[] | undefined = stockType === 'YES' ? event.orderBook.yesSellOrders[price] as Order[] : event.orderBook.noSellOrders[price] as Order[]
            if(matchingOrders === undefined || !matchingOrders) {
                const transacId: string = createId('transac_')
                const buyOrder: Order = {
                    transacId,
                    price,
                    quantity,
                    userId,
                    orderType,
                    stockType,
                    psuedo: {
                        isPsuedo: false,
                        userId
                    }
                }
                if(stockType === 'YES') {
                    const existingYesOrders: Order[] | undefined = event.orderBook.yesBuyOrders[price]
                    event.orderBook.yesBuyOrders[price] = [...(existingYesOrders || []), buyOrder]
                } else {
                    const existingNoOrders: Order[] | undefined = event.orderBook.noBuyOrders[price]
                    event.orderBook.noBuyOrders[price] = [...(existingNoOrders || []), buyOrder]
                }

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
                if(stockType === 'YES') {
                    const existingNoOrders: Order[] | undefined = event.orderBook.noSellOrders[complimentaryPrice]
                    event.orderBook.noSellOrders[complimentaryPrice] = [...(existingNoOrders || []), complimentarySellOrder]
                } else {
                    const existingYesOrders: Order[] | undefined = event.orderBook.yesSellOrders[complimentaryPrice]
                    event.orderBook.yesSellOrders[complimentaryPrice] = [...(existingYesOrders || []), complimentarySellOrder]
                }

            }
            else {
                
                for (let i=0; i<matchingOrders.length; i++) {
                    if(remainingBuyQuantity <= 0) break;
                    const sellOrder: Order = matchingOrders[i]
                    if(remainingBuyQuantity < sellOrder.quantity) {
                        sellOrder.quantity -= remainingBuyQuantity;

                        const tradeMatch: TradeMatch = createTradeMatch(userId, sellOrder.userId, remainingBuyQuantity, price, stockType)
                        event.tradeMatches[tradeMatch.tradeId] = tradeMatch
    
                        // update stocks of seller
                        const seller: User | undefined = users[sellOrder.userId] as User;
                        const sellerStocks: Stock[] | undefined = seller.stocks[eventId]
                        const stockIndex: number | undefined = sellerStocks?.findIndex(s=> s.stockId === sellOrder.stockId)
                        if(stockIndex === undefined || stockIndex === -1) break;
                        if(!sellerStocks) break;
                        sellerStocks[stockIndex].locked -= remainingBuyQuantity
                        users[sellOrder.userId] = seller
    
                        // create stocks for buyer
                        const stock: Stock = createStock(stockType, remainingBuyQuantity, price, eventId, userId)
                        const buyerStocks: Stock[] | undefined = user.stocks[eventId]
                        user.stocks[eventId] = [...(buyerStocks || []), stock]
                        users[userId] = user
    
                        // update sellOrder
                        matchingOrders[i] = sellOrder
                        remainingBuyQuantity = 0;
                        break;
                    }
                    const tradeMatch: TradeMatch = createTradeMatch(userId, sellOrder.userId, sellOrder.quantity, price, stockType)
                    event.tradeMatches[tradeMatch.tradeId] = tradeMatch
                    
                    if(sellOrder.psuedo?.isPsuedo) {
                        // delete the complimentary order
                        // create stocks for buyer
                        // delete buyOrder of corresponding user when the complimentary order is created
                        // delete buyOrder from orderbook that corresponds to sellOrder.psuedo.userId
                        matchingOrders.splice(i, 1)
                        const stock: Stock = createStock(stockType, sellOrder.quantity, price, eventId, userId)
                        const buyerStocks: Stock[] | undefined = user.stocks[eventId]
                        user.stocks[eventId] = [...(buyerStocks || []), stock]
                        users[userId] = user

                        if(stockType === 'YES') {
                            const buyComplimentary: Order = event.orderBook.yesBuyOrders[payout-price]?.find(o => o.psuedo?.userId === sellOrder.userId) as Order
                            // remove buyComplimentary from orderbook
                            const buyComplimentaryIndex: number | undefined = event.orderBook.yesBuyOrders[payout-price]?.findIndex(o => o.transacId === buyComplimentary.transacId)
                            if(buyComplimentaryIndex === undefined || buyComplimentaryIndex === -1) break;
                            event.orderBook.yesBuyOrders[payout-price]?.splice(buyComplimentaryIndex, 1)
                            const stock: Stock = createStock(stockType, sellOrder.quantity, payout-price, eventId, sellOrder.userId)
                            const buyerStocks: Stock[] | undefined = users[sellOrder.psuedo?.userId].stocks[eventId]
                            users[sellOrder.psuedo?.userId].stocks[eventId] = [...(buyerStocks || []), stock]
                            const buyUser = users[sellOrder.psuedo?.userId]
                            buyUser.wallet.locked = 0

                        } else {
                            const buyComplimentary: Order = event.orderBook.noBuyOrders[payout-price]?.find(o => o.psuedo?.userId === sellOrder.userId) as Order
                            const buyComplimentaryIndex: number | undefined = event.orderBook.noBuyOrders[payout-price]?.findIndex(o => o.transacId === buyComplimentary.transacId)
                            if(buyComplimentaryIndex === undefined || buyComplimentaryIndex === -1) break;
                            event.orderBook.noBuyOrders[payout-price]?.splice(buyComplimentaryIndex, 1)
                            const stock: Stock = createStock(stockType, sellOrder.quantity, payout-price, eventId, sellOrder.userId)
                            const buyerStocks: Stock[] | undefined = users[sellOrder.psuedo?.userId].stocks[eventId]
                            users[sellOrder.psuedo?.userId].stocks[eventId] = [...(buyerStocks || []), stock]
                            const buyUser = users[sellOrder.psuedo?.userId]
                            buyUser.wallet.locked = 0
                        }
                        remainingBuyQuantity -= sellOrder.quantity
                        break;
                    }

                    // delete stocks from seller
                    const seller: User = users[sellOrder.userId] as User;
                    const sellerStocks: Stock[] = seller.stocks[eventId];
                    const stockIndex: number | undefined = sellerStocks?.findIndex(s => s.stockId === sellOrder.stockId)
                    if(stockIndex === undefined || stockIndex === -1) break;
                    sellerStocks?.splice(stockIndex, 1)
                    users[sellOrder.userId] = seller
    
                    // create stocks for buyer
                    const stock: Stock = createStock(stockType, sellOrder.quantity, price, eventId, userId)
                    const buyerStocks: Stock[] | undefined = user.stocks[eventId]
                    user.stocks[eventId] = [...(buyerStocks || []), stock]
                    users[userId] = user
    
                    // delete the sellOrder from matchingOrders
                    matchingOrders.splice(i, 1)
                    remainingBuyQuantity -= sellOrder.quantity
                }
                if(stockType === 'YES'){
                    event.orderBook.yesSellOrders[price] = matchingOrders
                } else {
                    event.orderBook.noSellOrders[price] = matchingOrders
                }
            }
            const remainingFunds: number = remainingBuyQuantity*price
            event.opinXFunds += lockedFunds
            user.wallet.locked = remainingFunds

            users[userId] = user
        }
        else {
            const stock: Stock | undefined = user.stocks[eventId]?.find(s => s.stockId === stockId)
            if(!stock) return;
            if(stock.quantity === 0) return;
            if(stock.price !== price) return;
            if(stock.quantity < quantity) return;
            
            let remainingSellQuantity: number = quantity;
            const matchingOrders: Order[] | undefined = stockType === 'YES' ? event.orderBook.yesBuyOrders[price] as Order[] : event.orderBook.noBuyOrders[price] as Order[]

            if(matchingOrders.length === 0) {
                const transacId: string = createId('transac_')
                const sellOrder: Order = {
                    transacId,
                    price,
                    quantity,
                    userId,
                    orderType,
                    stockType,
                } 
                stock.locked = quantity;
                if(stockType === 'YES') {
                    const existingYesOrders: Order[] | undefined = event.orderBook.yesSellOrders[price]
                    event.orderBook.yesSellOrders[price] = [...(existingYesOrders || []), sellOrder]
                } else {
                    const existingNoOrders: Order[] | undefined = event.orderBook.noSellOrders[price]
                    event.orderBook.noSellOrders[price] = [...(existingNoOrders || []), sellOrder]
                }
            } else {
                for (let i=0; i<matchingOrders.length; i++) {
                    if(remainingSellQuantity <= 0) break;
                    const buyOrder: Order = matchingOrders[i]
                    if(remainingSellQuantity < buyOrder.quantity) {
                        buyOrder.quantity -= remainingSellQuantity;
                        
                        const tradeMatch: TradeMatch = createTradeMatch(userId, buyOrder.userId, remainingSellQuantity, price, stockType)
                        event.tradeMatches[tradeMatch.tradeId] = tradeMatch
    
                        // remove stock of seller
                        const seller: User = user
                        const sellerStocks: Stock[] | undefined = seller.stocks[eventId]
                        const stockIndex: number | undefined = sellerStocks?.findIndex(s=> s.stockId === stockId)
                        if(stockIndex === undefined || stockIndex === -1) break;
                        if(!sellerStocks) break;
                        sellerStocks.splice(stockIndex, 1)
                        users[userId] = seller
    
                        // create stocks for buyer
                        const buyer: User | undefined = users[buyOrder.userId]
                        if(!buyer) break;
                        const stock: Stock = createStock(stockType, remainingSellQuantity, price, eventId, buyOrder.userId)
                        const buyerStocks: Stock[] | undefined = buyer?.stocks[eventId]
                        buyer.stocks[eventId] = [...(buyerStocks || []), stock]
                        users[buyOrder.userId] = buyer
    
                        // update buyOrder
                        matchingOrders[i] = buyOrder
                        remainingSellQuantity = 0;
                        break;
                    }
                    const tradeMatch: TradeMatch = createTradeMatch(userId, buyOrder.userId, buyOrder.quantity, price, stockType)
                    event.tradeMatches[tradeMatch.tradeId] = tradeMatch
    
                    // update stocks of seller
                    const seller: User = user
                    const sellerStock: Stock | undefined = seller.stocks[eventId]?.find(s=> s.stockId === stockId)
                    if(!sellerStock) break;
                    sellerStock.locked = 0;
                    sellerStock.quantity -= buyOrder.quantity;
                    users[userId] = seller
                    
                    
                    // create stocks for buyer
                    const stock: Stock = createStock(stockType, buyOrder.quantity, price, eventId, buyOrder.userId)
                    const buyer : User | undefined = users[buyOrder.userId]
                    if(!buyer) break;
                    const buyerStocks: Stock[] | undefined = buyer?.stocks[eventId]
                    buyer.stocks[eventId] = [...(buyerStocks || []), stock]
                    users[buyOrder.userId] = buyer
                    
                    remainingSellQuantity -= buyOrder.quantity
                    // delete the buyOrder from matchingOrders
                    matchingOrders.splice(i,1)
                }
                if(stockType === 'YES'){
                    event.orderBook.yesBuyOrders[price] = matchingOrders
                } else {
                    event.orderBook.noBuyOrders[price] = matchingOrders
                }
            }
        }
        const processedMessage: processedMessage = {
            eventId,
            orderBook: event.orderBook,
            success: true
        }
        events[eventId] = event;
        await setGlobalVariable('events', events);
        await setGlobalVariable('users', users)
        return processedMessage;
    }
    catch(e) {
        console.log("Error while processing order - Engine", e);
    }
}