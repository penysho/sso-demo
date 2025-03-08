package handler

import (
	"backend/config"
	"backend/model"
	"backend/store"
	"backend/utils"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"slices"
	"strings"
	"time"
)

func OidcAuthorize(w http.ResponseWriter, r *http.Request) {
	log.Println("OidcAuthorize")

	if r.Method != http.MethodGet {
		log.Printf("Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	authorizationHeader := r.Header.Get("Authorization")
	if authorizationHeader == "" {
		log.Println("Missing authorization header")
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}
	idToken := strings.TrimPrefix(authorizationHeader, "Bearer ")
	if idToken == "" {
		log.Println("Invalid authorization header")
		http.Error(w, "Invalid authorization header", http.StatusUnauthorized)
		return
	}

	accessToken := r.Header.Get("X-Access-Token")
	if accessToken == "" {
		log.Println("Missing access token")
		http.Error(w, "Missing access token", http.StatusUnauthorized)
		return
	}
	refreshToken := r.Header.Get("X-Refresh-Token")
	if refreshToken == "" {
		log.Println("Missing refresh token")
		http.Error(w, "Missing refresh token", http.StatusUnauthorized)
		return
	}

	responseType := r.URL.Query().Get("response_type")
	if responseType != "code" {
		log.Printf("Invalid response type: %s", responseType)
		http.Error(w, "Invalid response type", http.StatusBadRequest)
		return
	}

	scope := r.URL.Query().Get("scope")
	scopes := strings.Fields(scope)
	if !slices.Contains(scopes, "openid") {
		log.Printf("Missing openid scope. Provided scopes: %v", scopes)
		http.Error(w, "Missing openid scope", http.StatusBadRequest)
		return
	}

	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	codeChallenge := r.URL.Query().Get("code_challenge")
	codeChallengeMethod := r.URL.Query().Get("code_challenge_method")

	if clientID == "" || redirectURI == "" || codeChallenge == "" {
		log.Printf("Missing required fields: client_id=%s, redirect_uri=%s, code_challenge=%s",
			clientID, redirectURI, codeChallenge)
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	if !slices.Contains(config.ClientIDs, clientID) {
		log.Printf("Invalid client ID: %s", clientID)
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	authCode, err := utils.GenerateAuthorizationCode()
	if err != nil {
		http.Error(w, "Failed to generate authorization code", http.StatusInternalServerError)
		return
	}

	session := model.OidcSession{
		AuthorizationCode:   authCode,
		IDToken:             idToken,
		AccessToken:         accessToken,
		RefreshToken:        refreshToken,
		ClientID:            clientID,
		CodeChallenge:       codeChallenge,
		CodeChallengeMethod: codeChallengeMethod,
		Scope:               scope,
		CreatedAt:           time.Now(),
	}

	if err := store.SaveSession(authCode, session); err != nil {
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	resp := model.OidcAuthorizeResponse{
		AuthorizationCode: authCode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", config.AllowedOrigin)
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Access-Token, X-Refresh-Token")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func OidcToken(w http.ResponseWriter, r *http.Request) {
	log.Println("OidcToken")

	if r.Method != http.MethodPost {
		log.Printf("Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseForm(); err != nil {
		log.Printf("Invalid form data: %v", err)
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	authCode := r.PostForm.Get("code")
	codeVerifier := r.PostForm.Get("code_verifier")

	if authCode == "" {
		log.Println("Missing authorization code")
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}
	if codeVerifier == "" {
		log.Println("Missing code verifier")
		http.Error(w, "Missing code verifier", http.StatusBadRequest)
		return
	}

	session, err := store.GetSession[model.OidcSession](authCode)
	if err != nil {
		log.Printf("Invalid authorization code: %v", err)
		http.Error(w, "Invalid authorization code", http.StatusBadRequest)
		return
	}
	defer func() {
		if err := store.DeleteSession(authCode); err != nil {
			log.Printf("Failed to delete authorization code: %v", err)
		}
	}()

	codeVerifierHash := sha256.Sum256([]byte(codeVerifier))
	codeVerifierHashString := base64.RawURLEncoding.EncodeToString(codeVerifierHash[:])
	if codeVerifierHashString != session.CodeChallenge {
		http.Error(w, "Invalid code verifier", http.StatusBadRequest)
		return
	}

	resp := model.OidcTokenResponse{
		IDToken:      session.IDToken,
		AccessToken:  session.AccessToken,
		RefreshToken: session.RefreshToken,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", config.AllowedOrigin)
	w.Header().Set("Access-Control-Allow-Methods", "POST")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
