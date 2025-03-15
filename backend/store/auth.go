package store

import (
	"backend/model"
	"fmt"
	"time"
)

// SaveAuthSession 認証セッションを保存
func SaveAuthSession(sessionID string, session model.AuthSession) error {
	// 認証セッションは10分間有効
	return SaveSession("auth_session", sessionID, session, 10*time.Minute)
}

// GetAuthSession 認証セッションを取得
func GetAuthSession(sessionID string) (*model.AuthSession, error) {
	if len(sessionID) != 64 {
		return nil, fmt.Errorf("invalid session id format")
	}
	return GetSession[model.AuthSession]("auth_session", sessionID)
}

// DeleteAuthSession 認証セッションを削除
func DeleteAuthSession(sessionID string) error {
	return DeleteSession("auth_session", sessionID)
}
