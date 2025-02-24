package config

import (
	"os"
	"strings"
)

var (
	AllowedOrigin string
	ClientIDs     []string
)

func Init() {
	AllowedOrigin = os.Getenv("CORS_ALLOWED_ORIGIN")
	ClientIDs = strings.Split("demo-store-1,demo-store-2,demo-store-3", ",")
}
