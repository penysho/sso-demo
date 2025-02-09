export function generateState(): string {
  // ランダムな32バイトの文字列を生成
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function checkAccessToken(): boolean {
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) => cookie.trim().startsWith("access_token="));
}
