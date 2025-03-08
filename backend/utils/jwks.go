package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lestrrat-go/jwx/v3/jwk"
)

var (
	signingKey *rsa.PrivateKey
	publicKey  *rsa.PublicKey
	keyID      string
)

// InitJWKS RSA鍵ペアを初期化し、JWKSを生成します
func InitJWKS() error {
	// 鍵ペアの生成
	var err error
	signingKey, err = rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return fmt.Errorf("failed to generate signing key: %w", err)
	}
	publicKey = &signingKey.PublicKey
	keyID = generateKeyID(publicKey)

	return nil
}

// GetJWKS JWKSを返します
func GetJWKS() (map[string]interface{}, error) {
	key, err := jwk.Import(publicKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create JWK: %w", err)
	}

	// 必要なJWKパラメータを設定
	if err := key.Set(jwk.KeyIDKey, keyID); err != nil {
		return nil, err
	}
	if err := key.Set(jwk.AlgorithmKey, "RS256"); err != nil {
		return nil, err
	}
	if err := key.Set(jwk.KeyUsageKey, "sig"); err != nil {
		return nil, err
	}

	// JWKSフォーマットで返す
	set := jwk.NewSet()
	set.AddKey(key)

	return map[string]interface{}{
		"keys": []interface{}{key},
	}, nil
}

// GenerateToken JWTトークンを生成します
func GenerateToken(claims jwt.MapClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = keyID
	return token.SignedString(signingKey)
}

// 鍵IDの生成
func generateKeyID(key *rsa.PublicKey) string {
	publicKeyDER, err := x509.MarshalPKIXPublicKey(key)
	if err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(publicKeyDER[:8])
}
