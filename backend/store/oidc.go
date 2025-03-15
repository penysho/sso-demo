package store

import (
	"backend/model"
	"fmt"
	"time"
)

// OidcSessionの保存・取得用ラッパー関数
func SaveOidcSession(sessionID string, session model.OidcSession) error {
	return SaveSession("oidc_session", sessionID, session, 5*time.Minute)
}

// OidcSessionの取得用ラッパー関数
func GetOidcSession(sessionID string) (*model.OidcSession, error) {
	if len(sessionID) != 64 {
		return nil, fmt.Errorf("invalid session id format")
	}
	return GetSession[model.OidcSession]("oidc_session", sessionID)
}

// OidcSessionの削除用ラッパー関数
func DeleteOidcSession(sessionID string) error {
	return DeleteSession("oidc_session", sessionID)
}

// TokenSessionの保存・取得用ラッパー関数
func SaveTokenSession(tokenID string, session model.TokenSession) error {
	// リフレッシュトークンは30日間有効
	return SaveSession("token_session", tokenID, session, 30*24*time.Hour)
}

// TokenSessionの取得用ラッパー関数
func GetTokenSession(tokenID string) (model.TokenSession, error) {
	session, err := GetSession[model.TokenSession]("token_session", tokenID)
	if err != nil {
		return model.TokenSession{}, err
	}
	return *session, nil
}

// TokenSessionの更新用ラッパー関数
func UpdateTokenSession(tokenID string, session model.TokenSession) error {
	// 既存の有効期限を保持するために現在の有効期限を取得
	ttl, err := redisClient.TTL(ctx, "token_session:"+tokenID).Result()
	if err != nil {
		// エラーが発生した場合はデフォルトの有効期限を使用
		ttl = 30 * 24 * time.Hour
	}

	return SaveSession("token_session", tokenID, session, ttl)
}
