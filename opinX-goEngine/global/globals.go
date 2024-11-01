package global

import (
	"opinX-goEngine/model"
)

var Users = make(map[string]*model.User)
var Events = make(map[string]*model.Event)
var Payout int32 = 1000

func SetEvent(eventId string, event *model.Event) {
	Events[eventId] = event
}
func SetUser(userId string, user *model.User) {
	Users[userId] = user
}

func GetEvent(eventId string) (*model.Event, bool) {
	event, exists := Events[eventId]
	return event, exists
}

func GetUser(userId string) (*model.User, bool) {
	user, exists := Users[userId]
	return user, exists
}
