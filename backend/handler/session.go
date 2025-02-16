package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"backend/config"
	"backend/model"
	"backend/store"
	"backend/utils"
)

func CreateSession(w http.ResponseWriter, r *http.Request) {
	log.Println("CreateSession")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req model.CreateSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.AccessToken == "" {
		http.Error(w, "Access token is required", http.StatusBadRequest)
		return
	}

	authCode, err := utils.GenerateAuthorizationCode()
	if err != nil {
		http.Error(w, "Failed to generate authorization code", http.StatusInternalServerError)
		return
	}

	session := model.Session{
		AccessToken: req.AccessToken,
		CreatedAt:   time.Now(),
	}

	if err := store.SaveSession(authCode, session); err != nil {
		http.Error(w, "Failed to store session", http.StatusInternalServerError)
		return
	}

	resp := model.CreateSessionResponse{
		AuthorizationCode: authCode,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", config.AllowedOrigin)
	w.Header().Set("Access-Control-Allow-Methods", "POST")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func GetSessionToken(w http.ResponseWriter, r *http.Request) {
	log.Println("GetSessionToken")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req model.GetSessionTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.AuthorizationCode == "" {
		http.Error(w, "Authorization code is required", http.StatusBadRequest)
		return
	}

	session, err := store.GetSession[model.Session](req.AuthorizationCode)
	if err != nil {
		if err.Error() == "session not found" {
			http.Error(w, "Invalid authorization code", http.StatusUnauthorized)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if time.Since(session.CreatedAt) > 24*time.Hour {
		http.Error(w, "Authorization code expired", http.StatusUnauthorized)
		return
	}

	resp := model.GetSessionTokenResponse{
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
