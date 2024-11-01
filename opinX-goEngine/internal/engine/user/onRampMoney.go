package user

import (
	"opinX-goEngine/global"
	"opinX-goEngine/model"
)

func OnRampMoney(message model.MessageFromQueue) (info model.MessageToPubSub) {
	dataMap, ok := message.Data.(map[string]interface{})
	if !ok {
		return model.MessageToPubSub{
			StatusCode: 500,
			Data:       "Invalid data format",
			RequestId:  message.RequestId,
		}
	}
	amountVal, amountExists := dataMap["amount"]
	userIdVal, userIdExists := dataMap["userId"]
	if !amountExists || !userIdExists {
		return model.MessageToPubSub{
			StatusCode: 500,
			Data:       "Missing required fields: 'amount' or 'userId'",
			RequestId:  message.RequestId,
		}
	}
	userId, ok := userIdVal.(string)
	if !ok || userId == "" {
		return model.MessageToPubSub{
			StatusCode: 500,
			Data:       "Invalid user ID",
			RequestId:  message.RequestId,
		}
	}
	amount := int32(amountVal.(float64))
	if !ok || amount <= 0 {
		return model.MessageToPubSub{
			StatusCode: 500,
			Data:       "Amount should be a positive number",
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
	user.Wallet.Balance += amount

	return model.MessageToPubSub{
		StatusCode: 201,
		Data:       user,
		RequestId:  message.RequestId,
	}
}
