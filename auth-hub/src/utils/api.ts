import { SessionRequest, SessionResponse } from "@/types/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("API_URL is not defined");
}

export async function authorize(
  request: SessionRequest,
  sessionId: string
): Promise<string> {
  const url = new URL(`${API_URL}/api/oauth/authorize`);

  // クエリパラメータの設定
  url.searchParams.set("client_id", request.client_id);
  url.searchParams.set("redirect_uri", request.redirect_uri);
  url.searchParams.set("code_challenge", request.code_challenge);
  url.searchParams.set("code_challenge_method", request.code_challenge_method);
  url.searchParams.set("response_type", request.response_type);
  url.searchParams.set("scope", request.scope);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      "X-Auth-Session": sessionId,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Failed to create session");
  }

  const data = (await response.json()) as SessionResponse;
  return data.authorization_code;
}

export async function authenticate(
  email: string,
  password: string
): Promise<{ sessionId: string; expiresIn: number }> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "Authentication failed");
  }

  const data = await response.json();
  return {
    sessionId: data.session_id,
    expiresIn: data.expires_in,
  };
}
