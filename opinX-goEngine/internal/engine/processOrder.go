package engine

import (
	redis "opinX-goEngine/internal/redis"
	model "opinX-goEngine/model"
	utils "opinX-goEngine/utils"
	"sync"
)

// MessageFromQueue defines the structure for messages retrieved from the queue.

var mu sync.Mutex
var events map[string]model.Event
var users map[string]model.User

func ProcessOrder(queueName string) (string, error) {
	headElement, err := redis.RPop(queueName)
	if err != nil {
		return "Couldn't pop from the queue", err
	}

	parsedQueueMessage, err := utils.ParseQueueMessage(headElement)
	if err != nil {
		return "Couldn't parse the popped element", err
	}
	mu.Lock()
	defer mu.Unlock()
	user, err := utils.FindUserById(parsedQueueMessage.UserId, users)
	if err != nil {
		return "Couldn't find the user", err
	}
	event, err := utils.FindEventById(parsedQueueMessage.EventId, events)
	if err != nil {
		return "Couldn't find the event", err
	}
	userId := parsedQueueMessage.UserId
	eventId := parsedQueueMessage.EventId
	price := parsedQueueMessage.Price
	orderType := parsedQueueMessage.OrderType
	quantity := parsedQueueMessage.Quantity
	stockType := parsedQueueMessage.StockType

	if orderType == "BUY" {
		lockedFunds := price * quantity
		user.Wallet.Locked = lockedFunds
		user.Wallet.Balance -= lockedFunds

		transacId := createId("transac")
		var buyOrder = model.Order{
			TransacId: transacId,
			Price:     price,
			Quantity:  quantity,
			UserId:    userId,
			OrderType: orderType,
			StockType: stockType,
		}
		if stockType == "YES" {
			event.OrderBook.YesBuyOrders[price] = append(event.OrderBook.YesBuyOrders[price], buyOrder)
		} else {
			event.OrderBook.NoBuyOrders[price] = append(event.OrderBook.NoBuyOrders[price], buyOrder)
		}
	} else {
		stockId := parsedQueueMessage.StockId
	}

	return "hello", nil
}
