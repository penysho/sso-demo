"use client";

import { Suspense } from "react";
import LoginForm from "./loginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
