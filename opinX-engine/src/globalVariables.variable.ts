export interface User {
    userId: string;
    email: string;
    name: string;
    wallet: Wallet;
    stocks: Map<Stock['eventId'], Stock[]>;
}

export interface Wallet {
    walletId: string;
    balance: number;
    locked: number;
}

export interface Stock {
    stockType: 'YES' | 'NO';
    stockId: string;
    quantity: number;
    price: number;
    locked: number;
    eventId: string;
    userId: string;
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
    tradeMatches: Map<TradeMatch['tradeId'], TradeMatch>;
    orderBook: {
        yesSellOrders: Map<Order['price'], Order[]>;
        noSellOrders: Map<Order['price'], Order[]>;
        yesBuyOrders: Map<Order['price'], Order[]>;
        noBuyOrders: Map<Order['price'], Order[]>;
    },
    opinXFunds: number;
}

export interface Order {
    transacId: string;
    price: number;
    quantity: number;
    userId: string;
    orderType: 'BUY' | 'SELL';
    stockType: 'YES' | 'NO';
    stockId?: Stock['stockId'];
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

export interface processedMessage {
  eventId: Event['eventId']
  orderBook: Event['orderBook']
  success: boolean
}

export const payout: number = 1000;