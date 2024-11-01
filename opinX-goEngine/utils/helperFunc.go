package utils

import (
	"encoding/json"
	"opinX-goEngine/internal/engine/event"
	"opinX-goEngine/internal/engine/transact"
	"opinX-goEngine/internal/engine/user"
	model "opinX-goEngine/model"
)

func ParseQueueMessage(message string) (model.MessageFromQueue, error) {
	var parsedOrder model.MessageFromQueue

	err := json.Unmarshal([]byte(message), &parsedOrder)
	if err != nil {
		return model.MessageFromQueue{}, err
	}
	return parsedOrder, nil
}

func StringifyPubSubMessage(message model.MessageToPubSub) (string, error) {
	stringifiedMessage, err := json.Marshal(message)
	if err != nil {
		return "", err
	}
	return string(stringifiedMessage), nil
}
func Redirection(message model.MessageFromQueue) (info model.MessageToPubSub) {
	switch message.Kind {
	case "createEvent":
		info = event.CreateEvent(message)
	case "getEvent":
		info = event.GetEvent(message)
	case "getAllEvents":
		info = event.GetAllEvents(message)
	case "createUser":
		info = user.CreateUser(message)
	case "onRampMoney":
		info = user.OnRampMoney(message)
	case "getUser":
		info = user.GetUser(message)
	default:
		info = transact.ProcessOrder(message)
	}
	return info
}
