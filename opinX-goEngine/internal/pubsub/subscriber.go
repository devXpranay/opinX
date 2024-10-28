package pubsub

import (
	"github.com/redis/go-redis/v9"
)

// Subscribe listens for messages on a channel
func Subscribe(client *redis.Client, channel string) {
	pubsub := client.Subscribe(ctx, channel)
	defer pubsub.Close()

	for {
		msg, err := pubsub.ReceiveMessage(ctx)
		if err != nil {
			break
		}
		// Handle the message (e.g., process the order)
		handleMessage(msg.Payload)
	}
}

func handleMessage(payload string) {
	// Logic to process the incoming message
	// For example, process the order
}
