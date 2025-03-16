package store

import (
	"backend/model"
	"fmt"
	"time"
)

// AuthorizeSessionの保存・取得用ラッパー関数
func SaveAuthorizeSession(sessionID string, session model.AuthorizeSession) error {
	return SaveSession("authorize_session", sessionID, session, 5*time.Minute)
}

// AuthorizeSessionの取得用ラッパー関数
func GetAuthorizeSession(sessionID string) (*model.AuthorizeSession, error) {
	if len(sessionID) != 64 {
		return nil, fmt.Errorf("invalid session id format")
	}
	return GetSession[model.AuthorizeSession]("authorize_session", sessionID)
}

// AuthorizeSessionの削除用ラッパー関数
func DeleteAuthorizeSession(sessionID string) error {
	return DeleteSession("authorize_session", sessionID)
}
