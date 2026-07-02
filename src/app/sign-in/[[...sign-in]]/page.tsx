"use client";

import { SignIn } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { CANDIDATE_LINKEDIN_URL } from "@/lib/constants";

export default function SignInPage() {
  const logged = useRef(false);
  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    console.log(`[Py] Candidate LinkedIn: ${CANDIDATE_LINKEDIN_URL}`);
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-canvas-bg">
      <SignIn forceRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </div>
  );
}
