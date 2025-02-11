package main

import (
	"log"
	"net/http"

	"backend/config"
	"backend/handler"
	"backend/middleware"
	"backend/store"
)

func main() {
	if err := store.InitRedis(); err != nil {
		log.Fatalf("Failed to initialize Redis: %v", err)
	}

	config.Init()

	http.HandleFunc("/api/sessions", middleware.Cors(handler.CreateSession))
	http.HandleFunc("/api/sessions/token", middleware.Cors(handler.GetSession))

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
