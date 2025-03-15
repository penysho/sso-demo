package utils

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"fmt"

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

// 鍵IDの生成
func generateKeyID(key *rsa.PublicKey) string {
	publicKeyDER, err := x509.MarshalPKIXPublicKey(key)
	if err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(publicKeyDER[:8])
}
