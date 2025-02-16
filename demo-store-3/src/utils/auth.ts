import { ID_TOKEN_KEY } from "@/constants/auth";

export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export interface Challenge {
  codeVerifier: string;
  codeChallenge: string;
}

export async function generateChallenge(): Promise<Challenge> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { codeVerifier, codeChallenge: hashHex };
}

export function checkIDToken(): boolean {
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) => cookie.trim().startsWith(`${ID_TOKEN_KEY}=`));
}
