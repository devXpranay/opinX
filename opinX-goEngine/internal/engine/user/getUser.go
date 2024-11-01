package user

import (
	"opinX-goEngine/global"
	"opinX-goEngine/model"
)

func GetUser(message model.MessageFromQueue) model.MessageToPubSub {
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		return model.MessageToPubSub{
			StatusCode: 400,
			Data:       "Invalid message data format",
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
	return model.MessageToPubSub{
		StatusCode: 200,
		Data:       user,
		RequestId:  message.RequestId,
	}
}
