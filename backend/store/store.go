package store

import (
	"encoding/json"
	"fmt"
	"time"

	"backend/model"

	"github.com/redis/go-redis/v9"
)

func SaveSession[T model.OidcSession | model.Session](sessionID string, session T) error {
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return err
	}

	return redisClient.Set(ctx, "session:"+sessionID, sessionJSON, 5*time.Minute).Err()
}

func GetSession[T model.OidcSession | model.Session](sessionID string) (*T, error) {
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

	var session T
	if err := json.Unmarshal([]byte(val), &session); err != nil {
		return nil, err
	}

	return &session, nil
}

func DeleteSession(sessionID string) error {
	return redisClient.Del(ctx, "session:"+sessionID).Err()
}
