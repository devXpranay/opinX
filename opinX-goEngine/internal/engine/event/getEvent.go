package event

import (
	"opinX-goEngine/global"
	"opinX-goEngine/model"
)

func GetEvent(message model.MessageFromQueue) model.MessageToPubSub {
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
	return model.MessageToPubSub{
		StatusCode: 200,
		Data:       event,
		RequestId:  message.RequestId,
	}
}
