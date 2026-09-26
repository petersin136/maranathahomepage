"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  ADMIN_NAV_GROUPS,
  findAdminNavGroup,
  isAdminNavItemActive,
  type AdminHref
} from "@/lib/admin/nav";
import { createClient } from "@/lib/supabase/browser";

/**
 * LNB 시안은 1024px 목업. 데스크톱 프레임 1440 = ×1.40625.
 * 사이드 242px, 배경 #F9F8F4, 활성 메뉴 흰 박스.
 */
const LNB_ITEMS: {
  href: AdminHref;
  label: string;
  icon: string;
  exact?: boolean;
  match: string[];
  badge?: "bookings";
}[] = [
  { href: "/admin", label: "대시보드", icon: "/admin-icons/lnb/house.png", exact: true, match: ["/admin"] },
  {
    href: "/admin/bookings",
    label: "예약관리",
    icon: "/admin-icons/lnb/calendar.png",
    match: ["/admin/bookings"],
    badge: "bookings"
  },
  { href: "/admin/calendar", label: "캘린더", icon: "/admin-icons/lnb/calendar-check.png", match: ["/admin/calendar"] },
  {
    href: "/admin/customers",
    label: "고객관리",
    icon: "/admin-icons/lnb/users.png",
    match: ["/admin/customers", "/admin/reminders"]
  },
  {
    href: "/admin/sales",
    label: "매출/정산",
    icon: "/admin-icons/lnb/usd.png",
    match: ["/admin/sales", "/admin/expenses", "/admin/settlements", "/admin/tax", "/admin/export"]
  },
  {
    href: "/admin/settings",
    label: "매장설정",
    icon: "/admin-icons/lnb/settings.png",
    match: ["/admin/settings", "/admin/artists", "/admin/services"]
  }
];

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

function lnbActive(pathname: string, item: (typeof LNB_ITEMS)[number]) {
  if (item.exact) return pathname === item.href;
  return item.match.some((href) => pathname === href || pathname.startsWith(`${href}/`));
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
  const activeGroup = findAdminNavGroup(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState("관리자");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.documentElement.style.scrollbarGutter;
    document.documentElement.style.scrollbarGutter = "stable";
    return () => {
      document.documentElement.style.scrollbarGutter = prev;
    };
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

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#faf8f6] text-hu-black min-[1440px]:flex min-[1440px]:bg-white">
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
        <nav className="mx-auto grid max-w-[1200px] grid-cols-4 border-t border-white/10 px-5 py-2.5 lg:px-8">
          {ADMIN_NAV_GROUPS.map((group) => {
            const active = group.id === activeGroup.id;
            const first = group.items[0];
            return (
              <Link
                key={group.id}
                href={first.href}
                prefetch={false}
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
        <div className="border-t border-white/10 bg-[#faf8f6]">
          <nav className="mx-auto flex max-w-[1200px] gap-5 overflow-x-auto px-5 [scrollbar-width:none] lg:gap-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
            {activeGroup.items.map((item) => {
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
      </header>

      <aside className="relative hidden h-screen w-[242px] shrink-0 flex-col bg-[#F9F8F4] min-[1440px]:flex">
        <Link href="/" className="block px-[27px] pt-[36px]">
          <img src="/admin-icons/hair-up-logo.png" alt="hair up" className="h-[44px] w-auto" />
        </Link>

        <nav className="mt-[37px] flex flex-col px-[11px]">
          {LNB_ITEMS.map((item) => {
            const active = lnbActive(pathname, item);
            const badge = item.badge === "bookings" ? pendingCount : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={clsx(
                  "flex h-[59px] items-center gap-[13px] rounded-[4px] px-[14px] font-sans-kr text-[18px] leading-none",
                  active
                    ? "bg-white font-medium text-[#1C1C1C]"
                    : "font-normal text-[#7A746E] hover:bg-white/60"
                )}
              >
                <LnbIcon src={item.icon} className="h-[22px] w-[22px]" />
                <span>{item.label}</span>
                {badge != null && badge > 0 ? (
                  <span className="ml-auto inline-flex h-[21px] min-w-[21px] items-center justify-center rounded-full bg-[#E4DFD6] px-[6px] font-sans-kr text-[12px] font-medium leading-none text-[#6F6963]">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div ref={menuRef} className="relative mt-auto border-t border-[#E6E1DA] px-[18px] pb-[27px] pt-[18px]">
          {menuOpen ? (
            <div className="absolute bottom-[78px] left-[207px] z-20 w-[235px] overflow-hidden rounded-[12px] bg-white py-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <button
                type="button"
                className="flex h-[42px] w-full items-center gap-[10px] px-[16px] text-left font-sans-kr text-[14px] text-[#3A3A3A] hover:bg-[#F6F4F0]"
              >
                <LnbIcon src="/admin-icons/lnb/card.png" className="h-[16px] w-[16px]" />
                플랜 및 결제 관리
              </button>
              <Link
                href="/admin/settings"
                onClick={() => setMenuOpen(false)}
                className="flex h-[42px] items-center gap-[10px] px-[16px] font-sans-kr text-[14px] text-[#3A3A3A] hover:bg-[#F6F4F0]"
              >
                <LnbIcon src="/admin-icons/lnb/user.png" className="h-[16px] w-[16px]" />
                계정 설정
              </Link>
              <div className="my-[4px] border-t border-[#ECEAE6]" />
              <button
                type="button"
                onClick={logout}
                className="flex h-[42px] w-full items-center gap-[10px] px-[16px] text-left font-sans-kr text-[14px] text-[#3A3A3A] hover:bg-[#F6F4F0]"
              >
                <LnbIcon src="/admin-icons/lnb/exit.png" className="h-[16px] w-[16px]" />
                로그아웃
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-[10px]">
            <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#7C726C] text-[#F4F1EC]">
              <LnbIcon src="/admin-icons/lnb/user.png" className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-sans-kr text-[15px] font-medium leading-[1.2] text-[#1C1C1C]">
                {profileName}
              </span>
              <span className="mt-[2px] block font-sans-kr text-[12px] font-normal leading-[1.2] text-[#8A847C]">
                Starter Plan
              </span>
            </span>
            <button
              type="button"
              aria-label="계정 메뉴"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-[28px] w-[28px] items-center justify-center text-[#8A847C] hover:text-[#1C1C1C]"
            >
              <LnbIcon src="/admin-icons/lnb/dots.png" className="h-[16px] w-[16px]" />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto min-h-[calc(100vh-160px)] max-w-[1200px] px-5 py-6 lg:px-8 lg:py-8 min-[1440px]:max-w-none min-[1440px]:px-10 min-[1440px]:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

