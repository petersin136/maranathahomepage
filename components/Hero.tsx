const HERO_SLIDES = 4;

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[799px] overflow-hidden text-hu-white"
      aria-labelledby="hero-heading"
    >
      {/* 사진만 포함된 PNG — next/image 미사용, 텍스트는 HTML로만 렌더 */}
      <img
        src="/hero-bg.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
        fetchPriority="high"
      />

      <div className="absolute inset-x-0 bottom-[72px] z-10 flex flex-col items-center px-6 text-center">
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
        className="absolute inset-x-0 bottom-10 z-10 flex justify-center gap-2.5"
        aria-hidden
      >
        {Array.from({ length: HERO_SLIDES }, (_, i) => (
          <span
            key={i}
            className={
              i === 0
                ? "h-2 w-2 rounded-full bg-hu-white"
                : "h-2 w-2 rounded-full bg-hu-dot-inactive"
            }
          />
        ))}
      </div>
    </section>
  );
}
