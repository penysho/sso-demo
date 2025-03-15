"use client";

import { AUTH_SESSION_KEY } from "@/constants/auth";
import { authenticate, authorize } from "@/utils/api";
import { checkAuthSession } from "@/utils/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// SSOパラメータの型定義
type SSOParams = {
  clientId: string;
  state: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  responseType: string;
  scope: string;
};

// バリデーションスキーマの定義
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(1, "パスワードを入力してください")
    .min(8, "パスワードは8文字以上である必要があります"),
});

// フォームの型定義
type LoginFormValues = z.infer<typeof loginSchema>;

// SSOパラメータの取得関数
const getSSOParams = (searchParams: URLSearchParams): SSOParams => {
  return {
    clientId: searchParams.get("client_id") ?? "",
    state: searchParams.get("state") ?? "",
    redirectUri: searchParams.get("redirect_uri") ?? "",
    codeChallenge: searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: searchParams.get("code_challenge_method") ?? "",
    responseType: searchParams.get("response_type") ?? "",
    scope: searchParams.get("scope") ?? "",
  };
};

// SSOパラメータのバリデーション
const isSSOParamsValid = (ssoParams: SSOParams): boolean => {
  return !!(
    ssoParams.clientId &&
    ssoParams.state &&
    ssoParams.redirectUri &&
    ssoParams.codeChallenge &&
    ssoParams.codeChallengeMethod &&
    ssoParams.responseType === "code" &&
    ssoParams.scope.includes("openid")
  );
};

export default function LoginForm() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const getSessionIdFromCookie = useCallback(() => {
    const cookies = document.cookie.split("; ");
    return (
      cookies
        .find((row) => row.startsWith(`${AUTH_SESSION_KEY}=`))
        ?.split("=")[1] || undefined
    );
  }, []);

  const handleSSORedirect = useCallback(
    async (ssoParams: SSOParams) => {
      try {
        setIsLoading(true);

        const sessionId = getSessionIdFromCookie();
        if (!sessionId) {
          throw new Error("セッションIDが見つかりません");
        }

        const authCode = await authorize(
          {
            client_id: ssoParams.clientId,
            redirect_uri: ssoParams.redirectUri,
            code_challenge: ssoParams.codeChallenge,
            code_challenge_method: ssoParams.codeChallengeMethod,
            response_type: ssoParams.responseType,
            scope: ssoParams.scope,
          },
          sessionId
        );

        const finalRedirectUri = new URL(ssoParams.redirectUri);
        finalRedirectUri.searchParams.set("code", authCode);
        finalRedirectUri.searchParams.set("state", ssoParams.state);

        window.location.href = finalRedirectUri.toString();
      } catch (err) {
        console.error("SSO処理中にエラーが発生しました:", err);
        setError("SSO処理中にエラーが発生しました。もう一度お試しください。");
      } finally {
        setIsLoading(false);
      }
    },
    [getSessionIdFromCookie]
  );

  useEffect(() => {
    const checkExistingSession = async () => {
      if (checkAuthSession()) {
        const ssoParams = getSSOParams(searchParams);

        if (isSSOParamsValid(ssoParams)) {
          await handleSSORedirect(ssoParams);
        } else {
          router.push("/");
        }
      }
    };

    checkExistingSession();
  }, [router, searchParams, handleSSORedirect]);

  const onSubmit = async (data: LoginFormValues) => {
    setError("");

    try {
      setIsLoading(true);
      await authenticate(data.email, data.password);

      const ssoParams = getSSOParams(searchParams);

      if (isSSOParamsValid(ssoParams)) {
        await handleSSORedirect(ssoParams);
      } else {
        router.push("/");
      }
    } catch (err) {
      console.error("ログイン処理中にエラーが発生しました:", err);
      setError("メールアドレスまたはパスワードが間違っています");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-zinc-200">
        <h2 className="text-2xl font-semibold text-zinc-800 mb-6">
          Auth Hubにログイン
        </h2>
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              className={`w-full px-4 py-2 border ${
                errors.email ? "border-red-500" : "border-zinc-300"
              } rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition`}
              disabled={isLoading}
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
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
              className={`w-full px-4 py-2 border ${
                errors.password ? "border-red-500" : "border-zinc-300"
              } rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition`}
              disabled={isLoading}
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-zinc-800 text-white py-2 px-4 rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 transition duration-150 ease-in-out mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "処理中..." : "ログイン"}
          </button>
        </form>
      </div>

      <div className="mt-4 text-center text-sm text-zinc-600">
        Auth Hubは、複数のサービスへのシングルサインオンを提供します
      </div>
    </div>
  );
}
