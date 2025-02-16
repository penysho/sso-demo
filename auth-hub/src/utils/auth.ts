import { ID_TOKEN_KEY } from "@/constants/auth";

export function checkIDToken(): boolean {
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) => cookie.trim().startsWith(`${ID_TOKEN_KEY}=`));
}
