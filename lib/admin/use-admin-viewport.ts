"use client";

import { useEffect, useState } from "react";

export const ADMIN_DESKTOP_MQ = "(min-width: 1440px)";

export function useAdminViewport() {
  const [mode, setMode] = useState<"mobile" | "desktop" | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(ADMIN_DESKTOP_MQ);
    const sync = () => setMode(mq.matches ? "desktop" : "mobile");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return mode;
}
