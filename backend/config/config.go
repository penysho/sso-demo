package config

import (
	"encoding/base64"
	"fmt"
	"os"
	"strings"
)

var (
	AllowedOrigins          []string
	ClientIDs               []string
	JWTSecret               []byte
	AuthSessionCookieName   string
	AuthSessionCookieDomain string
)

func Init() error {
	AllowedOrigins = strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",")
	ClientIDs = strings.Split("demo-store-1,demo-store-2,demo-store-3", ",")

	encodedSecret := os.Getenv("JWT_SECRET")
	if encodedSecret == "" {
		return fmt.Errorf("JWT_SECRET environment variable is not set")
	}

	secret, err := base64.StdEncoding.DecodeString(encodedSecret)
	if err != nil {
		return fmt.Errorf("invalid JWT_SECRET format: must be base64 encoded")
	}

	if len(secret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 bytes after decoding")
	}

	JWTSecret = secret
	AuthSessionCookieName = os.Getenv("AUTH_SESSION_COOKIE_NAME")
	if AuthSessionCookieName == "" {
		return fmt.Errorf("AUTH_SESSION_COOKIE_NAME environment variable is not set")
	}
	AuthSessionCookieDomain = os.Getenv("AUTH_SESSION_COOKIE_DOMAIN")
	if AuthSessionCookieDomain == "" {
		return fmt.Errorf("AUTH_SESSION_COOKIE_DOMAIN environment variable is not set")
	}
	return nil
}
