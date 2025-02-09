package model

import "time"

type SessionRequest struct {
	AccessToken string `json:"access_token"`
}

type SessionResponse struct {
	SessionID string `json:"session_id"`
}

type Session struct {
	AccessToken string    `json:"access_token"`
	CreatedAt   time.Time `json:"created_at"`
}

type SessionTokenResponse struct {
	AccessToken string `json:"access_token"`
}
