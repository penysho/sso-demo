export function checkAccessToken(): boolean {
  const cookies = document.cookie.split(";");
  return cookies.some((cookie) => cookie.trim().startsWith("access_token="));
}
