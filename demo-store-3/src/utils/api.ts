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

export async function revokeToken(params: {
  token: string;
  token_type_hint: string;
  client_id: string;
}) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/oauth/revoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to revoke token: ${errorText}`);
  }

  return true;
}
