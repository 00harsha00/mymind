"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/chat");
      } else {
        router.replace("/auth/login");
      }
    });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center" style={{ background: "var(--mm-bg-base)" }}>
      <div style={{ color: "var(--mm-text-secondary)", fontSize: "14px" }}>Signing you in...</div>
    </div>
  );
}
