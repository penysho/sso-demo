package store

import (
	"context"
	"os"

	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
)

func InitRedis() error {
	redisClient = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"),
		Password: os.Getenv("REDIS_AUTH_TOKEN"),
		DB:       0,
	})

	return redisClient.Ping(ctx).Err()
}
