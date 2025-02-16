package model

import "time"

type CreateSessionRequest struct {
	AccessToken string `json:"access_token"`
}

type CreateSessionResponse struct {
	AuthorizationCode string `json:"authorization_code"`
}

type GetSessionTokenRequest struct {
	AuthorizationCode string `json:"authorization_code"`
}

type Session struct {
	AuthorizationCode string    `json:"authorization_code"`
	AccessToken       string    `json:"access_token"`
	CreatedAt         time.Time `json:"created_at"`
}

type GetSessionTokenResponse struct {
	AccessToken string `json:"access_token"`
}
