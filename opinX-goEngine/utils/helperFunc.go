package utils

import (
	"encoding/json"
	redis "opinX-goEngine/internal/redis"
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

func ParseDBUsers(value string) (map[string]model.User, error) {
	var users map[string]model.User
	err := json.Unmarshal([]byte(value), &users)
	if err != nil {
		return map[string]model.User{}, err
	}
	return users, nil
}

func ParseDBEvents(value string) (map[string]model.Event, error) {
	var events map[string]model.Event
	err := json.Unmarshal([]byte(value), &events)
	if err != nil {
		return map[string]model.Event{}, err
	}
	return events, nil
}

func GetFromDB(key string) (string, error) {
	value, err := redis.GET(key)
	if err != nil {
		return "Couldn't get from the database", err
	}
	return value, nil
}

func FindUserById(userId string, users map[string]model.User) (model.User, error) {
	user, ok := users[userId]
	if !ok {
		return model.User{}, nil
	}
	return user, nil
}

func FindEventById(eventId string, events map[string]model.Event) (model.Event, error) {
	event, ok := events[eventId]
	if !ok {
		return model.Event{}, nil
	}
	return event, nil
}
