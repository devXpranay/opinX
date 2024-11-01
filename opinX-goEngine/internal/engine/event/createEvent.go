package event

import (
	"opinX-goEngine/global"
	"opinX-goEngine/model"

	"github.com/google/uuid"
)

func CreateEvent(message model.MessageFromQueue) model.MessageToPubSub {
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid message data format",
			RequestId:  message.RequestId,
		}
	}
	title, titleExists := dataMap["title"].(string)
	description, descriptionExists := dataMap["description"].(string)
	startTime, startTimeExists := dataMap["startTime"].(string)
	endTime, endTimeExists := dataMap["endTime"].(string)
	if !titleExists || title == "" || !descriptionExists || description == "" || !startTimeExists || startTime == "" || !endTimeExists || endTime == "" {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Missing or invalid event fields: title, description, startTime, endTime are required",
			RequestId:  message.RequestId,
		}
	}
	event := model.Event{
		EventId:      uuid.New().String(),
		Title:        title,
		Description:  description,
		Yes:          0,
		No:           0,
		IsClosed:     false,
		StartTime:    startTime,
		EndTime:      endTime,
		Users:        []string{},
		TradeMatches: map[string]model.TradeMatch{},
		OrderBook: model.OrderBook{
			YesSellOrders: make(map[int32]model.PriceOrder),
			NoSellOrders:  make(map[int32]model.PriceOrder),
			YesBuyOrders:  make(map[int32]model.PriceOrder),
			NoBuyOrders:   make(map[int32]model.PriceOrder),
		},
		OpinXFunds: 0,
	}
	global.SetEvent(event.EventId, &event)
	return model.MessageToPubSub{
		StatusCode: 201,
		Data:       event,
		RequestId:  message.RequestId,
	}
}
