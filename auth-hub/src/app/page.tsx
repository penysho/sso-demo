"use client";

import { AUTH_SESSION_KEY } from "@/constants/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const sessionId = cookies
      .find((cookie) => cookie.trim().startsWith(`${AUTH_SESSION_KEY}=`))
      ?.split("=")[1];

    if (!sessionId) {
      router.push("/login");
      return;
    }

    setIsLoggedIn(true);
    setSessionId(sessionId);
  }, [router]);

  const handleLogout = () => {
    document.cookie = `${AUTH_SESSION_KEY}=; path=/; max-age=0`;
    setIsLoggedIn(false);
    setSessionId("");
    router.push("/login");
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <main className="min-h-screen p-8 bg-zinc-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-zinc-800">Auth Hub</h1>
            <div className="flex items-center gap-4">
              <span className="text-zinc-600 flex items-center">
                <span className="w-2 h-2 bg-zinc-600 rounded-full mr-2"></span>
                ログイン中
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 transition-colors duration-150 ease-in-out"
              >
                ログアウト
              </button>
            </div>
          </div>

          <div className="prose prose-zinc">
            <p className="text-zinc-700">
              ようこそ！このページはログイン済みユーザー専用のホーム画面です。
            </p>
            <div className="mt-6 p-4 bg-zinc-50 rounded-md border border-zinc-200">
              <h2 className="text-xl font-semibold text-zinc-800 mb-4">
                アカウント情報
              </h2>
              <p className="text-zinc-700 font-mono text-sm">
                セッションID: {sessionId || "読み込み中..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
