package config

import (
	"os"
)

var AllowedOrigin string

func Init() {
	AllowedOrigin = os.Getenv("CORS_ALLOWED_ORIGIN")
}
