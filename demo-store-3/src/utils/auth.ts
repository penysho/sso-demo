import { ID_TOKEN_KEY } from "@/constants/auth";

export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function checkIDToken(): boolean {
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) => cookie.trim().startsWith(`${ID_TOKEN_KEY}=`));
}
