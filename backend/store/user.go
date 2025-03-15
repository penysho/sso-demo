package store

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"backend/model"
)

// ユーザーIDからユーザー情報を取得する
func GetUserByID(userID string) (*model.User, error) {
	return GetSession[model.User]("user", userID)
}

// メールアドレスからユーザー情報を取得する
func GetUserByEmail(email string) (*model.User, error) {
	// メールアドレスからユーザーIDを取得
	userID, err := redisClient.Get(ctx, "user_email:"+email).Result()
	if err != nil {
		return nil, fmt.Errorf("user not found for email: %s", email)
	}

	return GetUserByID(userID)
}

// ユーザーを登録または取得する
func GetOrCreateUser(email string) (*model.User, error) {
	// 既存ユーザーを確認
	userID, err := redisClient.Get(ctx, "user_email:"+email).Result()
	if err == nil {
		// 既存ユーザーが見つかった場合
		return GetUserByID(userID)
	}

	// 新しいユーザーIDを生成
	newUserID, err := generateUserID()
	if err != nil {
		return nil, err
	}

	// 新しいユーザーを作成
	user := model.User{
		ID:        newUserID,
		Email:     email,
		CreatedAt: time.Now(),
	}

	// ユーザー情報を保存
	if err := SaveSession("user", newUserID, user, 0); err != nil { // 有効期限なし
		return nil, err
	}

	// メールアドレスとユーザーIDのマッピングを保存
	if err := redisClient.Set(ctx, "user_email:"+email, newUserID, 0).Err(); err != nil {
		return nil, err
	}

	return &user, nil
}

// ユーザーIDを生成する
func generateUserID() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
