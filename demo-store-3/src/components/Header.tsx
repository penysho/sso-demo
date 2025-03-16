"use client";

import { generateState, isAuthenticated } from "@/utils/auth";
import { generateChallenge } from "@/utils/pkce";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "./LogoutButton";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, [pathname]);

  const handleAuthHubLogin = async () => {
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
    <header className="bg-teal-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold">Demo Store 3</h1>
          <div className="flex items-center gap-4">
            <span className="flex items-center text-sm">
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  isLoggedIn ? "bg-teal-400" : "bg-teal-700"
                }`}
              />
              {isLoggedIn ? "ログイン中" : "未ログイン"}
            </span>
            {isLoggedIn ? (
              <LogoutButton />
            ) : (
              <button
                className="px-4 py-2 text-sm font-medium rounded-md bg-teal-800 hover:bg-teal-700 transition-colors duration-150"
                onClick={handleAuthHubLogin}
              >
                ログイン
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
