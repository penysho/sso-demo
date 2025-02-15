import { Suspense } from "react";
import CallbackComponent from "./callbackComponent";

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackComponent />
    </Suspense>
  );
}
