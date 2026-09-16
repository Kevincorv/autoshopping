"use client";

import { useEffect } from "react";
import { useUI } from "@/lib/store";
import { useAuth } from "@/lib/auth/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useUI((s) => s.theme);
  const fetchUser = useAuth((s) => s.fetchUser);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return <>{children}</>;
}
