package store

import (
	"encoding/json"
	"fmt"
	"time"

	"backend/model"

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

// OidcSessionの保存・取得用ラッパー関数
func SaveOidcSession(sessionID string, session model.OidcSession) error {
	return SaveSession("oidc_session", sessionID, session, 5*time.Minute)
}

func GetOidcSession(sessionID string) (*model.OidcSession, error) {
	if len(sessionID) != 64 {
		return nil, fmt.Errorf("invalid session id format")
	}
	return GetSession[model.OidcSession]("oidc_session", sessionID)
}

func DeleteOidcSession(sessionID string) error {
	return DeleteSession("oidc_session", sessionID)
}

// TokenSessionの保存・取得用ラッパー関数
func SaveTokenSession(tokenID string, session model.TokenSession) error {
	// リフレッシュトークンは30日間有効
	return SaveSession("token_session", tokenID, session, 30*24*time.Hour)
}

func GetTokenSession(tokenID string) (model.TokenSession, error) {
	session, err := GetSession[model.TokenSession]("token_session", tokenID)
	if err != nil {
		return model.TokenSession{}, err
	}
	return *session, nil
}

func UpdateTokenSession(tokenID string, session model.TokenSession) error {
	// 既存の有効期限を保持するために現在の有効期限を取得
	ttl, err := redisClient.TTL(ctx, "token_session:"+tokenID).Result()
	if err != nil {
		// エラーが発生した場合はデフォルトの有効期限を使用
		ttl = 30 * 24 * time.Hour
	}

	return SaveSession("token_session", tokenID, session, ttl)
}
