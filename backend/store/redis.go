package store

import (
	"context"
	"encoding/json"
	"fmt"
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

func GetSession(sessionID string) (*model.Session, error) {
	if len(sessionID) != 64 {
		return nil, fmt.Errorf("invalid session id format")
	}

	val, err := redisClient.Get(ctx, "session:"+sessionID).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("session not found")
	}
	if err != nil {
		return nil, err
	}

	var session model.Session
	if err := json.Unmarshal([]byte(val), &session); err != nil {
		return nil, err
	}

	return &session, nil
}
