"use client";

import { AUTH_TOKEN_KEY, AUTH_TOKEN_VALUE } from "@/constants/auth";
import { createSession } from "@/utils/api";
import { checkAccessToken } from "@/utils/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const getAccessToken = (): string | undefined => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${AUTH_TOKEN_KEY}=`))
      ?.split("=")[1];
  };

  const handleSSORedirect = useCallback(
    async (state: string, redirectUrl: string) => {
      try {
        const accessToken = getAccessToken();
        if (!accessToken) {
          throw new Error("Access token not found");
        }

        const sessionId = await createSession(accessToken);

        const finalRedirectUrl = new URL(redirectUrl);
        finalRedirectUrl.searchParams.set("session_id", sessionId);
        finalRedirectUrl.searchParams.set("state", state);

        window.location.href = finalRedirectUrl.toString();
      } catch (err) {
        console.error("Failed to handle SSO redirect:", err);
        setError("SSO処理中にエラーが発生しました");
      }
    },
    [setError]
  );

  useEffect(() => {
    const hasValidToken = checkAccessToken();

    if (hasValidToken) {
      const state = searchParams.get("state");
      const redirectUrl = searchParams.get("redirect_url");

      if (state && redirectUrl) {
        handleSSORedirect(state, redirectUrl);
      } else {
        router.push("/");
      }
    }
  }, [router, searchParams, handleSSORedirect]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (email !== "" && password !== "") {
        document.cookie = `${AUTH_TOKEN_KEY}=${AUTH_TOKEN_VALUE}; path=/`;

        const state = searchParams.get("state");
        const redirectUrl = searchParams.get("redirect_url");

        if (state && redirectUrl) {
          await handleSSORedirect(state, redirectUrl);
        } else {
          router.push("/");
        }
      } else {
        setError("メールアドレスまたはパスワードが間違っています");
      }
    } catch (_err) {
      console.error(_err);
      setError("ログイン処理中にエラーが発生しました");
    }
  };

  return (
    <main className="flex justify-center items-center min-h-screen p-4 bg-purple-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border-t-4 border-purple-600">
        <h1 className="text-2xl font-bold text-center text-purple-800 mb-6">
          demo-store-2
        </h1>
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-purple-800 mb-1"
            >
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-purple-950 bg-white placeholder-purple-400"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-purple-800 mb-1"
            >
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-purple-950 bg-white placeholder-purple-400"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            ログイン
          </button>
        </form>
      </div>
    </main>
  );
}
