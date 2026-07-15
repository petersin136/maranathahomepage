import Image from "next/image";

/**
 * Instagram feed — 2×4 portrait grid.
 * posts: 이미지 URL 배열을 나중에 API/Supabase로 교체 가능.
 * 지금은 8개 플레이스홀더(검정).
 */
type InstaPost = { id: string; src: string | null; href: string; alt: string };

const POSTS: InstaPost[] = Array.from({ length: 8 }).map((_, i) => ({
  id: `insta-${i + 1}`,
  src: null,
  href: "https://instagram.com/hairup.official",
  alt: `Instagram post ${i + 1}`
}));

export default function Instagram() {
  return (
    <section className="bg-hu-white px-side py-[90px]" aria-labelledby="instagram-heading">
      <div className="mx-auto max-w-content">
        <div className="flex items-baseline justify-between">
          <h2
            id="instagram-heading"
            className="font-serif text-[32px] font-medium tracking-[0.06em] text-hu-black lg:text-[38px]"
          >
            INSTAGRAM
          </h2>
          <a
            href="https://instagram.com/hairup.official"
            target="_blank"
            rel="noreferrer"
            className="font-serif text-[15px] tracking-[0.04em] text-hu-black transition-opacity hover:opacity-70"
          >
            @hairup.official
          </a>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {POSTS.map((post) => (
            <a
              key={post.id}
              href={post.href}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-[4/5] overflow-hidden bg-hu-black"
              aria-label={post.alt}
            >
              {post.src ? (
                <Image
                  src={post.src}
                  alt={post.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              ) : null}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
