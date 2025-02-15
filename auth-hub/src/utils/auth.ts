import { AUTH_TOKEN_KEY } from "@/constants/auth";

export function checkAccessToken(): boolean {
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) =>
    cookie.trim().startsWith(`${AUTH_TOKEN_KEY}=`)
  );
}
