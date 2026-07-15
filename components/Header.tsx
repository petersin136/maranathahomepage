"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "#hero", label: "HOME" },
  { href: "#about", label: "ABOUT" },
  { href: "#pricing", label: "PRICING" },
  { href: "#artists", label: "ARTISTS" },
  { href: "#gallery", label: "GALLERY" },
  { href: "#location", label: "LOCATION" }
] as const;

export default function Header() {
  const [active, setActive] = useState("#hero");

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => item.href.replace("#", ""));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="hu-container flex h-[88px] items-center justify-between">
        <Link
          href="#hero"
          className="font-serif text-[22px] font-medium tracking-[0.08em] text-hu-white"
        >
          HAIR UP
        </Link>

        <nav
          className="hidden items-center gap-10 font-sans-en text-[12px] font-medium tracking-[0.18em] text-hu-white lg:flex"
          aria-label="주 메뉴"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative pb-1 transition-opacity hover:opacity-80",
                active === item.href &&
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-hu-white"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <a
          href="#booking"
          className="inline-flex h-[46px] min-w-[167px] items-center justify-center bg-hu-cta px-5 font-sans-kr text-[13px] font-medium tracking-[-0.01em] text-hu-white transition-colors hover:bg-[#222222]"
        >
          실시간 예약
        </a>
      </div>
    </header>
  );
}
