"use client";

import { AUTH_TOKEN_KEY } from "@/constants/auth";
import { getSessionToken } from "@/utils/api";
import { checkAccessToken } from "@/utils/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (checkAccessToken()) {
      router.push("/");
      return;
    }

    const handleCallback = async () => {
      try {
        const sessionId = searchParams.get("session_id");
        const state = searchParams.get("state");

        const savedState = sessionStorage.getItem("sso_state");

        if (!sessionId || !state) {
          setError("必要なパラメータが不足しています");
          return;
        }

        if (state !== savedState) {
          setError("不正なリクエストです");
          return;
        }

        const accessToken = await getSessionToken(sessionId);

        sessionStorage.removeItem("sso_state");

        document.cookie = `${AUTH_TOKEN_KEY}=${accessToken}; path=/`;

        router.push("/");
      } catch (err) {
        console.error(err);
        setError("認証処理中にエラーが発生しました");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="flex justify-center items-center min-h-screen p-4 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center text-red-600 mb-4">
            エラー
          </h1>
          <p className="text-center text-gray-700">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex justify-center items-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
          認証中...
        </h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </main>
  );
}
