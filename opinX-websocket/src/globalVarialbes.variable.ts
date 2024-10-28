export interface User {
    userId: string;
    email: string;
    name: string;
    wallet: Wallet;
    stocks: Stock[];
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
    users: User[];
    tradeMatches: TradeMatch[];
    orderBook: {
        yesSellOrders: Order[];
        noSellOrders: Order[];
        yesBuyOrders: Order[];
        noBuyOrders: Order[];
    }
}

export interface Order {
    transacId: string;
    price: number;
    quantity: number;
    userId: string;
    orderType: 'BUY' | 'SELL';
    stockType: 'YES' | 'NO';
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




export const users: User[] = [
    {
        userId: "1",
        email: "user1@example.com",
        name: "User One",
        wallet: {
          walletId: "wallet1",
          balance: 50000,
          locked: 0,
        },
        stocks: [
          {
            stockType: 'YES',
            stockId: "stock1",
            quantity: 10,
            price: 500,
            locked: 0,
            eventId: "event123",
          },
          {
            stockType: 'NO',
            stockId: "stock2",
            quantity: 5,
            price: 400,
            locked: 0,
            eventId: "event123",
          },
        ],
      },
      {
        userId: "2",
        email: "user2@example.com",
        name: "User Two",
        wallet: {
          walletId: "wallet2",
          balance: 100000,
          locked: 0,
        },
        stocks: [],
      }
]
export const events: Event[] = [
    {
        eventId: "event123",
        title: "Sample Prediction Event",
        description: "Predict the outcome of an event with YES/NO stocks.",
        yes: 0,
        no: 0,
        isClosed: false,
        startTime: new Date().toISOString(),
        endTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
        users: [
          {
            userId: "1",
            email: "user1@example.com",
            name: "User One",
            wallet: {
              walletId: "wallet1",
              balance: 50000,
              locked: 0,
            },
            stocks: [
              {
                stockType: 'YES',
                stockId: "stock1",
                quantity: 10,
                price: 500,
                locked: 0,
                eventId: "event123",
              },
              {
                stockType: 'NO',
                stockId: "stock2",
                quantity: 5,
                price: 400,
                locked: 0,
                eventId: "event123",
              },
            ],
          },
          {
            userId: "2",
            email: "user2@example.com",
            name: "User Two",
            wallet: {
              walletId: "wallet2",
              balance: 100000,
              locked: 0,
            },
            stocks: [],
          },
        ],
        tradeMatches: [],
        orderBook: {
          yesSellOrders: [],
          noSellOrders: [],
          yesBuyOrders: [],
          noBuyOrders: [],
        },
      }
]  


export const payout: number = 1000;

export interface messageToQueue {
    userId: string;
    price: number;
    orderType: 'BUY' | 'SELL';
    quantity: number;
    stockType: 'YES' | 'NO';
    eventId: string;
    stockId?: string;
    orderBook: {
      yesSellOrders: Order[];
      noSellOrders: Order[];
      yesBuyOrders: Order[];
      noBuyOrders: Order[];
    };
    isSucess?: boolean;
}
