package handler

import (
	"backend/config"
	"backend/store"
	"encoding/json"
	"log"
	"net/http"
	"slices"
)

// RevokeToken はトークンを無効化するためのハンドラー関数です
// OIDCの仕様に基づいてトークン取り消しエンドポイントを実装しています
// RFC7009: https://datatracker.ietf.org/doc/html/rfc7009
func RevokeToken(w http.ResponseWriter, r *http.Request) {
	log.Println("RevokeToken")

	// POSTメソッド以外は許可しない
	if r.Method != http.MethodPost {
		log.Printf("Method not allowed: %s", r.Method)
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// リクエストからトークンとトークンタイプを取得
	if err := r.ParseForm(); err != nil {
		log.Printf("Invalid form data: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid_request"})
		return
	}

	token := r.FormValue("token")
	tokenTypeHint := r.FormValue("token_type_hint") // access_token または refresh_token
	clientID := r.FormValue("client_id")

	if token == "" {
		log.Println("Missing token")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid_request"})
		return
	}

	// クライアントIDの検証（パブリッククライアントのためシークレットは不要）
	if clientID == "" {
		log.Println("Missing client ID")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid_client"})
		return
	}

	if !slices.Contains(config.ClientIDs, clientID) {
		log.Printf("Invalid client ID: %s", clientID)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid_client"})
		return
	}

	// トークン取り消し処理
	if err := revokeTokenFromStore(token, tokenTypeHint, clientID); err != nil {
		log.Printf("Failed to revoke token: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "server_error"})
		return
	}

	log.Println("Token successfully revoked")
	// RFC7009に基づき、成功時は空のレスポンスボディで200 OKを返す
	w.WriteHeader(http.StatusOK)
}

// revokeTokenFromStore はトークンストアからトークンを無効化する関数
func revokeTokenFromStore(token string, tokenTypeHint string, clientID string) error {
	// トークンセッションを取得
	session, err := store.GetTokenSession(token)
	if err == nil {
		// トークンが存在する場合、そのクライアントIDが一致するか確認
		if session.ClientID == clientID {
			log.Printf("Revoking token for client ID: %s", clientID)
			return store.DeleteSession("token_session", token)
		}
		// クライアントIDが一致しない場合もエラーは返さない
		// RFC7009では、他のクライアントのトークンを取り消そうとした場合も
		// 特にエラーを返さず成功として扱うことが推奨されています
		log.Printf("Client ID mismatch: token belongs to %s, not %s", session.ClientID, clientID)
		return nil
	}

	// トークンが見つからない場合もエラーは返さない
	// RFC7009では、存在しないトークンも成功として扱います
	log.Printf("Token not found, treating as already revoked")
	return nil
}
