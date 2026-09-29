"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import {
  ADMIN_MENUS,
  ADMIN_SIDEBAR_SLOT_ID,
  adminSubTabs,
  findAdminMenu,
  isAdminMenuActive,
  isAdminNavItemActive
} from "@/lib/admin/nav";
import { createClient } from "@/lib/supabase/browser";

function LnbIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain"
      }}
    />
  );
}

const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function todayLabelKst() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const [y, m, d] = parts.split("-");
  const dow = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay();
  return `${y}. ${m}. ${d}. ${WEEKDAY_EN[dow]}`;
}

export default function AdminShell({
  children,
  email
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeMenu = findAdminMenu(pathname);
  const subTabs = adminSubTabs(activeMenu);
  const [profileName, setProfileName] = useState("관리자");
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [todayLabel, setTodayLabel] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");

  useEffect(() => {
    setTodayLabel(todayLabelKst());
  }, []);

  useEffect(() => {
    fetch("/api/admin/tax")
      .then((res) => res.json())
      .then((data) => {
        const name = data?.settings?.business_name;
        if (typeof name === "string" && name.trim()) setBusinessName(name.trim());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      const metaName =
        (user?.user_metadata?.name as string | undefined) ||
        (user?.user_metadata?.full_name as string | undefined);
      if (metaName) setProfileName(metaName);
      else if (email) setProfileName(email.split("@")[0]);
      else if (user?.email) setProfileName(user.email.split("@")[0]);
    });
  }, [email]);

  useEffect(() => {
    fetch("/api/admin/bookings?status=pending")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.bookings)) setPendingCount(data.bookings.length);
      })
      .catch(() => undefined);
  }, [pathname]);

  const shopName = businessName || profileName;

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-dash-bg text-text1 min-[1440px]:flex min-[1440px]:h-screen min-[1440px]:flex-col">
      <header className="sticky top-0 z-50 bg-hu-black text-hu-white min-[1440px]:hidden">
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
        <nav className="mx-auto grid max-w-[1200px] grid-cols-6 border-t border-white/10 px-5 py-2.5 lg:px-8">
          {ADMIN_MENUS.map((menu) => {
            const active = menu.id === activeMenu?.id;
            return (
              <Link
                key={menu.id}
                href={menu.href}
                prefetch={false}
                className={clsx(
                  "text-center font-sans-kr text-[14px] font-medium tracking-[0.02em] transition sm:text-[15px]",
                  active ? "text-white" : "text-white/70 hover:text-white"
                )}
              >
                {menu.label}
              </Link>
            );
          })}
        </nav>
        {subTabs.length > 0 ? (
        <div className="border-t border-white/10 bg-dash-bg">
          <nav className="mx-auto flex max-w-[1200px] gap-5 overflow-x-auto px-5 [scrollbar-width:none] lg:gap-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
            {subTabs.map((item) => {
              const active = isAdminNavItemActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
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
        ) : null}
      </header>

      <div className="admin-topbar hidden min-[1440px]:flex">
        <div className="admin-topbar__brand">
          <Link href="/" aria-label="hair up 홈">
            <img src="/admin-icons/hair-up-logo.png" alt="hair up" className="h-[52px] w-auto" />
          </Link>
        </div>
        <div className="pc-content-topbar flex flex-1 items-end justify-between gap-6">
          <nav className="pc-nav-tabs gap-12">
            {ADMIN_MENUS.map((menu) => {
              const badge = menu.badge === "bookings" ? pendingCount : null;
              return (
                <Link
                  key={menu.id}
                  href={menu.href}
                  prefetch={false}
                  className={clsx("pc-nav-tab", isAdminMenuActive(pathname, menu) && "active")}
                >
                  {menu.label}
                  {badge != null && badge > 0 ? <span className="pc-nav-tab__badge">{badge}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 pb-[6px]">
            <form
              role="search"
              className="pc-topbar-search mr-2"
              onSubmit={(e) => {
                e.preventDefault();
                const q = globalQuery.trim();
                if (!q) return;
                router.push(`/admin/customers?q=${encodeURIComponent(q)}` as Route);
                setGlobalQuery("");
              }}
            >
              <input
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                aria-label="고객 검색"
              />
              <button type="submit" aria-label="검색" className="flex items-center">
                <LnbIcon src="/admin-icons/lnb/search.png" className="h-[16px] w-[16px] text-[color:var(--topbar-search-icon)]" />
              </button>
            </form>
            <Link
              href="/admin/settings"
              aria-label="설정"
              className="flex h-[36px] w-[36px] items-center justify-center rounded-pc border border-line bg-surface text-text1 hover:bg-pc-bg-alt"
            >
              <LnbIcon src="/admin-icons/lnb/settings.png" className="h-[16px] w-[16px]" />
            </Link>
            <button
              type="button"
              onClick={logout}
              aria-label="로그아웃"
              className="flex h-[36px] w-[36px] items-center justify-center rounded-pc border border-line bg-surface text-text1 hover:bg-pc-bg-alt"
            >
              <LnbIcon src="/admin-icons/lnb/exit.png" className="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="app-shell">
        <aside className="sidebar hidden min-[1440px]:flex">
          <div className="sidebar__date">
            <span className="sidebar__date-label">Today</span>
            <span className="sidebar__date-value">{todayLabel}</span>
          </div>

          <nav className="sidebar__nav">
            <div className="sidebar__group">
              {subTabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch={false}
                  className={clsx("sidebar__item", isAdminNavItemActive(pathname, tab) && "is-active")}
                >
                  {tab.icon ? <LnbIcon src={tab.icon} className="h-[18px] w-[18px]" /> : null}
                  <span>{tab.label}</span>
                </Link>
              ))}
            </div>
            <div id={ADMIN_SIDEBAR_SLOT_ID} />
          </nav>

          <div className="flex items-center gap-[10px] px-5 pb-6">
            <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-pc bg-app-black text-pc-sm font-bold text-surface">
              {shopName.slice(0, 1)}
            </span>
            <span className="min-w-0 flex-1 font-pc-kr leading-[1.2]">
              <span className="block truncate text-[13px] font-bold text-dash-ink">{shopName}</span>
              <span className="mt-[2px] block text-pc-sm font-medium text-text3">관리자</span>
            </span>
          </div>
        </aside>

        <div className="app-main">
          <main className="page-content">
            <div className="page-inner">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

