"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clsx } from "clsx";
import {
  ADMIN_NAV_GROUPS,
  findAdminNavGroup,
  isAdminNavItemActive
} from "@/lib/admin/nav";

export default function AdminShell({
  children,
  email
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeGroup = findAdminNavGroup(pathname);

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
    <div className="min-h-screen overflow-x-hidden bg-[#faf8f6] text-hu-black">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-hu-black text-hu-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-2.5 lg:px-8">
          <div className="flex items-baseline gap-2 lg:gap-3">
            <Link href="/" className="font-serif text-[17px] tracking-[0.08em] lg:text-[18px]">
              HAIR UP
            </Link>
            <span className="font-sans-kr text-[11px] text-white/50">Admin</span>
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
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
        <nav className="mx-auto grid max-w-[1200px] grid-cols-4 px-5 pb-2.5 lg:px-8">
          {ADMIN_NAV_GROUPS.map((group) => {
            const active = group.id === activeGroup.id;
            const first = group.items[0];
            return (
              <Link
                key={group.id}
                href={first.href}
                className={clsx(
                  "text-center font-sans-kr text-[14px] font-medium tracking-[0.02em] transition sm:text-[15px]",
                  active ? "text-white" : "text-white/70 hover:text-white"
                )}
              >
                {group.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="border-b border-hu-black/10 bg-[#faf8f6]">
        <nav className="mx-auto flex max-w-[1200px] gap-5 overflow-x-auto px-5 [scrollbar-width:none] lg:gap-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          {activeGroup.items.map((item) => {
            const active = isAdminNavItemActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "shrink-0 whitespace-nowrap pb-3 pt-3 font-serif text-[13px] tracking-[0.1em]",
                  active
                    ? "border-b-2 border-hu-black text-hu-black"
                    : "text-hu-muted"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="mx-auto min-h-[calc(100vh-140px)] max-w-[1200px] px-5 py-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
