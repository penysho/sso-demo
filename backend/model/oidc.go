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
	AuthorizationCode   string    `json:"authorization_code"`
	IDToken             string    `json:"id_token"`
	AccessToken         string    `json:"access_token"`
	RefreshToken        string    `json:"refresh_token"`
	ClientID            string    `json:"client_id"`
	CodeChallenge       string    `json:"code_challenge"`
	CodeChallengeMethod string    `json:"code_challenge_method"`
	Scope               string    `json:"scope"`
	RedirectURI         string    `json:"redirect_uri"`
	CreatedAt           time.Time `json:"created_at"`
}

type OidcTokenResponse struct {
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
