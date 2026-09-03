"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import WhyChooseUs from "@/components/WhyChooseUs";
import VisualBreak from "@/components/VisualBreak";
import PricingMenu from "@/components/PricingMenu";
import Artists from "@/components/Artists";
import Gallery from "@/components/Gallery";
import Booking from "@/components/Booking";
import HoursLocation from "@/components/HoursLocation";
import Marquee from "@/components/Marquee";
import Review from "@/components/Review";
import Instagram from "@/components/Instagram";
import Footer from "@/components/Footer";
import { MobileHome } from "@/components/mobile/MobileHome";
import type { Artist } from "@/lib/artists/types";
import type { GalleryImage } from "@/lib/gallery/types";
import type { ServiceItem } from "@/lib/services/types";

const DESKTOP_MQ = "(min-width: 1440px)";

/**
 * 모바일/데스크톱을 동시에 마운트하지 않습니다.
 * 둘 다 두면 id 중복 + 숨겨진 sticky/스크롤 리스너가 터치 스크롤을 튕깁니다.
 * 모바일 시안 폭 390px · 데스크톱 시안 폭 1440px.
 */
export function HomeShell({
  artists,
  galleryImages,
  services
}: {
  artists: Artist[];
  galleryImages: GalleryImage[];
  services: ServiceItem[];
}) {
  const [mode, setMode] = useState<"mobile" | "desktop" | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setMode(mq.matches ? "desktop" : "mobile");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (mode === null) {
    return <div className="min-h-dvh bg-hu-white" aria-hidden />;
  }

  if (mode === "desktop") {
    return (
      <>
        <Header />
        <main>
          <Hero />
          <WhyChooseUs />
          <VisualBreak />
          <PricingMenu />
          <Artists artists={artists} />
          <Gallery images={galleryImages} />
          <Booking artists={artists} services={services} />
          <HoursLocation />
          <Marquee />
          <Review />
          <Instagram />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <MobileHome
      artists={artists}
      galleryImages={galleryImages}
      services={services}
    />
  );
}
