package main

import (
	"fmt"
	"opinX-goEngine/internal/pubsub"
	"opinX-goEngine/internal/redis"
	"opinX-goEngine/utils"
)

func main() {
	startEngine()
}

func startEngine() {
	redis.Connect()
	for {
		message, err := redis.PopFromQueue("unProcessedQueue")
		if err != nil {
			fmt.Println("Error while popping from queues: ", err)
		}
		info := utils.Redirection(message)
		m, err := utils.StringifyPubSubMessage(info)
		if err != nil {
			fmt.Println("Error while stringifying: ", err)
		}
		pubsub.Publish(redis.Rdb, "pubsub", m)
	}
}
