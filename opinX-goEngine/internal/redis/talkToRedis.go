package redis

import (
	"context"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

// RedisClient is the Redis client
var redisClient *redis.Client

// Connect initializes the Redis client
func Connect(address, password string, db int) error {
	redisClient = redis.NewClient(&redis.Options{
		Addr:     address,
		Password: password,
		DB:       db,
	})
	return nil
}

// PushToQueue pushes a message to the queue
func PushToQueue(queue string, message string) error {
	return redisClient.LPush(ctx, queue, message).Err()
}

// PopFromQueue pops a message from the queue
func PopFromQueue(queue string) (string, error) {
	result, err := redisClient.BRPop(ctx, 0, queue).Result()
	if err != nil {
		return "", err
	}
	return result[1], nil
}
