package model

import "time"

type TokenResponse struct {
	IDToken      string `json:"id_token"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

// TokenSession はトークン情報を長期的に保存するためのモデル
type TokenSession struct {
	UserID       string    `json:"user_id"`
	ClientID     string    `json:"client_id"`
	RefreshToken string    `json:"refresh_token"`
	CreatedAt    time.Time `json:"created_at"`
	ExpiresAt    time.Time `json:"expires_at"`
	IsRevoked    bool      `json:"is_revoked"`
}
