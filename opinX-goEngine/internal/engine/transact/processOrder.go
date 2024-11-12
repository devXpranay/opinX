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
	if stockType == "YES" {
		if orderType == "BUY" {
			if user.Wallet.Balance < quantityInt*priceInt {
				return model.MessageToPubSub{
					StatusCode: 400,
					Data:       "Insufficient balance",
					RequestId:  message.RequestId,
				}
			}
			// only for YES
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
			matchOrders(&matchingYesSellOrders, quantityInt, priceInt, user, event, stockType)
			return model.MessageToPubSub{
				StatusCode: 200,
				Data:       event.OrderBook,
				RequestId:  message.RequestId,
			}
		}
		// SELL logic for YES
	}
	if orderType == "BUY" {
		if user.Wallet.Balance < quantityInt*priceInt {
			return model.MessageToPubSub{
				StatusCode: 400,
				Data:       "Insufficient balance",
				RequestId:  message.RequestId,
			}
		}
		// only for NO
		matchingNoSellOrders, noExists := event.OrderBook.NoSellOrders[priceInt]

		if !noExists {
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
		matchOrders(&matchingNoSellOrders, quantityInt, priceInt, user, event, stockType)
		return model.MessageToPubSub{
			StatusCode: 200,
			Data:       event.OrderBook,
			RequestId:  message.RequestId,
		}
	}
	// SELL logic for NO

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
func matchOrders(matchingOrders *model.PriceOrder, quantity int32, price int32, user *model.User, event *model.Event, stockType string) {
	if matchingOrders.Total == quantity {
		matchFullOrders(matchingOrders, quantity, user, event, stockType)
		return
	}
	matchPartialOrders(matchingOrders, price, quantity, user, event, stockType)
}
func matchPartialOrders(matchingOrders *model.PriceOrder, quantity int32, price int32, user *model.User, event *model.Event, stockType string) {
	remainingQuantity := quantity
	if matchingOrders.Total < quantity {
		matchFullOrders(matchingOrders, matchingOrders.Total, user, event, stockType)
		remainingQuantity -= matchingOrders.Total
		if stockType == "YES" {
			createOrder("YES", price, remainingQuantity, user, event)
			createPsuedoOrder("YES", price, remainingQuantity, user, event)
		} else {
			createOrder("NO", price, remainingQuantity, user, event)
			createPsuedoOrder("NO", price, remainingQuantity, user, event)
		}
		return
	}
	for sellerId, order := range matchingOrders.Users {
		if remainingQuantity <= 0 {
			break
		}
		if order.Psuedo.IsPsuedo {
			if order.Quantity > remainingQuantity {
				event.OpinXFunds += remainingQuantity * (global.Payout - price)
				if stockType == "YES" {
					mintStocks(user.UserId, order.Psuedo.ForUserId, event, remainingQuantity, price, "YES")
					createTradeMatch(user.UserId, order.Psuedo.ForUserId, remainingQuantity, price, "YES", event)
				} else {
					mintStocks(order.Psuedo.ForUserId, user.UserId, event, remainingQuantity, price, "NO")
					createTradeMatch(user.UserId, order.Psuedo.ForUserId, remainingQuantity, price, "NO", event)
				}
				order.Quantity -= remainingQuantity
				remainingQuantity = 0
			} else {
				event.OpinXFunds += order.Quantity * (global.Payout - price)
				if stockType == "YES" {
					mintStocks(user.UserId, order.Psuedo.ForUserId, event, order.Quantity, price, "YES")
					createTradeMatch(user.UserId, order.Psuedo.ForUserId, order.Quantity, price, "YES", event)
				} else {
					mintStocks(order.Psuedo.ForUserId, user.UserId, event, order.Quantity, price, "NO")
					createTradeMatch(user.UserId, order.Psuedo.ForUserId, order.Quantity, price, "NO", event)
				}
				remainingQuantity -= order.Quantity
			}
		} else {
			if order.Quantity > remainingQuantity {
				if stockType == "YES" {
					transferStocks(user.UserId, sellerId, remainingQuantity, price, "YES", event)
					createTradeMatch(user.UserId, sellerId, remainingQuantity, price, "YES", event)
				} else {
					transferStocks(sellerId, user.UserId, remainingQuantity, price, "NO", event)
					createTradeMatch(user.UserId, sellerId, remainingQuantity, price, "NO", event)
				}
				order.Quantity -= remainingQuantity
				remainingQuantity = 0
			} else {
				if stockType == "YES" {
					transferStocks(user.UserId, sellerId, order.Quantity, price, "YES", event)
					createTradeMatch(user.UserId, sellerId, order.Quantity, price, "YES", event)
				} else {
					transferStocks(sellerId, user.UserId, order.Quantity, price, "NO", event)
					createTradeMatch(user.UserId, sellerId, order.Quantity, price, "NO", event)
				}
				remainingQuantity -= order.Quantity
			}
		}
		event.OrderBook.YesSellOrders[price].Users[sellerId] = order
	}
}
func matchFullOrders(matchingOrders *model.PriceOrder, price int32, user *model.User, event *model.Event, stockType string) {
	for sellerId, order := range matchingOrders.Users {
		if order.Psuedo.IsPsuedo {
			event.OpinXFunds += order.Quantity * (global.Payout - price)
			if stockType == "YES" {
				mintStocks(user.UserId, order.Psuedo.ForUserId, event, order.Quantity, order.Quantity, "YES")
			} else {
				mintStocks(order.Psuedo.ForUserId, user.UserId, event, order.Quantity, order.Quantity, "NO")
			}
		} else {
			if stockType == "YES" {
				transferStocks(user.UserId, sellerId, order.Quantity, order.Quantity, "YES", event)
			} else {
				transferStocks(sellerId, user.UserId, order.Quantity, order.Quantity, "NO", event)
			}
		}
		if stockType == "YES" {
			createTradeMatch(user.UserId, order.Psuedo.ForUserId, order.Quantity, price, "YES", event)
		} else {
			createTradeMatch(user.UserId, sellerId, order.Quantity, price, "NO", event)
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
	user.Stocks[event.EventId] = model.StockType{
		Yes: make(map[int32]model.Stock),
		No:  make(map[int32]model.Stock),
	}
	psuedoUser.Stocks[event.EventId] = model.StockType{
		Yes: make(map[int32]model.Stock),
		No:  make(map[int32]model.Stock),
	}
	if stockType == "YES" {
		noStocks, noExists := user.Stocks[event.EventId].No[price]
		yesStocks, yesExists := psuedoUser.Stocks[event.EventId].Yes[price]
		if !noExists {
			user.Stocks[event.EventId].No[price] = noStock
		} else {
			noStocks.Quantity += quantity
			user.Stocks[event.EventId].No[price] = noStocks
		}
		if !yesExists {
			psuedoUser.Stocks[event.EventId].Yes[price] = yesStock
		} else {
			yesStocks.Quantity += quantity
			psuedoUser.Stocks[event.EventId].Yes[price] = yesStocks
		}
		return
	}
	yesStocks, yesExists := user.Stocks[event.EventId].Yes[price]
	noStocks, noExists := psuedoUser.Stocks[event.EventId].No[price]
	if !yesExists {
		user.Stocks[event.EventId].Yes[price] = yesStock
	} else {
		yesStocks.Quantity += quantity
		user.Stocks[event.EventId].Yes[price] = yesStocks
	}
	if !noExists {
		psuedoUser.Stocks[event.EventId].No[price] = noStock
	} else {
		noStocks.Quantity += quantity
		psuedoUser.Stocks[event.EventId].No[price] = noStocks
	}
}
func transferStocks(buyerId string, sellerId string, quantity int32, price int32, stockType string, event *model.Event) {
	seller, _ := global.GetUser(sellerId)
	buyer, _ := global.GetUser(buyerId)
	if buyer.Stocks == nil {
		buyer.Stocks[event.EventId] = model.StockType{
			Yes: make(map[int32]model.Stock),
			No:  make(map[int32]model.Stock),
		}
	}
	if seller.Stocks == nil {
		seller.Stocks[event.EventId] = model.StockType{
			Yes: make(map[int32]model.Stock),
			No:  make(map[int32]model.Stock),
		}
	}
	if stockType == "YES" {
		sellerStock := seller.Stocks[event.EventId].Yes[price]
		buyerStock, exists := buyer.Stocks[event.EventId].Yes[price]
		if !exists {
			buyer.Stocks[event.EventId].Yes[price] = model.Stock{
				Quantity: quantity,
				Locked:   0,
			}
		} else {
			buyerStock.Quantity += quantity
		}
		sellerStock.Locked -= quantity
		if sellerStock.Locked == 0 {
			delete(seller.Stocks[event.EventId].Yes, price)
		}
		return
	}
	sellerStock := seller.Stocks[event.EventId].No[price]
	buyerStock, exists := buyer.Stocks[event.EventId].No[price]
	if !exists {
		buyer.Stocks[event.EventId].No[price] = model.Stock{
			Quantity: quantity,
			Locked:   0,
		}
	} else {
		buyerStock.Quantity += quantity
	}
	sellerStock.Locked -= quantity
	if sellerStock.Locked == 0 {
		delete(seller.Stocks[event.EventId].No, price)
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
