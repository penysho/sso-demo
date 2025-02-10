import { SessionTokenResponse } from "@/types/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("API_URL is not defined");
}

export async function getSessionToken(
  authorizationCode: string
): Promise<string> {
  const response = await fetch(`${API_URL}/api/sessions/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      authorization_code: authorizationCode,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to get session token");
  }

  const data = (await response.json()) as SessionTokenResponse;
  return data.access_token;
}
