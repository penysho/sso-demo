package middleware

import (
	"backend/config"
	"net/http"
)

func Cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Origin", config.AllowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Access-Token, X-Refresh-Token")
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}
