package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

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

	var req model.SessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.AccessToken == "" {
		http.Error(w, "Access token is required", http.StatusBadRequest)
		return
	}

	sessionID, err := utils.GenerateSessionID()
	if err != nil {
		http.Error(w, "Failed to generate session ID", http.StatusInternalServerError)
		return
	}

	session := model.Session{
		AccessToken: req.AccessToken,
		CreatedAt:   time.Now(),
	}

	if err := store.SaveSession(sessionID, session); err != nil {
		http.Error(w, "Failed to store session", http.StatusInternalServerError)
		return
	}

	resp := model.SessionResponse{
		SessionID: sessionID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3001")
	w.Header().Set("Access-Control-Allow-Methods", "POST")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func GetSession(w http.ResponseWriter, r *http.Request) {
	log.Println("GetSession")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		http.Error(w, "Session ID is required", http.StatusUnauthorized)
		return
	}

	session, err := store.GetSession(sessionID)
	if err != nil {
		if err.Error() == "session not found" {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}
		if err.Error() == "invalid session id format" {
			http.Error(w, "Invalid session format", http.StatusBadRequest)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if time.Since(session.CreatedAt) > 24*time.Hour {
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	}

	resp := model.SessionTokenResponse{
		AccessToken: session.AccessToken,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Session-ID")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
