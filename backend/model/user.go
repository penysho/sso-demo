package model

import "time"

// User ユーザー情報を保持する構造体
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}
