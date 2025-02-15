package model

import "time"

type OidcAuthorizeRequest struct {
	ClientID      string `json:"client_id"`
	RedirectURI   string `json:"redirect_uri"`
	CodeChallenge string `json:"code_challenge"`
}

type OidcAuthorizeResponse struct {
	AuthorizationCode string `json:"authorization_code"`
}

type OidcSession struct {
	AuthorizationCode string    `json:"authorization_code"`
	IDToken           string    `json:"id_token"`
	AccessToken       string    `json:"access_token"`
	ClientID          string    `json:"client_id"`
	CodeChallenge     string    `json:"code_challenge"`
	CreatedAt         time.Time `json:"created_at"`
}

type OidcTokenResponse struct {
	IDToken     string `json:"id_token"`
	AccessToken string `json:"access_token"`
}
