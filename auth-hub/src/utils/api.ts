import { SessionRequest, SessionResponse } from "@/types/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("API_URL is not defined");
}

export async function authorize(
  request: SessionRequest,
  idToken: string
): Promise<string> {
  const url = new URL(`${API_URL}/api/oauth/authorize`);

  // クエリパラメータの設定
  url.searchParams.set("client_id", request.client_id);
  url.searchParams.set("redirect_uri", request.redirect_uri);
  url.searchParams.set("code_challenge", request.code_challenge);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${idToken}`,
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
