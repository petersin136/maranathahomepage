const ITEMS = [
  {
    title: "Supabase 연결 준비",
    description:
      "환경 변수와 클라이언트 설정을 미리 구성해두어 인증 및 데이터 연동을 곧바로 시작할 수 있습니다."
  },
  {
    title: "접근성 고려",
    description:
      "시맨틱 마크업과 명시적인 aria 속성을 적용해 다양한 사용자 환경에서 안정적으로 사용할 수 있습니다."
  },
  {
    title: "라이트/다크 모드",
    description:
      "Tailwind 다크 모드 클래스를 활용해 기본 테마에 따라 자연스럽게 스타일이 전환됩니다."
  }
];

export default function Section2() {
  return (
    <section id="about" className="bg-white py-20 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="space-y-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            프로젝트 운영에 필요한 준비를 모두 포함
          </h2>
          <p className="mx-auto max-w-2xl text-neutral-600 dark:text-neutral-300">
            Supabase, Tailwind, TypeScript 기반으로 확장성을 확보했습니다. 필요 기능에 따라 컴포넌트를 추가하거나 제거하며
            자유롭게 조합할 수 있습니다.
          </p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
