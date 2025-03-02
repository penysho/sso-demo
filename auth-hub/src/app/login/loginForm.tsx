"use client";

import {
  ACCESS_TOKEN_KEY,
  ID_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "@/constants/auth";
import { Tokens } from "@/types/session";
import { authenticate, authorize } from "@/utils/api";
import { checkIDToken } from "@/utils/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type SSOParams = {
  clientId: string;
  state: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
};

const getSSOParams = (searchParams: URLSearchParams): SSOParams => {
  return {
    clientId: searchParams.get("client_id") ?? "",
    state: searchParams.get("state") ?? "",
    redirectUri: searchParams.get("redirect_uri") ?? "",
    codeChallenge: searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: searchParams.get("code_challenge_method") ?? "",
  };
};

const isSSOParamsValid = (ssoParams: SSOParams): boolean => {
  return !!(
    ssoParams.state &&
    ssoParams.redirectUri &&
    ssoParams.codeChallenge &&
    ssoParams.codeChallengeMethod
  );
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const getTokens = (): Tokens => {
    return {
      idToken: document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${ID_TOKEN_KEY}=`))
        ?.split("=")[1],
      accessToken: document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${ACCESS_TOKEN_KEY}=`))
        ?.split("=")[1],
      refreshToken: document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${REFRESH_TOKEN_KEY}=`))
        ?.split("=")[1],
    };
  };

  const handleSSORedirect = useCallback(
    async (ssoParams: SSOParams) => {
      try {
        const tokens = getTokens();
        if (!tokens.idToken) {
          throw new Error("ID Token not found");
        }

        const authCode = await authorize(
          {
            client_id: ssoParams.clientId,
            redirect_uri: ssoParams.redirectUri,
            code_challenge: ssoParams.codeChallenge,
          },
          tokens
        );

        const finalredirectUri = new URL(ssoParams.redirectUri);
        finalredirectUri.searchParams.set("code", authCode);
        finalredirectUri.searchParams.set("state", ssoParams.state);

        window.location.href = finalredirectUri.toString();
      } catch (err) {
        console.error("Failed to handle SSO redirect:", err);
        setError("SSO処理中にエラーが発生しました");
      }
    },
    [setError]
  );

  useEffect(() => {
    if (checkIDToken()) {
      const ssoParams = getSSOParams(searchParams);

      if (isSSOParamsValid(ssoParams)) {
        handleSSORedirect(ssoParams);
      } else {
        router.push("/");
      }
    }
  }, [router, searchParams, handleSSORedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (email !== "" && password !== "") {
        const tokens = await authenticate(email, password);

        document.cookie = `${ID_TOKEN_KEY}=${tokens.id_token}; path=/`;
        document.cookie = `${ACCESS_TOKEN_KEY}=${tokens.access_token}; path=/`;
        document.cookie = `${REFRESH_TOKEN_KEY}=${tokens.refresh_token}; path=/`;

        const ssoParams = getSSOParams(searchParams);

        if (isSSOParamsValid(ssoParams)) {
          await handleSSORedirect(ssoParams);
        } else {
          router.push("/");
        }
      } else {
        setError("メールアドレスまたはパスワードが間違っています");
      }
    } catch (err) {
      console.error(err);
      setError("ログイン処理中にエラーが発生しました");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-zinc-200">
        <h2 className="text-2xl font-semibold text-zinc-800 mb-6">
          Auth Hubにログイン
        </h2>
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-4 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-zinc-800 text-white py-2 px-4 rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 transition duration-150 ease-in-out mt-6"
          >
            ログイン
          </button>
        </form>
      </div>

      <div className="mt-4 text-center text-sm text-zinc-600">
        Auth Hubは、複数のサービスへのシングルサインオンを提供します
      </div>
    </div>
  );
}
