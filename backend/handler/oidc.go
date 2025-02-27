package handler

import (
	"backend/config"
	"backend/model"
	"backend/store"
	"backend/utils"
	"crypto/sha256"
	"encoding/hex"
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
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	authorizationHeader := r.Header.Get("Authorization")
	if authorizationHeader == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}
	idToken := strings.TrimPrefix(authorizationHeader, "Bearer ")
	if idToken == "" {
		http.Error(w, "Invalid authorization header", http.StatusUnauthorized)
		return
	}

	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	codeChallenge := r.URL.Query().Get("code_challenge")

	if clientID == "" || redirectURI == "" || codeChallenge == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	if !slices.Contains(config.ClientIDs, clientID) {
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	authCode, err := utils.GenerateAuthorizationCode()
	if err != nil {
		http.Error(w, "Failed to generate authorization code", http.StatusInternalServerError)
		return
	}

	session := model.OidcSession{
		AuthorizationCode: authCode,
		IDToken:           idToken,
		AccessToken:       "dummy_access_token",
		ClientID:          clientID,
		CodeChallenge:     codeChallenge,
		CreatedAt:         time.Now(),
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
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
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
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	authCode := r.PostForm.Get("code")
	codeVerifier := r.PostForm.Get("code_verifier")

	if authCode == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}
	if codeVerifier == "" {
		http.Error(w, "Missing code verifier", http.StatusBadRequest)
		return
	}

	session, err := store.GetSession[model.OidcSession](authCode)
	if err != nil {
		http.Error(w, "Invalid authorization code", http.StatusBadRequest)
		return
	}
	defer func() {
		if err := store.DeleteSession(authCode); err != nil {
			log.Printf("Failed to delete authorization code: %v", err)
		}
	}()

	codeVerifierHash := sha256.Sum256([]byte(codeVerifier))
	codeVerifierHashString := hex.EncodeToString(codeVerifierHash[:])
	if codeVerifierHashString != session.CodeChallenge {
		http.Error(w, "Invalid code verifier", http.StatusBadRequest)
		return
	}

	resp := model.OidcTokenResponse{
		IDToken:     session.IDToken,
		AccessToken: session.AccessToken,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", config.AllowedOrigin)
	w.Header().Set("Access-Control-Allow-Methods", "POST")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
