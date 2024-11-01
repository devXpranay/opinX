package event

import (
	"opinX-goEngine/global"
	"opinX-goEngine/model"
)

func GetAllEvents(message model.MessageFromQueue) model.MessageToPubSub {
	if len(global.Events) == 0 {
		return model.MessageToPubSub{
			StatusCode: 404,
			Data:       "No events found",
			RequestId:  message.RequestId,
		}
	}
	return model.MessageToPubSub{
		StatusCode: 200,
		Data:       global.Events,
		RequestId:  message.RequestId,
	}
}
