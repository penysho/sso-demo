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
	http.HandleFunc("/api/sessions", middleware.Cors(handler.CreateSession))
	http.HandleFunc("/api/sessions/token", middleware.Cors(handler.GetSessionToken))
	http.HandleFunc("/api/oauth/authorize", middleware.Cors(handler.OidcAuthorize))
	http.HandleFunc("/api/oauth/token", middleware.Cors(handler.OidcToken))
	http.HandleFunc("/api/auth/login", middleware.Cors(handler.Authenticate))
	http.HandleFunc("/.well-known/jwks.json", handler.JWKS)

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
