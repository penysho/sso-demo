import { SessionTokenRequest, SessionTokenResponse } from "@/types/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("API_URL is not defined");
}

export async function getSessionToken(
  request: SessionTokenRequest
): Promise<SessionTokenResponse> {
  const response = await fetch(`${API_URL}/api/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(
      Object.entries(request).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: String(value),
        }),
        {}
      )
    ).toString(),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to get session token");
  }

  return (await response.json()) as SessionTokenResponse;
}
