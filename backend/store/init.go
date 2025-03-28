package store

import (
	"context"
	"crypto/tls"
	"os"

	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
)

func InitRedis() error {
	tlsConfig := &tls.Config{}
	if os.Getenv("REDIS_AUTH_TOKEN") == "" {
		tlsConfig = nil
	}
	redisClient = redis.NewClient(&redis.Options{
		Addr:      os.Getenv("REDIS_ADDR"),
		Password:  os.Getenv("REDIS_AUTH_TOKEN"),
		DB:        0,
		TLSConfig: tlsConfig,
	})

	return redisClient.Ping(ctx).Err()
}
