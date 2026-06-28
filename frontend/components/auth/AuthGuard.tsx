"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--mm-bg-base)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-[10px] flex items-center justify-center"
            style={{ background: "var(--mm-accent)" }}
          >
            <span style={{ fontSize: "20px" }}>✦</span>
          </div>
          <div className="flex gap-1">
            {[0, 0.15, 0.3].map((d, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--mm-text-muted)", animationDelay: `${d}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
