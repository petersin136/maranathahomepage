"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { Artist } from "@/lib/artists/types";

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function MobileArtists({ artists }: { artists: Artist[] }) {
  const [openId, setOpenId] = useState<string | null>(artists[0]?.id ?? null);

  return (
    <section
      id="artists"
      className="bg-hu-black px-[20px] pb-[80px] pt-[64px] text-hu-white"
      aria-labelledby="artists-heading"
    >
      <div className="mx-auto w-[350px] max-w-full">
        <p className="font-serif text-[13px] text-hu-white/90">Meet the Team</p>
        <h2
          id="artists-heading"
          className="mt-1 font-serif text-[32px] font-medium tracking-[0.06em]"
        >
          ARTISTS
        </h2>

        <ul className="mt-8 divide-y divide-white/15">
          {artists.map((artist) => {
            const open = openId === artist.id;
            const label = `${artist.nameKr} ${artist.nameEn}`.trim();
            return (
              <li key={artist.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : artist.id)}
                  className="flex w-full items-start justify-between gap-3 py-4 text-left"
                >
                  <span className="min-w-0 font-serif text-[16px] font-medium leading-[1.2] tracking-[0.02em] text-hu-white">
                    {label}
                  </span>
                  <span
                    aria-hidden
                    className="mt-[1px] shrink-0 font-serif text-[16px] leading-none text-hu-white/70"
                  >
                    {open ? "−" : "+"}
                  </span>
                </button>

                <div
                  className={clsx(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="pb-6 pt-[24px]">
                      <div className="relative aspect-[350/396] w-full overflow-hidden bg-[#191919]">
                        {artist.imageUrl ? (
                          <img
                            src={artist.imageUrl}
                            alt={label}
                            width={350}
                            height={396}
                            className="absolute inset-0 h-full w-full object-cover"
                            decoding="async"
                          />
                        ) : null}
                      </div>
                      <div className="mt-[24px] flex items-center justify-between gap-3">
                        <p className="min-w-0 font-serif text-[13px] leading-none tracking-[0.02em] text-[#766f69]">
                          {artist.role}
                        </p>
                        <a
                          href={artist.instagramUrl || "https://www.instagram.com/hairup_official/"}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${artist.nameEn} Instagram`}
                          className="shrink-0 text-hu-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InstagramIcon />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
