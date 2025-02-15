"use client";

import { AUTH_TOKEN_KEY, AUTH_TOKEN_VALUE } from "@/constants/auth";
import { createSession } from "@/utils/api";
import { checkAccessToken } from "@/utils/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function LoginForm() {
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

        const authCode = await createSession(accessToken);

        const finalRedirectUrl = new URL(redirectUrl);
        finalRedirectUrl.searchParams.set("code", authCode);
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    <div className="max-w-md mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-zinc-200">
        <h2 className="text-2xl font-semibold text-zinc-800 mb-6">
          Auth Hubにログイン
        </h2>
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-zinc-800 text-white py-2 px-4 rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 transition duration-150 ease-in-out mt-6"
          >
            ログイン
          </button>
        </form>
      </div>

      <div className="mt-4 text-center text-sm text-zinc-600">
        認証ハブは、複数のサービスへのシングルサインオンを提供します
      </div>
    </div>
  );
}
