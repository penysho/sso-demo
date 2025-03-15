import { AUTH_SESSION_KEY } from "@/constants/auth";

export function checkAuthSession(): boolean {
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) =>
    cookie.trim().startsWith(`${AUTH_SESSION_KEY}=`)
  );
}
