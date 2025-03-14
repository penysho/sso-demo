package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lestrrat-go/jwx/v3/jwk"
)

var (
	// 本番環境では適切な鍵管理が必要です
	// ここでは簡易的に変数で保持しています
	privateKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	keyID      string
)

// InitJWKS RSA鍵ペアを初期化し、JWKSを生成します
func InitJWKS() error {
	// 鍵ペアの生成
	var err error
	privateKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate signing key: %w", err)
	}
	publicKey = &privateKey.PublicKey
	keyID = generateKeyID(publicKey)

	return nil
}

// GetJWKS JWKSを返します
func GetJWKS() (map[string]interface{}, error) {
	key, err := jwk.Import(publicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create JWK: %w", err)
	}

	if err := key.Set(jwk.KeyIDKey, keyID); err != nil {
		return nil, err
	}
	if err := key.Set(jwk.AlgorithmKey, "RS256"); err != nil {
		return nil, err
	}
	if err := key.Set(jwk.KeyUsageKey, "sig"); err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"keys": []interface{}{key},
	}, nil
}

// GenerateToken JWTトークンを生成します
func GenerateToken(claims jwt.MapClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = keyID
	return token.SignedString(privateKey)
}

// GenerateIDToken IDトークンを生成します
func GenerateIDToken(email string, now time.Time, expiresIn int64) (string, error) {
	claims := jwt.MapClaims{
		"sub":   email,
		"iss":   "https://auth-hub.example.com", // 実際のドメインに変更
		"aud":   "auth-hub",
		"iat":   now.Unix(),
		"exp":   now.Add(time.Duration(expiresIn) * time.Second).Unix(),
		"email": email,
	}
	return GenerateToken(claims)
}

// GenerateAccessToken アクセストークンを生成します
func GenerateAccessToken(email string, now time.Time, expiresIn int64) (string, error) {
	claims := jwt.MapClaims{
		"sub":   email,
		"iss":   "https://auth.example.com",
		"iat":   now.Unix(),
		"exp":   now.Add(time.Duration(expiresIn) * time.Second).Unix(),
		"scope": "openid profile email", // スコープ
	}
	return GenerateToken(claims)
}

// GenerateRefreshToken リフレッシュトークンを生成します
func GenerateRefreshToken(email string) (string, error) {
	// セキュアな乱数生成
	randomBytes := make([]byte, 32)
	_, err := rand.Read(randomBytes)
	if err != nil {
		log.Printf("Failed to generate random bytes: %v", err)
		return "", err
	}

	// メールアドレスを含めてエンコード
	data := struct {
		Email    string    `json:"email"`
		Random   []byte    `json:"random"`
		IssuedAt time.Time `json:"issued_at"`
	}{
		Email:    email,
		Random:   randomBytes,
		IssuedAt: time.Now(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	// Base64エンコード
	encoded := base64.RawURLEncoding.EncodeToString(jsonData)

	// 署名付きトークンとして返す
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"token_data": encoded,
		"iat":        time.Now().Unix(),
	})

	return token.SignedString(privateKey)
}

// 鍵IDの生成
func generateKeyID(key *rsa.PublicKey) string {
	publicKeyDER, err := x509.MarshalPKIXPublicKey(key)
	if err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(publicKeyDER[:8])
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
