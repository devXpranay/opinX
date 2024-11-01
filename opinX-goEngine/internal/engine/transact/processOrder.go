package transact

import (
	"opinX-goEngine/global"
	"opinX-goEngine/model"
	"time"

	"github.com/google/uuid"
)

func ProcessOrder(message model.MessageFromQueue) (info model.MessageToPubSub) {
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid message data format",
			RequestId:  message.RequestId,
		}
	}
	eventId, eventIdExists := dataMap["eventId"].(string)
	if !eventIdExists || eventId == "" {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Event ID is required",
			RequestId:  message.RequestId,
		}
	}
	event, exists := global.GetEvent(eventId)
	if !exists {
		return model.MessageToPubSub{
			StatusCode: 404,
			Data:       "Event not found",
			RequestId:  message.RequestId,
		}
	}
	userId, userIdExists := dataMap["userId"].(string)
	if !userIdExists || userId == "" {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "User ID is required",
			RequestId:  message.RequestId,
		}
	}
	user, exists := global.GetUser(userId)
	if !exists {
		return model.MessageToPubSub{
			StatusCode: 404,
			Data:       "User not found",
			RequestId:  message.RequestId,
		}
	}
	stockType, stockTypeExists := dataMap["stockType"].(string)
	if !stockTypeExists || (stockType != "YES" && stockType != "NO") {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid stock type",
			RequestId:  message.RequestId,
		}
	}
	orderType, orderTypeExists := dataMap["orderType"].(string)
	if !orderTypeExists || (orderType != "BUY" && orderType != "SELL") {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid order type",
			RequestId:  message.RequestId,
		}
	}
	price, priceExists := dataMap["price"].(float64)
	if !priceExists {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "price is required",
			RequestId:  message.RequestId,
		}
	}
	priceInt := int32(price)
	if priceInt <= 0 || priceInt > global.Payout {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid price",
			RequestId:  message.RequestId,
		}
	}
	quantity, quantityExists := dataMap["quantity"].(float64)
	if !quantityExists {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "quantity is required",
			RequestId:  message.RequestId,
		}
	}
	quantityInt := int32(quantity)
	if quantityInt <= 0 {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid quantity",
			RequestId:  message.RequestId,
		}
	}

	if orderType == "BUY" {
		if user.Wallet.Balance < quantityInt*priceInt {
			return model.MessageToPubSub{
				StatusCode: 400,
				Data:       "Insufficient balance",
				RequestId:  message.RequestId,
			}
		}
		matchingYesSellOrders, yesExists := event.OrderBook.YesSellOrders[priceInt]

		if !yesExists {
			createOrder(stockType, priceInt, quantityInt, user, event)
			createPsuedoOrder(stockType, priceInt, quantityInt, user, event)
			global.SetEvent(eventId, event)
			global.SetUser(userId, user)
			return model.MessageToPubSub{
				StatusCode: 200,
				Data:       event.OrderBook,
				RequestId:  message.RequestId,
			}
		}
		matchOrders(matchingYesSellOrders, quantityInt, priceInt, user, event)
		return model.MessageToPubSub{
			StatusCode: 200,
			Data:       event.OrderBook,
			RequestId:  message.RequestId,
		}
	}
	return info
}

func createOrder(stockType string, price int32, quantity int32, user *model.User, event *model.Event) {
	order := model.Order{
		Quantity: quantity,
		Psuedo:   nil,
	}
	if stockType == "YES" {
		if priceOrder, exists := event.OrderBook.YesBuyOrders[price]; exists {
			if userOrder, exists := priceOrder.Users[user.UserId]; exists {
				userOrder.Quantity += quantity
				priceOrder.Users[user.UserId] = userOrder
			} else {
				priceOrder.Users[user.UserId] = order
			}
			priceOrder.Total += quantity
			event.OrderBook.YesBuyOrders[price] = priceOrder
		} else {
			priceOrder := model.PriceOrder{
				Total: quantity,
				Users: map[string]model.Order{
					user.UserId: order,
				},
			}
			event.OrderBook.YesBuyOrders[price] = priceOrder
		}
	} else {
		if priceOrder, exists := event.OrderBook.NoBuyOrders[price]; exists {
			if userOrder, exists := priceOrder.Users[user.UserId]; exists {
				userOrder.Quantity += quantity
				priceOrder.Users[user.UserId] = userOrder
			} else {
				priceOrder.Users[user.UserId] = order
			}
			priceOrder.Total += quantity
			event.OrderBook.NoBuyOrders[price] = priceOrder
		} else {
			priceOrder := model.PriceOrder{
				Total: quantity,
				Users: map[string]model.Order{
					user.UserId: order,
				},
			}
			event.OrderBook.NoBuyOrders[price] = priceOrder
		}
	}
	event.OpinXFunds += price * quantity
	updateWallet(user, price, quantity)
}

func createPsuedoOrder(stockType string, price int32, quantity int32, user *model.User, event *model.Event) {
	order := model.Order{
		Quantity: quantity,
		Psuedo: &model.PsuedoOrder{
			IsPsuedo:  true,
			ForUserId: user.UserId,
		},
	}
	psuedoId := uuid.New().String()
	if stockType == "YES" {
		if priceOrder, exists := event.OrderBook.NoSellOrders[global.Payout-price]; exists {
			if userOrder, exists := priceOrder.Users[psuedoId]; exists {
				userOrder.Quantity += quantity
				priceOrder.Users[psuedoId] = userOrder
			} else {
				priceOrder.Users[psuedoId] = order
			}
			priceOrder.Total += quantity
			event.OrderBook.NoSellOrders[global.Payout-price] = priceOrder
		} else {
			priceOrder := model.PriceOrder{
				Total: quantity,
				Users: map[string]model.Order{
					psuedoId: order,
				},
			}
			event.OrderBook.NoSellOrders[global.Payout-price] = priceOrder
		}
	} else {
		if priceOrder, exists := event.OrderBook.YesSellOrders[global.Payout-price]; exists {
			if userOrder, exists := priceOrder.Users[psuedoId]; exists {
				userOrder.Quantity += quantity
				priceOrder.Users[psuedoId] = userOrder
			} else {
				priceOrder.Users[psuedoId] = order
			}
			priceOrder.Total += quantity
			event.OrderBook.YesSellOrders[global.Payout-price] = priceOrder
		} else {
			priceOrder := model.PriceOrder{
				Total: quantity,
				Users: map[string]model.Order{
					psuedoId: order,
				},
			}
			event.OrderBook.YesSellOrders[global.Payout-price] = priceOrder
		}
	}
}

func matchOrders(matchingOrders model.PriceOrder, quantity int32, price int32, user *model.User, event *model.Event) {
	if matchingOrders.Total == quantity {
		matchFullOrders(&matchingOrders, quantity, user, event)
		return
	}
	matchPartialOrder(matchingOrders, price, quantity, user, event)
}

func matchPartialOrder(matchingOrders model.PriceOrder, quantity int32, price int32, user *model.User, event *model.Event) {
	for sellerId, order := range matchingOrders.Users {
		if order.Psuedo.IsPsuedo {
			event.OpinXFunds += order.Quantity * (global.Payout - price)
			mintStocks(user.UserId, order.Psuedo.ForUserId, event, quantity, order.Quantity, "YES")
			createTradeMatch(user.UserId, order.Psuedo.ForUserId, order.Quantity, price, "YES", event)
		} else {
			transferStocks(user.UserId, order.Psuedo.ForUserId, quantity, order.Quantity, "YES", event)
			createTradeMatch(user.UserId, sellerId, order.Quantity, price, "YES", event)
		}
		updateOrder()
	}
}
func matchFullOrders(matchingOrders *model.PriceOrder, price int32, user *model.User, event *model.Event) {
	for sellerId, order := range matchingOrders.Users {
		if order.Psuedo.IsPsuedo {
			event.OpinXFunds += order.Quantity * (global.Payout - price)
			mintStocks(user.UserId, order.Psuedo.ForUserId, event, order.Quantity, order.Quantity, "YES")
			createTradeMatch(user.UserId, order.Psuedo.ForUserId, order.Quantity, price, "YES", event)
		} else {
			transferStocks(user.UserId, order.Psuedo.ForUserId, order.Quantity, order.Quantity, "YES", event)
			createTradeMatch(user.UserId, sellerId, order.Quantity, price, "YES", event)
		}
	}
	deleteUserOrder(matchingOrders, price)
}
func updateWallet(user *model.User, price int32, quantity int32) {
	user.Wallet.Balance -= price * quantity
	user.Wallet.Locked += price * quantity
}
func mintStocks(userId string, psuedoUserId string, event *model.Event, quantity int32, price int32, stockType string) {
	yesStock := model.Stock{
		Quantity: quantity,
		Locked:   0,
	}
	noStock := model.Stock{
		Quantity: quantity,
		Locked:   0,
	}
	user, _ := global.GetUser(userId)
	psuedoUser, _ := global.GetUser(psuedoUserId)
	if stockType == "YES" {
		user.Stocks[event.EventId].No[price] = noStock
		psuedoUser.Stocks[event.EventId].Yes[price] = yesStock
	} else {
		user.Stocks[event.EventId].Yes[price] = yesStock
		psuedoUser.Stocks[event.EventId].No[price] = noStock
	}
}
func transferStocks(buyerId string, sellerId string, quantity int32, price int32, stockType string, event *model.Event) {
	seller, _ := global.GetUser(sellerId)
	buyer, _ := global.GetUser(buyerId)
	if stockType == "YES" {
		sellerStock := seller.Stocks[event.EventId].Yes[price]
		buyerStock := buyer.Stocks[event.EventId].Yes[price]
		sellerStock.Locked -= quantity
		buyerStock.Quantity += quantity
	} else {
		sellerStock := seller.Stocks[event.EventId].No[price]
		buyerStock := buyer.Stocks[event.EventId].No[price]
		sellerStock.Locked -= quantity
		buyerStock.Quantity += quantity
	}
}
func createTradeMatch(buyerId string, sellerId string, quantity int32, price int32, stockType string, event *model.Event) {
	tradeMatch := model.TradeMatch{
		TradeId:   uuid.New().String(),
		SellerId:  sellerId,
		BuyerId:   buyerId,
		CreatedAt: time.Now().String(),
		StockType: stockType,
		Quantity:  quantity,
		Price:     price,
	}
	event.TradeMatches[tradeMatch.TradeId] = tradeMatch
}
func deleteUserOrder(matchingOrders *model.PriceOrder, price int32) {
	delete(matchingOrders.Users, string(price))
}
func updateOrder() {

}
