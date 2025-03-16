import {
  ACCESS_TOKEN_KEY,
  ID_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "@/constants/auth";
import { revokeToken } from "./api";

export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * クッキーからトークンを取得する
 */
export function getTokenFromCookie(tokenKey: string): string | null {
  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${tokenKey}=`)
  );

  if (tokenCookie) {
    return tokenCookie.split("=")[1];
  }

  return null;
}

/**
 * ユーザーが認証されているかどうかをチェック
 */
export function isAuthenticated(): boolean {
  return getTokenFromCookie(ID_TOKEN_KEY) !== null;
}

/**
 * トークンを取り消し、ログアウト処理を行う
 */
export async function logout() {
  try {
    const refreshToken = getTokenFromCookie(REFRESH_TOKEN_KEY);

    if (refreshToken) {
      // リフレッシュトークンの取り消し
      await revokeToken({
        token: refreshToken,
        token_type_hint: "refresh_token",
        client_id: process.env.NEXT_PUBLIC_CLIENT_ID || "demo-store-3",
      });
    }

    // クッキーの削除
    document.cookie = `${ID_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${REFRESH_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}
