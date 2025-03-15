package handler

import (
	"backend/config"
	"backend/model"
	"backend/store"
	"backend/utils"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
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
	session := model.OidcSession{
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

	if err := store.SaveOidcSession(authCode, session); err != nil {
		http.Error(w, "Failed to save session", http.StatusInternalServerError)
		return
	}

	resp := model.OidcAuthorizeResponse{
		AuthorizationCode: authCode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", config.AllowedOrigin)
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Auth-Session")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func generateAuthorizationCode() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
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

	// OIDCパラメータの検証
	grantType := r.PostForm.Get("grant_type")

	// grant_typeに基づいて処理を分岐
	switch grantType {
	case "authorization_code":
		handleAuthorizationCodeGrant(w, r)
	case "refresh_token":
		handleRefreshTokenGrant(w, r)
	default:
		log.Printf("Invalid grant type: %s", grantType)
		http.Error(w, "Invalid grant type", http.StatusBadRequest)
	}
}

// 認可コードグラントタイプの処理
func handleAuthorizationCodeGrant(w http.ResponseWriter, r *http.Request) {
	clientID := r.PostForm.Get("client_id")
	if !slices.Contains(config.ClientIDs, clientID) {
		log.Printf("Invalid client ID: %s", clientID)
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	redirectURI := r.PostForm.Get("redirect_uri")
	if redirectURI == "" {
		log.Println("Missing redirect URI")
		http.Error(w, "Missing redirect URI", http.StatusBadRequest)
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

	session, err := store.GetOidcSession(authCode)
	if err != nil {
		log.Printf("Invalid authorization code: %v", err)
		http.Error(w, "Invalid authorization code", http.StatusBadRequest)
		return
	}

	// セッションの検証
	if session.ClientID != clientID {
		log.Printf("Client ID mismatch: expected=%s, got=%s", session.ClientID, clientID)
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	if session.RedirectURI != redirectURI {
		log.Printf("Redirect URI mismatch: expected=%s, got=%s", session.RedirectURI, redirectURI)
		http.Error(w, "Invalid redirect URI", http.StatusBadRequest)
		return
	}

	// PKCE検証
	codeVerifierHash := sha256.Sum256([]byte(codeVerifier))
	codeVerifierHashString := base64.RawURLEncoding.EncodeToString(codeVerifierHash[:])
	if codeVerifierHashString != session.CodeChallenge {
		log.Printf("Invalid code verifier: challenge=%s, computed=%s",
			session.CodeChallenge, codeVerifierHashString)
		http.Error(w, "Invalid code verifier", http.StatusBadRequest)
		return
	}

	// セッションからユーザー情報を取得
	userID := session.UserID
	email := session.Email

	// トークン生成
	now := time.Now()
	expiresIn := int64(3600)

	// IDトークンの生成 - クライアントIDを渡す
	idToken, err := utils.GenerateIDToken(userID, email, clientID, now, expiresIn)
	if err != nil {
		log.Printf("Failed to generate ID token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// アクセストークンの生成 - クライアントIDを渡す
	accessToken, err := utils.GenerateAccessToken(userID, clientID, now, expiresIn)
	if err != nil {
		log.Printf("Failed to generate access token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// リフレッシュトークンの生成
	refreshToken, err := utils.GenerateRefreshToken(userID)
	if err != nil {
		log.Printf("Failed to generate refresh token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// クライアント固有のトークンセッションを保存
	tokenSession := model.TokenSession{
		UserID:       userID,
		ClientID:     clientID,
		RefreshToken: refreshToken,
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour),
		IsRevoked:    false,
	}

	if err := store.SaveTokenSession(refreshToken, tokenSession); err != nil {
		log.Printf("Failed to save token session: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// トークン発行後に認可コードセッションを削除
	if err := store.DeleteOidcSession(authCode); err != nil {
		log.Printf("Warning: Failed to delete authorization code session: %v", err)
		// 処理は続行
	}

	sendTokenResponse(w, idToken, accessToken, refreshToken)
}

// リフレッシュトークングラントタイプの処理
func handleRefreshTokenGrant(w http.ResponseWriter, r *http.Request) {
	clientID := r.PostForm.Get("client_id")
	if !slices.Contains(config.ClientIDs, clientID) {
		log.Printf("Invalid client ID: %s", clientID)
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	refreshToken := r.PostForm.Get("refresh_token")
	if refreshToken == "" {
		log.Println("Missing refresh token")
		http.Error(w, "Missing refresh token", http.StatusBadRequest)
		return
	}

	// トークンセッションを取得
	tokenSession, err := store.GetTokenSession(refreshToken)
	if err != nil {
		log.Printf("Invalid refresh token: %v", err)
		http.Error(w, "Invalid refresh token", http.StatusBadRequest)
		return
	}

	// トークンの有効性チェック
	if tokenSession.IsRevoked {
		log.Println("Refresh token has been revoked")
		http.Error(w, "Invalid refresh token", http.StatusBadRequest)
		return
	}

	if time.Now().After(tokenSession.ExpiresAt) {
		log.Println("Refresh token has expired")
		http.Error(w, "Expired refresh token", http.StatusBadRequest)
		return
	}

	// クライアントIDの検証
	if tokenSession.ClientID != clientID {
		log.Printf("Client ID mismatch for refresh token: expected=%s, got=%s", tokenSession.ClientID, clientID)
		http.Error(w, "Invalid client ID", http.StatusBadRequest)
		return
	}

	user, err := store.GetUserByID(tokenSession.UserID)
	if err != nil {
		log.Printf("Failed to get user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// 新しいアクセストークンとIDトークンを生成
	newIdToken, err := utils.GenerateIDToken(
		tokenSession.UserID,
		user.Email,
		clientID,
		time.Now(),
		3600)
	if err != nil {
		log.Printf("Failed to generate new ID token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	newAccessToken, err := utils.GenerateAccessToken(
		tokenSession.UserID,
		clientID,
		time.Now(),
		3600)
	if err != nil {
		log.Printf("Failed to generate new access token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// 新しいリフレッシュトークンを生成
	newRefreshToken, err := utils.GenerateRefreshToken(
		tokenSession.UserID)
	if err != nil {
		log.Printf("Failed to generate new refresh token: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// 新しいトークンセッションを保存
	newTokenSession := model.TokenSession{
		UserID:       tokenSession.UserID,
		ClientID:     clientID,
		RefreshToken: newRefreshToken,
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour),
		IsRevoked:    false,
	}

	if err := store.SaveTokenSession(newRefreshToken, newTokenSession); err != nil {
		log.Printf("Failed to save new token session: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// 新しいトークンでレスポンスを送信
	sendTokenResponse(w, newIdToken, newAccessToken, newRefreshToken)
}

// トークンレスポンスを送信する共通関数
func sendTokenResponse(w http.ResponseWriter, idToken, accessToken, refreshToken string) {
	resp := model.OidcTokenResponse{
		IDToken:      idToken,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    3600,
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
