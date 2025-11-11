import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="relative isolate overflow-hidden bg-neutral-950 px-6 py-24 text-white sm:px-12"
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-500/40 via-emerald-400/20 to-transparent opacity-70" />
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-8">
        <div className="space-y-4">
          <p className="inline-flex rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-white/70">
            반응형 기본 템플릿
          </p>
          <h1 id="hero-heading" className="text-4xl font-bold tracking-tight sm:text-5xl">
            다양한 프로젝트에 바로 적용 가능한 Next.js 웹사이트 틀
          </h1>
          <p className="max-w-2xl text-base text-white/80 sm:text-lg">
            교회, 지점 홈페이지 등 다양한 분야에 맞게 빠르게 커스터마이징할 수 있도록 준비된 최소 구성입니다.
            필요할 때마다 꺼내 사용할 수 있도록 깔끔하게 정리했습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/#features"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
          >
            특징 살펴보기
          </Link>
          <Link
            href="/#contact"
            className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white"
          >
            문의하기
          </Link>
        </div>
      </div>
    </section>
  );
}
