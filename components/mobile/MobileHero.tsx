const HERO_SLIDES = 4;

/** 2x 소스(hero-bg.png)를 1x 350 폭으로 표시 */
export function MobileHero() {
  return (
    <section id="hero" className="bg-hu-black text-hu-white" aria-labelledby="hero-heading">
      <div className="mx-auto w-[350px] max-w-full">
        <div className="relative overflow-hidden">
          <img
            src="/hero-bg.png"
            alt=""
            aria-hidden
            width={350}
            height={143}
            className="block h-auto w-[350px] max-w-full object-cover"
            decoding="async"
          />
        </div>

        <div className="px-0 pb-10 pt-8 text-center">
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

          <div className="mt-8 flex justify-center gap-2" aria-hidden>
            {Array.from({ length: HERO_SLIDES }, (_, i) => (
              <span
                key={i}
                className={
                  i === 0
                    ? "h-1.5 w-1.5 rounded-full bg-hu-white"
                    : "h-1.5 w-1.5 rounded-full bg-hu-dot-inactive"
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
