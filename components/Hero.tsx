export default function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[min(100vh,900px)] items-center justify-center bg-hu-black text-hu-white"
      aria-labelledby="hero-heading"
      style={{ minHeight: "799px" }}
    >
      <div className="flex w-full flex-col items-center px-6 pb-16 pt-24 text-center">
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
