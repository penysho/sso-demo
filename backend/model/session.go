package model

import "time"

type SessionRequest struct {
	AccessToken string `json:"access_token"`
}

type SessionResponse struct {
	AuthorizationCode string `json:"authorization_code"`
}

type Session struct {
	AuthorizationCode string    `json:"authorization_code"`
	AccessToken       string    `json:"access_token"`
	CreatedAt         time.Time `json:"created_at"`
}

type SessionTokenResponse struct {
	AccessToken string `json:"access_token"`
}
