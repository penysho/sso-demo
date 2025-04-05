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
	"time"
)

func generateSessionID() (string, error) {
	bytes := make([]byte, 32) // 256ビットのランダムデータ
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

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

	// 仮実装: ユーザーを取得または作成
	user, err := store.GetOrCreateUser(req.Email)
	if err != nil {
		log.Printf("Failed to get or create user: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// セッションIDの生成
	sessionID, err := generateSessionID()
	if err != nil {
		log.Printf("Failed to generate session ID: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// 認証セッション有効期限（24時間）
	expiresIn := 24 * 60 * 60
	now := time.Now()
	expiresAt := now.Add(time.Duration(expiresIn) * time.Second)

	// 認証セッションの作成
	authSession := model.AuthSession{
		SessionID:  sessionID,
		UserID:     user.ID,
		Email:      user.Email,
		CreatedAt:  now,
		ExpiresAt:  expiresAt,
		IsLoggedIn: true,
	}

	// 認証セッションの保存
	if err := store.SaveAuthSession(sessionID, authSession); err != nil {
		log.Printf("Failed to save auth session: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// 認証セッションIDをCookieに保存
	cookie := &http.Cookie{
		Name:     config.AuthSessionCookieName,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: false,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   expiresIn,
		Domain:   config.AuthSessionCookieDomain,
	}
	http.SetCookie(w, cookie)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
}
