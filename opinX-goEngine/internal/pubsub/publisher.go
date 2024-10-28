package pubsub

import (
	"context"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

// Publish sends a message to a specified channel
func Publish(client *redis.Client, channel string, message string) error {
	return client.Publish(ctx, channel, message).Err()
}
