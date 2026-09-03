import type { ReactNode } from "react";

const POSTS = Array.from({ length: 8 }).map((_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `insta-${n}`,
    src: `/instagram/${n}.jpg`,
    href: "https://www.instagram.com/hairup_official/",
    alt: `Instagram post ${i + 1}`
  };
});

/** 3×3 테두리 순서: 상단 3 → 중좌 → 중우 → 하단 3 (정중앙은 리뷰) */
const BORDER_SLOTS = [0, 1, 2, 3, 5, 6, 7, 8] as const;

function InstaCell({
  src,
  href,
  alt
}: {
  src: string;
  href: string;
  alt: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="relative block aspect-square overflow-hidden bg-hu-black"
      aria-label={alt}
    >
      <img
        src={src}
        alt={alt}
        width={114}
        height={114}
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
      />
    </a>
  );
}

function ReviewCell() {
  return (
    <a
      href="#review-heading"
      className="flex aspect-square flex-col items-center justify-center bg-hu-beige px-1.5 text-center"
      aria-label="리뷰 별점 5점"
    >
      <span className="flex gap-px text-[11px] leading-none text-[#f5c518]" aria-hidden>
        {"★★★★★".split("").map((star, i) => (
          <span key={i}>{star}</span>
        ))}
      </span>
      <span className="mt-1.5 font-serif text-[10px] tracking-[0.1em] text-hu-black">REVIEW</span>
      <span className="mt-1 font-sans-kr text-[9px] leading-[1.35] text-hu-body">
        인생 디자인 컷
      </span>
    </a>
  );
}

export function MobileInstagram() {
  const cells: Array<{ key: string; node: ReactNode }> = [];
  let postIndex = 0;

  for (let i = 0; i < 9; i++) {
    if (i === 4) {
      cells.push({ key: "review", node: <ReviewCell /> });
      continue;
    }
    if (BORDER_SLOTS.includes(i as (typeof BORDER_SLOTS)[number])) {
      const post = POSTS[postIndex++];
      cells.push({
        key: post.id,
        node: <InstaCell src={post.src} href={post.href} alt={post.alt} />
      });
    }
  }

  return (
    <section className="bg-hu-white px-[20px] py-[64px]" aria-labelledby="instagram-heading">
      <div className="mx-auto w-[350px] max-w-full">
        <div className="flex items-baseline justify-between">
          <h2
            id="instagram-heading"
            className="font-serif text-[26px] font-medium tracking-[0.06em] text-hu-black"
          >
            INSTAGRAM
          </h2>
          <a
            href="https://www.instagram.com/hairup_official/"
            target="_blank"
            rel="noreferrer"
            className="font-serif text-[12px] tracking-[0.04em] text-hu-black"
          >
            @hairup.official
          </a>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-[4px]">
          {cells.map((cell) => (
            <div key={cell.key}>{cell.node}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
