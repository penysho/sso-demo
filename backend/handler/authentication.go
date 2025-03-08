package handler

import (
	"backend/config"
	"backend/model"
	"backend/utils"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func Authenticate(w http.ResponseWriter, r *http.Request) {
	log.Println("Authenticate")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 仮実装：emailとpasswordが空でなければ認証OK
	if req.Email == "" || req.Password == "" {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	now := time.Now()
	expiresIn := int64(3600) // 1時間

	// IDトークンの生成
	idToken, err := generateIDToken(req.Email, now, expiresIn)
	if err != nil {
		http.Error(w, "Failed to generate ID token", http.StatusInternalServerError)
		return
	}

	// アクセストークンの生成
	accessToken, err := generateAccessToken(req.Email, now, expiresIn)
	if err != nil {
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	// リフレッシュトークンの生成
	refreshToken, err := generateRefreshToken(req.Email)
	if err != nil {
		http.Error(w, "Failed to generate refresh token", http.StatusInternalServerError)
		return
	}

	resp := model.LoginResponse{
		IDToken:      idToken,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(expiresIn),
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

func generateIDToken(email string, now time.Time, expiresIn int64) (string, error) {
	claims := jwt.MapClaims{
		"sub":   email,
		"iss":   "https://auth-hub.example.com", // 実際のドメインに変更
		"aud":   "auth-hub",
		"iat":   now.Unix(),
		"exp":   now.Add(time.Duration(expiresIn) * time.Second).Unix(),
		"email": email,
	}
	return utils.GenerateToken(claims)
}

func generateAccessToken(email string, now time.Time, expiresIn int64) (string, error) {
	claims := jwt.MapClaims{
		"sub":   email,
		"iss":   "auth-hub",
		"iat":   now.Unix(),
		"exp":   now.Add(time.Duration(expiresIn) * time.Second).Unix(),
		"scope": "openid profile email", // スコープ
	}
	return utils.GenerateToken(claims)
}

func generateRefreshToken(email string) (string, error) {
	claims := jwt.MapClaims{
		"sub":  email,
		"iss":  "auth-hub",
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(24 * 30 * time.Hour).Unix(), // 30日
		"type": "refresh",
	}
	return utils.GenerateToken(claims)
}
