export default function Section3() {
  return (
    <section id="services" className="relative isolate overflow-hidden bg-neutral-100 py-24 dark:bg-neutral-900">
      <div className="absolute inset-0 -z-10 opacity-50" aria-hidden>
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" fill="none" viewBox="0 0 1200 800">
          <path
            d="M0 200c120 40 240 120 360 120s240-80 360-80 240 80 360 80 240-80 360-120v600H0V200z"
            className="fill-white dark:fill-neutral-950"
          />
        </svg>
      </div>
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          운영 방식에 맞게 자유롭게 커스터마이징
        </h2>
        <p className="mt-6 text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
          교회, 보험 지점, 커뮤니티 사이트 등 다양한 목적에 맞춰 섹션과 콘텐츠를 변경하세요. Tailwind 유틸리티로 간단히
          색상과 타이포그래피를 조정할 수 있으며, 필요 시 추가 페이지를 만들어 App Router 구조에 맞춰 확장할 수 있습니다.
        </p>
        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          프로젝트마다 반복되는 초기 세팅 시간을 줄이고, 컨텐츠 제작과 사용자 경험에 더 많은 시간을 투자할 수 있습니다.
        </p>
      </div>
    </section>
  );
}
