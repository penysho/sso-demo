"use client";

import { isAuthenticated } from "@/utils/auth";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, [pathname]);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <header className="bg-teal-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold">Demo Store 3</h1>
          <div className="flex items-center gap-4">
            <span className="flex items-center text-sm">
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  isLoggedIn ? "bg-teal-400" : "bg-teal-700"
                }`}
              />
              {isLoggedIn ? "ログイン中" : "未ログイン"}
            </span>
            {isLoggedIn ? (
              <LogoutButton onLogoutSuccess={handleLogout} />
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
