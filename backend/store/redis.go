package store

import (
	"context"
	"encoding/json"
	"os"
	"time"

	"backend/model"

	"github.com/redis/go-redis/v9"
)

var (
	redisClient *redis.Client
	ctx         = context.Background()
)

func InitRedis() error {
	redisClient = redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})

	return redisClient.Ping(ctx).Err()
}

func SaveSession(sessionID string, session model.Session) error {
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return err
	}

	return redisClient.Set(ctx, "session:"+sessionID, sessionJSON, 24*time.Hour).Err()
}
