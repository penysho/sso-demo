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
	"strings"
	"time"
)

func OidcAuthorize(w http.ResponseWriter, r *http.Request) {
	log.Println("OidcAuthorize")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idToken := r.Header.Get("Authorization")
	if idToken == "" {
		http.Error(w, "Missing authorization header", http.StatusUnauthorized)
		return
	}
	idToken = strings.TrimPrefix(idToken, "Bearer ")
	if idToken == "" {
		http.Error(w, "Invalid authorization header", http.StatusUnauthorized)
		return
	}

	var req model.OidcAuthorizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.ClientID == "" || req.RedirectURI == "" || req.CodeChallenge == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// if req.ClientID != config.ClientID {
	// 	http.Error(w, "Invalid client ID", http.StatusBadRequest)
	// 	return
	// }

	authCode, err := utils.GenerateAuthorizationCode()
	if err != nil {
		http.Error(w, "Failed to generate authorization code", http.StatusInternalServerError)
		return
	}

	session := model.OidcSession{
		AuthorizationCode: authCode,
		IDToken:           idToken,
		AccessToken:       "dummy_access_token",
		ClientID:          req.ClientID,
		CodeChallenge:     req.CodeChallenge,
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
	w.Header().Set("Access-Control-Allow-Methods", "POST")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
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

	var req model.OidcTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	if req.AuthorizationCode == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}
	if req.CodeVerifier == "" {
		http.Error(w, "Missing code verifier", http.StatusBadRequest)
		return
	}

	session, err := store.GetSession[model.OidcSession](req.AuthorizationCode)
	if err != nil {
		http.Error(w, "Invalid authorization code", http.StatusBadRequest)
		return
	}

	codeVerifierHash := sha256.Sum256([]byte(req.CodeVerifier))
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
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
