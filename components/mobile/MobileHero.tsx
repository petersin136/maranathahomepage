/** 원본 세로 사진을 모바일 전폭으로 표시 (헤더 포함 겉 테두리 없음) */
export function MobileHero() {
  return (
    <section id="hero" className="w-full text-hu-white" aria-labelledby="hero-heading">
      <div className="relative h-[min(100dvh,640px)] min-h-[520px] w-full overflow-hidden">
        <img
          src="/hero-bg.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[center_26%]"
          decoding="async"
        />
        {/* 상단 헤더 가독성 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black/60 via-black/25 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-8 z-10 px-4 text-center">
          <p className="font-sans-en text-[10px] font-medium tracking-[0.32em] text-hu-white">
            WELCOME TO HAIR UP
          </p>
          <h1
            id="hero-heading"
            className="mt-4 font-serif text-[28px] font-medium leading-[1.16] tracking-[0.02em]"
          >
            <span className="block">DISCOVER YOUR</span>
            <span className="block">NEW FAVORITE SALON</span>
          </h1>
        </div>
      </div>
    </section>
  );
}
