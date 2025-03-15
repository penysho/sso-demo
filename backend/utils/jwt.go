package utils

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken JWTトークンを生成します
func GenerateToken(claims jwt.MapClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = keyID
	return token.SignedString(privateKey)
}

// GenerateIDToken IDトークンを生成します
func GenerateIDToken(userID, email string, issuedAt time.Time, expiresIn int64) (string, error) {
	claims := jwt.MapClaims{
		"sub":            userID,
		"email":          email,
		"email_verified": true,
		"iat":            issuedAt.Unix(),
		"exp":            issuedAt.Add(time.Duration(expiresIn) * time.Second).Unix(),
		"iss":            "https://auth.example.com",
		"aud":            "example-client",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(privateKey)
}

// GenerateAccessToken アクセストークンを生成します
func GenerateAccessToken(userID string, issuedAt time.Time, expiresIn int64) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"iat": issuedAt.Unix(),
		"exp": issuedAt.Add(time.Duration(expiresIn) * time.Second).Unix(),
		"iss": "https://auth.example.com",
		"aud": "example-client",
		"typ": "Bearer",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	return token.SignedString(privateKey)
}

// GenerateRefreshToken リフレッシュトークンを生成します
func GenerateRefreshToken(userID string) (string, error) {
	randomBytes := make([]byte, 32)
	_, err := rand.Read(randomBytes)
	if err != nil {
		return "", err
	}

	data := struct {
		UserID   string    `json:"user_id"`
		Random   []byte    `json:"random"`
		IssuedAt time.Time `json:"issued_at"`
	}{
		UserID:   userID,
		Random:   randomBytes,
		IssuedAt: time.Now(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	encoded := base64.RawURLEncoding.EncodeToString(jsonData)

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"token_data": encoded,
		"iat":        time.Now().Unix(),
	})

	return token.SignedString(privateKey)
}

// IDトークンを検証してクレームを返す
func VerifyIDToken(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// 署名アルゴリズムの検証
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}

	return claims, nil
}
