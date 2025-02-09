"use client";

import { checkAccessToken, generateState } from "@/utils/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (checkAccessToken()) {
      router.push("/");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (email !== "" && password !== "") {
        document.cookie = "access_token=dummy_token; path=/";
        router.push("/");
      } else {
        setError("メールアドレスまたはパスワードが間違っています");
      }
    } catch (_err) {
      console.error(_err);
      setError("ログイン処理中にエラーが発生しました");
    }
  };

  const handleStore2Login = () => {
    const state = generateState();
    sessionStorage.setItem("sso_state", state);

    const store2BaseUrl = process.env.NEXT_PUBLIC_STORE2_URL;
    if (!store2BaseUrl) {
      console.error("STORE2_URLが設定されていません");
      return;
    }

    const store2LoginUrl = new URL("/login", store2BaseUrl);
    store2LoginUrl.searchParams.set("state", state);
    store2LoginUrl.searchParams.set(
      "redirect_url",
      `${window.location.origin}/callback`
    );

    window.location.href = store2LoginUrl.toString();
  };

  return (
    <main className="flex justify-center items-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          demo-store-1
        </h1>
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ログイン
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleStore2Login}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            demo-store-2でログイン
          </button>
        </div>
      </div>
    </main>
  );
}
