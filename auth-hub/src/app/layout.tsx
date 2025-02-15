import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Auth Hub",
  description: "Authentication Hub Service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} bg-zinc-50 text-zinc-900 antialiased min-h-screen`}
      >
        <div className="max-w-screen-xl mx-auto px-4">
          <header className="py-6 border-b border-zinc-200">
            <h1 className="text-2xl font-bold text-zinc-800">Auth Hub</h1>
          </header>
          <main className="py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
