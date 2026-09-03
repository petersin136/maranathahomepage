"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Booking from "@/components/Booking";
import Marquee from "@/components/Marquee";
import { MobileArtists } from "@/components/mobile/MobileArtists";
import { MobileFooter } from "@/components/mobile/MobileFooter";
import { MobileGallery } from "@/components/mobile/MobileGallery";
import { MobileHero } from "@/components/mobile/MobileHero";
import { MobileHoursLocation } from "@/components/mobile/MobileHoursLocation";
import { MobileInstagram } from "@/components/mobile/MobileInstagram";
import { MobilePricingMenu } from "@/components/mobile/MobilePricingMenu";
import { MobileReview } from "@/components/mobile/MobileReview";
import { MobileWhyChooseUs } from "@/components/mobile/MobileWhyChooseUs";
import { MOBILE_ARTBOARD_PX } from "@/lib/mobile-artboard";
import type { Artist } from "@/lib/artists/types";
import type { GalleryImage } from "@/lib/gallery/types";
import type { ServiceItem } from "@/lib/services/types";
import "./mobile-home.css";

const NAV_ITEMS = [
  { href: "#hero", label: "HOME" },
  { href: "#about", label: "ABOUT" },
  { href: "#pricing", label: "PRICING" },
  { href: "#artists", label: "ARTISTS" },
  { href: "#gallery", label: "GALLERY" },
  { href: "#location", label: "LOCATION" }
] as const;

/**
 * 모바일 전용 홈. HomeShell 이 1440px 미만일 때만 마운트합니다.
 * 레이아웃 기준 폭 390px. 2x 이미지는 1x CSS 크기로 표시.
 */
export function MobileHome({
  artists,
  galleryImages,
  services
}: {
  artists: Artist[];
  galleryImages: GalleryImage[];
  services: ServiceItem[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh w-full bg-hu-white">
      <div
        className="m-artboard mx-auto w-full overflow-x-hidden"
        style={{ maxWidth: MOBILE_ARTBOARD_PX }}
      >
        <header className="sticky top-0 z-50 bg-hu-black text-hu-white">
          <div className="mx-auto flex h-[64px] w-[350px] max-w-full items-center justify-between">
            <Link
              href="#hero"
              className="font-serif text-[18px] font-medium tracking-[0.08em]"
              onClick={() => setMenuOpen(false)}
            >
              HAIR UP
            </Link>
            <div className="flex items-center gap-4">
              <a
                href="#booking"
                className="font-sans-kr text-[12px] tracking-[0.04em] text-hu-white/80"
                onClick={() => setMenuOpen(false)}
              >
                예약
              </a>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center"
                aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <svg viewBox="0 0 37 10" width="28" height="8" fill="currentColor" aria-hidden>
                  <rect x="0" y="0" width="37" height="1.5" />
                  <rect x="12.33" y="8.5" width="24.67" height="1.5" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main>
          <MobileHero />
          <MobileWhyChooseUs />
          <section aria-hidden className="w-full bg-hu-black" style={{ height: 80 }} />
          <MobilePricingMenu />
          <MobileArtists artists={artists} />
          <MobileGallery images={galleryImages} />
          <Booking artists={artists} services={services} />
          <MobileHoursLocation />
          <Marquee />
          <MobileReview />
          <MobileInstagram />
        </main>

        <MobileFooter />
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[60] bg-hu-black text-hu-white">
          <div className="mx-auto flex h-full w-full max-w-[390px] flex-col px-[20px] pt-5">
            <div className="flex h-[44px] items-center justify-between">
              <Link
                href="#hero"
                className="font-serif text-[18px] tracking-[0.08em]"
                onClick={() => setMenuOpen(false)}
              >
                HAIR UP
              </Link>
              <button
                type="button"
                aria-label="메뉴 닫기"
                className="flex h-8 w-8 items-center justify-center"
                onClick={() => setMenuOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
                  <path
                    d="M0 0L18 18M18 0L0 18"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
            <nav className="mt-16 flex flex-col gap-6" aria-label="주요 메뉴">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="font-serif text-[22px] tracking-[0.12em]"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <a
              href="#booking"
              className="mt-12 inline-flex h-[48px] w-[350px] max-w-full items-center justify-center bg-hu-white font-sans-kr text-[13px] text-hu-black"
              onClick={() => setMenuOpen(false)}
            >
              실시간 예약
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
