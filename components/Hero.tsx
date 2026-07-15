"use client";

import { useState } from "react";
import { clsx } from "clsx";

const SLIDE_COUNT = 4;

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <section
      id="hero"
      className="relative flex min-h-[min(100vh,900px)] items-center justify-center bg-hu-black text-hu-white"
      aria-labelledby="hero-heading"
      style={{ minHeight: "799px" }}
    >
      <div className="flex w-full flex-col items-center px-6 pb-16 pt-24 text-center">
        <p className="font-sans-en text-[12px] font-medium tracking-[0.42em] text-hu-white">
          WELCOME TO HAIR UP
        </p>

        <h1
          id="hero-heading"
          className="mt-7 font-serif text-[56px] font-medium leading-[1.12] tracking-[0.02em] sm:text-[64px] lg:text-[72px]"
        >
          <span className="block">DISCOVER YOUR</span>
          <span className="block">NEW FAVORITE SALON</span>
        </h1>
      </div>

      <div
        className="absolute bottom-[46px] left-1/2 flex -translate-x-1/2 items-center gap-2.5"
        role="tablist"
        aria-label="히어로 슬라이드"
      >
        {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={activeSlide === index}
            aria-label={`슬라이드 ${index + 1}`}
            onClick={() => setActiveSlide(index)}
            className={clsx(
              "h-2 w-2 rounded-full transition-colors",
              activeSlide === index ? "bg-hu-white" : "bg-hu-dot-inactive"
            )}
          />
        ))}
      </div>
    </section>
  );
}
