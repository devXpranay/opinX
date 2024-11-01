export interface Stock {
    quantity: number;
    locked: number;
}
export interface User {
    userId: string;
    email: string;
    name: string;
    wallet: Wallet;
    stocks: {
        [eventId: string]: {
            yes: {[price: number]: Stock};
            no: {[price: number]: Stock};
        }
    };
}
export interface Wallet {
    balance: number;
    locked: number;
}
export interface Event {
    eventId: string;
    title: string;
    description: string;
    yes: number;
    no: number;
    isClosed: boolean;
    startTime: string;
    endTime: string;
    users: string[];
    tradeMatches: { [tradeId: string]: TradeMatch };
    orderBook: {
        yesSellOrders: { [price: number]: {
            total: number,
            orders: {
                [userId: string]: Order
            }
        } };
        yesBuyOrders: { [price: number]: {
            total: number,
            orders: {
                [userId: string]: Order
            }
        } };
        noSellOrders: { [price: number]: {
            total: number,
            orders: {
                [userId: string]: Order
            }
        } };
        noBuyOrders: { [price: number]: {
            total: number,
            orders: {
                [userId: string]: Order
            }
        } };
    },
    opinXFunds: number;
}
export interface Order {
    quantity: number;
    psuedo?: {
        isPsuedo: boolean;
        forUserId: string;
    };
}
export interface TradeMatch {
    tradeId: string;
    sellerId: string;
    buyerId: string;
    createdAt: string;
    stockType: 'YES' | 'NO';
    quantity: number;
    price: number;
}
export interface messageToQueue {
  userId: string;
  price: number;
  orderType: 'BUY' | 'SELL';
  quantity: number;
  stockType: 'YES' | 'NO';
  eventId: string;
  stockId?: string;
}
export interface messageFromPubSub {
    statusCode: number;
    data: any;
    requestId: string
}
export const payout: number = 1000;