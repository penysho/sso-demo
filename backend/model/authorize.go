package model

import "time"

type AuthorizeResponse struct {
	AuthorizationCode string `json:"authorization_code"`
}

type AuthorizeSession struct {
	AuthorizationCode   string    `json:"authorization_code"`
	UserID              string    `json:"user_id"`
	Email               string    `json:"email"`
	ClientID            string    `json:"client_id"`
	CodeChallenge       string    `json:"code_challenge"`
	CodeChallengeMethod string    `json:"code_challenge_method"`
	Scope               string    `json:"scope"`
	RedirectURI         string    `json:"redirect_uri"`
	CreatedAt           time.Time `json:"created_at"`
}
