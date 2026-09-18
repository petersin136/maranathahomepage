export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-[799px] overflow-hidden text-hu-white"
      aria-labelledby="hero-heading"
    >
      <img
        src="/hero-bg.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
        decoding="async"
        fetchPriority="high"
      />

      {/* 밝은 하단에서도 타이틀이 읽히도록 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/55 via-black/20 to-transparent"
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
    </section>
  );
}
