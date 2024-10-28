package model

type MessageFromQueue struct {
	UserId    string `json:"userId"`
	Price     int    `json:"price"`
	OrderType string `json:"orderType"`
	Quantity  int    `json:"quantity"`
	EventId   string `json:"eventId"`
	StockId   string `json:"stockId"`
	StockType string `json:"stockType"`
}
type User struct {
	UserId string           `json:"userId"`
	Wallet Wallet           `json:"wallet"`
	Stocks map[string]Stock `json:"stocks"`
	Name   string           `json:"name"`
	Email  string           `json:"email"`
}
type Wallet struct {
	WalletId string `json:"walletId"`
	Balance  int    `json:"balance"`
	Locked   int    `json:"locked"`
}
type Stock struct {
	StockId   string `json:"stockId"`
	StockType string `json:"stockType"`
	Locked    int    `json:"locked"`
	Quantity  int    `json:"quantity"`
	Price     int    `json:"price"`
}
type Event struct {
	EventId      string                `json:"eventId"`
	Title        string                `json:"title"`
	Description  string                `json:"description"`
	StartTime    string                `json:"startTime"`
	EndTime      string                `json:"endTime"`
	Yes          int                   `json:"yes"`
	No           int                   `json:"no"`
	IsClosed     bool                  `json:"isClosed"`
	Users        []string              `json:"users"`
	TradeMatches map[string]TradeMatch `json:"tradeMatches"`
	OrderBook    OrderBook             `json:"orderBook"`
}
type TradeMatch struct {
	TradeId   string `json:"tradeId"`
	SellerId  string `json:"sellerId"`
	BuyerId   string `json:"buyerId"`
	CreatedAt string `json:"createdAt"`
	StockType string `json:"stockType"`
	Quantity  int    `json:"quantity"`
	Price     int    `json:"price"`
}
type OrderBook struct {
	YesBuyOrders  map[int][]Order `json:"yesBuyOrders"`
	YesSellOrders map[int][]Order `json:"yesSellOrders"`
	NoBuyOrders   map[int][]Order `json:"noBuyOrders"`
	NoSellOrders  map[int][]Order `json:"noSellOrders"`
}
type Order struct {
	TransacId string `json:"transacId"`
	UserId    string `json:"userId"`
	Price     int    `json:"price"`
	OrderType string `json:"orderType"`
	Quantity  int    `json:"quantity"`
	StockType string `json:"stockType"`
}
