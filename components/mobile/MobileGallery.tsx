"use client";

import { useCallback, useRef, useState } from "react";
import type { GalleryImage, GallerySlot } from "@/lib/gallery/types";

const STACK_ORDER: GallerySlot[] = [
  "top-left",
  "top-right",
  "center",
  "bottom-left",
  "bottom-right"
];

const CARD_PX = 318;
const GAP_PX = 8;

export function MobileGallery({ images }: { images: GalleryImage[] }) {
  const bySlot = Object.fromEntries(images.map((img) => [img.slot, img])) as Partial<
    Record<GallerySlot, GalleryImage>
  >;
  const slides = STACK_ORDER.map((slot) => bySlot[slot]).filter(
    (img): img is GalleryImage => Boolean(img?.src)
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / (CARD_PX + GAP_PX));
    setActive(Math.max(0, Math.min(slides.length - 1, next)));
  }, [slides.length]);

  return (
    <section
      id="gallery"
      className="bg-hu-black px-[20px] pb-[80px] pt-[64px] text-hu-white"
      aria-labelledby="gallery-heading"
    >
      <div className="mx-auto w-[350px] max-w-full">
        <div className="text-center">
          <p className="font-serif text-[14px] font-normal tracking-[0.02em] text-[#8e7e78]">
            Visual Archive
          </p>
          <h2
            id="gallery-heading"
            className="mt-3 font-serif text-[28px] font-medium leading-[1.24] tracking-[0.04em] text-hu-white"
          >
            <span className="block">SELECTED</span>
            <span className="block">LOOKS FOR YOU</span>
          </h2>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="mt-8 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          touchAction: "pan-x pan-y",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch"
        }}
      >
        <ul className="flex w-max gap-2 pl-[20px] pr-[20px]">
          {slides.map((image) => (
            <li
              key={image.id}
              className="relative shrink-0 overflow-hidden bg-[#191919]"
              style={{
                width: CARD_PX,
                height: 420,
                scrollSnapAlign: "start",
                scrollSnapStop: "always"
              }}
            >
              <img
                src={image.src ?? ""}
                alt={image.alt || "Gallery look"}
                width={CARD_PX}
                height={420}
                className="absolute inset-0 h-full w-full object-cover"
                decoding="async"
                draggable={false}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex justify-center gap-2" aria-hidden>
        {slides.map((image, i) => (
          <span
            key={image.id}
            className={
              i === active
                ? "h-1.5 w-1.5 rounded-full bg-hu-white"
                : "h-1.5 w-1.5 rounded-full bg-hu-dot-inactive"
            }
          />
        ))}
      </div>
    </section>
  );
}
