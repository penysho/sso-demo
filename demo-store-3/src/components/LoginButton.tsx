"use client";

import { generateState } from "@/utils/auth";
import { generateChallenge } from "@/utils/pkce";

export default function LoginButton() {
  const handleLogin = async () => {
    const state = generateState();
    sessionStorage.setItem("sso_state", state);
    const { codeVerifier, codeChallenge } = await generateChallenge();
    sessionStorage.setItem("sso_code_verifier", codeVerifier);
    sessionStorage.setItem("sso_code_challenge", codeChallenge);

    const authHubBaseUrl = process.env.NEXT_PUBLIC_AUTH_HUB_URL;
    if (!authHubBaseUrl) {
      console.error("AUTH_HUB_URLが設定されていません");
      return;
    }

    const authHubLoginUrl = new URL("/login", authHubBaseUrl);

    authHubLoginUrl.searchParams.set("response_type", "code");
    authHubLoginUrl.searchParams.set("scope", "openid profile email");

    authHubLoginUrl.searchParams.set("client_id", "demo-store-3");
    authHubLoginUrl.searchParams.set("state", state);
    authHubLoginUrl.searchParams.set(
      "redirect_uri",
      `${window.location.origin}/callback`
    );
    authHubLoginUrl.searchParams.set("code_challenge", codeChallenge);
    authHubLoginUrl.searchParams.set("code_challenge_method", "S256");

    window.location.href = authHubLoginUrl.toString();
  };

  return (
    <button
      className="px-4 py-2 text-sm font-medium rounded-md bg-teal-800 hover:bg-teal-700 transition-colors duration-150"
      onClick={handleLogin}
    >
      ログイン
    </button>
  );
}
