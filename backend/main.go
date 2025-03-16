package main

import (
	"log"
	"net/http"

	"backend/config"
	"backend/handler"
	"backend/middleware"
	"backend/store"
	"backend/utils"
)

func main() {
	if err := store.InitRedis(); err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}

	if err := config.Init(); err != nil {
		log.Fatalf("Failed to initialize config: %v", err)
	}

	if err := utils.InitJWKS(); err != nil {
		log.Fatalf("Failed to initialize JWKS: %v", err)
	}

	http.HandleFunc("/health", handler.Health)
	http.HandleFunc("/api/oauth/authorize", middleware.Cors(handler.Authorize))
	http.HandleFunc("/api/oauth/token", middleware.Cors(handler.Token))
	http.HandleFunc("/api/auth/login", middleware.Cors(handler.Authenticate))
	http.HandleFunc("/api/oauth/revoke", middleware.Cors(handler.RevokeToken))
	http.HandleFunc("/.well-known/jwks.json", handler.JWKS)

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
