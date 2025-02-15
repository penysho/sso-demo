"use client";

import { useEffect, useState } from "react";

const ACCESS_TOKEN_KEY = "store3_access_token";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const hasToken = cookies.some((cookie) =>
      cookie.trim().startsWith(`${ACCESS_TOKEN_KEY}=`)
    );
    setIsLoggedIn(hasToken);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-teal-100 overflow-hidden">
          {/* ヘッダー部分 */}
          <div className="border-b border-teal-100 bg-teal-50/50 px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-teal-900">Demo Store 3</h1>
            <div className="flex items-center gap-3">
              <span className="flex items-center text-sm text-teal-700">
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isLoggedIn ? "bg-teal-500" : "bg-teal-200"
                  }`}
                />
                {isLoggedIn ? "ログイン中" : "未ログイン"}
              </span>
              <button
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150
                  bg-teal-600 text-white hover:bg-teal-700"
              >
                {isLoggedIn ? "ログアウト" : "ログイン"}
              </button>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="p-6">
            {isLoggedIn ? (
              <div className="space-y-6">
                <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
                  <h2 className="text-lg font-semibold text-teal-900 mb-2">
                    ようこそ！
                  </h2>
                  <p className="text-teal-700">
                    ログイン済みユーザー向けのコンテンツをご覧いただけます。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-teal-100 rounded-lg">
                    <h3 className="font-medium text-teal-900 mb-2">注文履歴</h3>
                    <p className="text-sm text-teal-600">
                      過去の注文履歴を確認できます
                    </p>
                  </div>
                  <div className="p-4 border border-teal-100 rounded-lg">
                    <h3 className="font-medium text-teal-900 mb-2">
                      お気に入り
                    </h3>
                    <p className="text-sm text-teal-600">
                      お気に入りの商品をチェック
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-teal-900 mb-4">
                  ログインしてお買い物を始めましょう
                </h2>
                <p className="text-teal-600 mb-6">
                  ログインすると、注文履歴の確認やお気に入り機能がご利用いただけます。
                </p>
                <button className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors duration-150">
                  ログインページへ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
