"use client";

import { checkAccessToken } from "@/utils/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // アクセストークンがある場合の処理
    if (checkAccessToken()) {
      const state = searchParams.get("state");
      const redirectUrl = searchParams.get("redirect_url");

      // SSOリクエストの場合はリダイレクト処理
      if (state && redirectUrl) {
        handleSSORedirect(state, redirectUrl);
      } else {
        // 通常のログイン時はホームにリダイレクト
        router.push("/");
      }
      return;
    }
  }, [router, searchParams]);

  // SSOリダイレクト処理を関数として切り出し
  const handleSSORedirect = (state: string, redirectUrl: string) => {
    const mockSessionId = generateMockSessionId();
    const finalRedirectUrl = new URL(redirectUrl);
    finalRedirectUrl.searchParams.set("session_id", mockSessionId);
    finalRedirectUrl.searchParams.set("state", state);
    window.location.href = finalRedirectUrl.toString();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (email !== "" && password !== "") {
        // ログイン成功時の処理
        document.cookie = "access_token=dummy_token; path=/";

        // SSOパラメータの確認
        const state = searchParams.get("state");
        const redirectUrl = searchParams.get("redirect_url");

        if (state && redirectUrl) {
          // SSOリダイレクト実行
          handleSSORedirect(state, redirectUrl);
        } else {
          // 通常のログイン成功時の遷移
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

// モックのセッションID生成関数
function generateMockSessionId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
