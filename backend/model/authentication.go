package model

import (
	"time"
)

// AuthSession IdP認証セッション
type AuthSession struct {
	SessionID  string    `json:"session_id"`
	UserID     string    `json:"user_id"`
	Email      string    `json:"email"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
	IsLoggedIn bool      `json:"is_logged_in"`
}

// LoginRequest ログインリクエスト
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse ログインレスポンス
type LoginResponse struct {
	SessionID string `json:"session_id"`
	ExpiresIn int    `json:"expires_in"`
}
