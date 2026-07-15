"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { clsx } from "clsx";

const NAV: {
  href: "/admin" | "/admin/bookings" | "/admin/calendar" | "/admin/artists" | "/admin/services";
  label: string;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "대시보드", exact: true },
  { href: "/admin/bookings", label: "예약" },
  { href: "/admin/calendar", label: "캘린더" },
  { href: "/admin/artists", label: "디자이너" },
  { href: "/admin/services", label: "시술" }
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const prev = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.documentElement.style.scrollbarGutter = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#faf8f6] text-hu-black">
      <header className="border-b border-hu-black/10 bg-hu-black text-hu-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-8 py-5">
          <div className="flex items-baseline gap-3">
            <Link href="/admin" className="font-serif text-[22px] tracking-[0.08em]">
              HAIR UP
            </Link>
            <span className="font-sans-kr text-[12px] text-white/45">Admin</span>
          </div>
          <Link
            href="/"
            className="font-sans-kr text-[12px] tracking-[0.06em] text-white/70 transition hover:text-white"
          >
            홈으로
          </Link>
        </div>
        <nav className="mx-auto flex max-w-[1200px] gap-6 overflow-x-auto px-8 pb-4">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "whitespace-nowrap font-serif text-[13px] tracking-[0.1em] transition",
                  active ? "text-white" : "text-white/45 hover:text-white/80"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto min-h-[calc(100vh-140px)] max-w-[1200px] px-8 py-10">{children}</main>
    </div>
  );
}
