package handler

import (
	"backend/config"
	"backend/model"
	"backend/store"
	"backend/utils"
	"encoding/json"
	"log"
	"net/http"
	"time"
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

	// 仮実装： emailとpasswordが空でなければ認証OK
	if req.Email == "" || req.Password == "" {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	now := time.Now()
	expiresIn := int64(3600) // 1時間

	// 仮実装: ユーザーを取得または作成
	user, err := store.GetOrCreateUser(req.Email)
	if err != nil {
		log.Printf("Failed to get or create user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// IDトークンの生成
	idToken, err := utils.GenerateIDToken(user.ID, user.Email, now, expiresIn)
	if err != nil {
		http.Error(w, "Failed to generate ID token", http.StatusInternalServerError)
		return
	}

	// アクセストークンの生成
	accessToken, err := utils.GenerateAccessToken(user.ID, now, expiresIn)
	if err != nil {
		http.Error(w, "Failed to generate access token", http.StatusInternalServerError)
		return
	}

	// リフレッシュトークンの生成
	refreshToken, err := utils.GenerateRefreshToken(user.ID)
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
