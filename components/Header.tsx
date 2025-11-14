"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { hash: "hero", label: "홈페이지" },
  { hash: "metrics", label: "신뢰지표" },
  { hash: "comparison", label: "비교" },
  { hash: "audience", label: "대상" },
  { hash: "services", label: "서비스" }
] as const;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [open]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 w-full transition-colors duration-300",
        scrolled ? "bg-white/80 backdrop-blur dark:bg-neutral-950/80" : "bg-transparent"
      )}
      aria-label="메인 헤더"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href={{ pathname: "/", hash: "hero" }} className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <Image
            src="https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/KakaoTalk_Photo_2025-06-23-00-02-43%20002-Photoroom-Photoroom.png"
            alt="MARANATHA 로고"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            priority
          />
          <span>MARANATHA</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="주 메뉴">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.hash}
              href={{ pathname: "/", hash: item.hash }}
              className="hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-sm md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="sr-only">메뉴 열기</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5" />
          </svg>
        </button>
      </div>
      <nav
        id="mobile-menu"
        className={clsx(
          "md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <ul className="space-y-2 border-t border-neutral-200 bg-white px-6 py-4 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-950">
          {NAV_ITEMS.map((item) => (
            <li key={item.hash}>
              <Link
                href={{ pathname: "/", hash: item.hash }}
                onClick={() => setOpen(false)}
                className="block py-2 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
