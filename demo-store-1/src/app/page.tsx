"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const token = cookies
      .find((cookie) => cookie.trim().startsWith("access_token="))
      ?.split("=")[1];

    if (!token) {
      router.push("/login");
      return;
    }

    setAccessToken(token);
    setIsLoggedIn(true);
  }, [router]);

  const handleLogout = () => {
    document.cookie = "access_token=; path=/; max-age=0";
    setIsLoggedIn(false);
    setAccessToken("");
    router.push("/login");
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">demo-store-1</h1>
            <div className="flex items-center gap-4">
              <span className="text-green-600 flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                ログイン中
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>

          <div className="prose">
            <p className="text-gray-600">
              ようこそ！このページはログイン済みユーザー専用のホーム画面です。
            </p>
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                アカウント情報
              </h2>
              <p className="text-gray-600">
                アクセストークン: {accessToken || "読み込み中..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
