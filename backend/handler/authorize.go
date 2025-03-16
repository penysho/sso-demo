package handler

import (
	"backend/config"
	"backend/model"
	"backend/store"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"slices"
	"strings"
	"time"
)

// Authorize は認可コードを発行するハンドラ関数
func Authorize(w http.ResponseWriter, r *http.Request) {
	log.Println("Authorize")

	if r.Method != http.MethodGet {
		log.Printf("Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 認証セッションIDを取得
	authSessionID := r.Header.Get("X-Auth-Session")
	if authSessionID == "" {
		log.Println("Missing auth session ID")
		http.Error(w, "Missing auth session ID", http.StatusUnauthorized)
		return
	}

	// 認証セッションの有効性確認
	authSession, err := store.GetAuthSession(authSessionID)
	if err != nil {
		log.Printf("Invalid auth session: %v", err)
		http.Error(w, "Invalid auth session", http.StatusUnauthorized)
		return
	}

	// 有効期限切れ確認
	if time.Now().After(authSession.ExpiresAt) {
		log.Println("Auth session expired")
		http.Error(w, "Auth session expired", http.StatusUnauthorized)
		return
	}

	// ログイン状態確認
	if !authSession.IsLoggedIn {
		log.Println("User not logged in")
		http.Error(w, "User not logged in", http.StatusUnauthorized)
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

	// 認可コードの生成
	authCode, err := generateAuthorizationCode()
	if err != nil {
		http.Error(w, "Failed to generate authorization code", http.StatusInternalServerError)
		return
	}

	// 認可コードセッションの作成 (ユーザー情報を含める)
	session := model.AuthorizeSession{
		AuthorizationCode:   authCode,
		UserID:              authSession.UserID, // 認証済みユーザーID
		Email:               authSession.Email,  // ユーザーのメールアドレス
		ClientID:            clientID,
		CodeChallenge:       codeChallenge,
		CodeChallengeMethod: codeChallengeMethod,
		Scope:               scope,
		RedirectURI:         redirectURI,
		CreatedAt:           time.Now(),
	}

	if err := store.SaveAuthorizeSession(authCode, session); err != nil {
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	resp := model.AuthorizeResponse{
		AuthorizationCode: authCode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// 認可コードを生成するヘルパー関数
func generateAuthorizationCode() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
