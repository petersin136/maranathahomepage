"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Artist } from "@/lib/artists/types";

const PAGE_SIZE = 3;

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export default function Artists({ artists }: { artists: Artist[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(artists.length / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return artists.slice(start, start + PAGE_SIZE);
  }, [artists, page]);

  const pageLabel = `${String(page + 1).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;

  return (
    <section
      id="artists"
      className="bg-hu-black px-side pb-[120px] pt-[100px] text-hu-white"
      aria-labelledby="artists-heading"
    >
      <div className="mx-auto max-w-content">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-serif text-[15px] text-hu-white/90">Meet the Team</p>
            <h2
              id="artists-heading"
              className="mt-2 font-serif text-[42px] font-medium tracking-[0.06em] lg:text-[48px]"
            >
              ARTISTS
            </h2>
          </div>

          <div className="flex items-center gap-4 font-sans-en text-[12px] tracking-[0.16em] text-hu-white/80">
            <span aria-live="polite">{pageLabel}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="이전 아티스트"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="transition-opacity hover:opacity-70 disabled:opacity-30"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="다음 아티스트"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="transition-opacity hover:opacity-70 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-[51px] sm:grid-cols-3">
          {pageItems.map((artist) => (
            <li key={artist.id} className="group">
              <div className="relative aspect-[360/408] overflow-hidden bg-[#191919]">
                {artist.imageUrl ? (
                  <Image
                    src={artist.imageUrl}
                    alt={`${artist.nameKr} ${artist.nameEn}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate font-serif text-[16px] leading-none tracking-[0.02em]">
                  <span className="font-medium text-hu-white">
                    {artist.nameKr} {artist.nameEn}
                  </span>{" "}
                  <span className="text-[14px] font-normal text-[#766f69]">{artist.role}</span>
                </p>
                <a
                  href={artist.instagramUrl || "https://instagram.com/hairup.official"}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${artist.nameEn} Instagram`}
                  className="shrink-0 text-hu-white transition-opacity hover:opacity-70"
                >
                  <InstagramIcon />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
