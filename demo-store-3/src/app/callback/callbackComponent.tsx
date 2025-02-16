"use client";

import { ACCESS_TOKEN_KEY, ID_TOKEN_KEY } from "@/constants/auth";
import { getSessionToken } from "@/utils/api";
import { checkIDToken } from "@/utils/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const MIN_LOADING_TIME = 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function CallbackComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (checkIDToken()) {
      router.push("/");
      return;
    }

    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        const savedState = sessionStorage.getItem("sso_state");
        const savedCodeVerifier = sessionStorage.getItem("sso_code_verifier");

        if (!code || !state) {
          setError("必要なパラメータが不足しています");
          return;
        }

        if (state !== savedState) {
          setError("不正なリクエストです");
          return;
        }

        const { id_token, access_token } = await getSessionToken({
          authorization_code: code,
          code_verifier: savedCodeVerifier ?? "",
        });

        sessionStorage.removeItem("sso_state");
        document.cookie = `${ID_TOKEN_KEY}=${id_token}; path=/`;
        document.cookie = `${ACCESS_TOKEN_KEY}=${access_token}; path=/`;

        await wait(MIN_LOADING_TIME);
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
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-xl font-semibold text-red-600 mb-4">エラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary/90 transition-colors duration-200"
          >
            ログイン画面に戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">認証中...</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
        </div>
      </div>
    </main>
  );
}
