import { VerifyForm } from "@/features/auth/components/VerifyForm";
import { Suspense } from "react";

export default function VerifyPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyForm />
      </Suspense>
    </div>
  );
}
