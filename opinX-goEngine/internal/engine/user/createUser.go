package user

import (
	"opinX-goEngine/global"
	"opinX-goEngine/model"

	"github.com/google/uuid"
)

func CreateUser(message model.MessageFromQueue) model.MessageToPubSub {
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid message data format",
			RequestId:  message.RequestId,
		}
	}
	email, emailExists := dataMap["email"].(string)
	if !emailExists || email == "" {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Email is required",
			RequestId:  message.RequestId,
		}
	}
	name, nameExists := dataMap["name"].(string)
	if !nameExists || name == "" {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Name is required",
			RequestId:  message.RequestId,
		}
	}
	user := model.User{
		UserId: uuid.New().String(),
		Email:  email,
		Name:   name,
		Wallet: model.Wallet{
			Balance: 0,
			Locked:  0,
		},
		Stocks: map[string]model.StockType{},
	}
	global.SetUser(user.UserId, &user)
	return model.MessageToPubSub{
		StatusCode: 201,
		Data:       user,
		RequestId:  message.RequestId,
	}
}
