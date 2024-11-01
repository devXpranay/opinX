package model

type Stock struct {
	Quantity int32 `json:"quantity"`
	Locked   int32 `json:"locked"`
}

type User struct {
	UserId string               `json:"userId"`
	Email  string               `json:"email"`
	Name   string               `json:"name"`
	Wallet Wallet               `json:"wallet"`
	Stocks map[string]StockType `json:"stocks"`
}

type Wallet struct {
	Balance int32 `json:"balance"`
	Locked  int32 `json:"locked"`
}

type StockType struct {
	Yes map[int32]Stock `json:"yes"`
	No  map[int32]Stock `json:"no"`
}

type Event struct {
	EventId      string                `json:"eventId"`
	Title        string                `json:"title"`
	Description  string                `json:"description"`
	Yes          int32                 `json:"yes"`
	No           int32                 `json:"no"`
	IsClosed     bool                  `json:"isClosed"`
	StartTime    string                `json:"startTime"`
	EndTime      string                `json:"endTime"`
	Users        []string              `json:"users"`
	TradeMatches map[string]TradeMatch `json:"tradeMatches"`
	OrderBook    OrderBook             `json:"orderBook"`
	OpinXFunds   int32                 `json:"opinXFunds"`
}

type TradeMatch struct {
	TradeId   string `json:"tradeId"`
	SellerId  string `json:"sellerId"`
	BuyerId   string `json:"buyerId"`
	CreatedAt string `json:"createdAt"`
	StockType string `json:"stockType"`
	Quantity  int32  `json:"quantity"`
	Price     int32  `json:"price"`
}

type OrderBook struct {
	YesSellOrders map[int32]PriceOrder `json:"yesSellOrders"`
	NoSellOrders  map[int32]PriceOrder `json:"noSellOrders"`
	YesBuyOrders  map[int32]PriceOrder `json:"yesBuyOrders"`
	NoBuyOrders   map[int32]PriceOrder `json:"noBuyOrders"`
}

type PriceOrder struct {
	Total int32            `json:"total"`
	Users map[string]Order `json:"orders"` // userId -> Order
}

type Order struct {
	Quantity int32        `json:"quantity"`
	Psuedo   *PsuedoOrder `json:"psuedo"`
}

type PsuedoOrder struct {
	IsPsuedo  bool   `json:"isPsuedo"`
	ForUserId string `json:"forUserId"`
}

type MessageFromQueue struct {
	Kind      string      `json:"kind"`
	RequestId string      `json:"requestId"`
	Data      interface{} `json:"data"`
}

type MessageToPubSub struct {
	StatusCode int32       `json:"statusCode"`
	Data       interface{} `json:"data"`
	RequestId  string      `json:"requestId"`
}
