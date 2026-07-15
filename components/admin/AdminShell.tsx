"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export default function AdminShell({
  children,
  email
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const prev = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.documentElement.style.scrollbarGutter = prev;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#faf8f6] text-hu-black">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-hu-black text-hu-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-8 py-2.5">
          <div className="flex items-baseline gap-3">
            <Link href="/admin" className="font-serif text-[18px] tracking-[0.08em]">
              HAIR UP
            </Link>
            <span className="font-sans-kr text-[11px] text-white/50">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            {email ? (
              <span className="hidden max-w-[220px] truncate font-sans-kr text-[12px] text-white/50 sm:inline">
                {email}
              </span>
            ) : null}
            <Link
              href="/"
              className="font-sans-kr text-[12px] tracking-[0.06em] text-white/75 transition hover:text-white"
            >
              홈으로
            </Link>
            <button
              type="button"
              onClick={logout}
              className="font-sans-kr text-[12px] tracking-[0.06em] text-white/75 transition hover:text-white"
            >
              로그아웃
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1200px] gap-7 overflow-x-auto px-8 pb-2.5">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "whitespace-nowrap font-sans-kr text-[15px] font-medium tracking-[0.02em] transition",
                  active ? "text-white" : "text-white/70 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto min-h-[calc(100vh-96px)] max-w-[1200px] px-8 py-8">{children}</main>
    </div>
  );
}
