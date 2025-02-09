package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"backend/model"
	"backend/store"
	"backend/utils"
)

func CreateSession(w http.ResponseWriter, r *http.Request) {
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
