package store

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// SaveSession はセッションをRedisに保存します
func SaveSession[T any](prefix string, sessionID string, session T, expiration time.Duration) error {
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return err
	}

	return redisClient.Set(ctx, prefix+":"+sessionID, sessionJSON, expiration).Err()
}

// GetSession はRedisからセッションを取得します
func GetSession[T any](prefix string, sessionID string) (*T, error) {
	val, err := redisClient.Get(ctx, prefix+":"+sessionID).Result()
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

// DeleteSession はRedisからセッションを削除します
func DeleteSession(prefix string, sessionID string) error {
	return redisClient.Del(ctx, prefix+":"+sessionID).Err()
}
