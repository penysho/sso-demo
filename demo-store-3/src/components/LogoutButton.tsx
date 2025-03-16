"use client";

import { logout } from "@/utils/auth";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const success = await logout();
      if (success) {
        // ログアウト後にホーム画面またはログイン画面にリダイレクト
        router.push("/");
        router.refresh(); // ページの状態を更新
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium rounded-md bg-teal-800 hover:bg-teal-700 transition-colors duration-150"
    >
      ログアウト
    </button>
  );
}
