/**
 * Instagram feed — 2×4 portrait grid.
 * 이미지: public/instagram/01–08.jpg (원본, 압축 없음)
 */
type InstaPost = { id: string; src: string; href: string; alt: string };

const POSTS: InstaPost[] = Array.from({ length: 8 }).map((_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return {
    id: `insta-${n}`,
    src: `/instagram/${n}.jpg`,
    href: "https://www.instagram.com/hairup_official/",
    alt: `Instagram post ${i + 1}`
  };
});

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
            href="https://www.instagram.com/hairup_official/"
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
              <img
                src={post.src}
                alt={post.alt}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                decoding="async"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
