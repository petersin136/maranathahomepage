export default function Section1() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            깔끔한 기본 구성
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300">
            Hero, 섹션, 푸터 등 기본 구성 요소를 미리 제작해 반복 작업을 줄였습니다. 필요 시 텍스트만 교체하면 되는
            구조로 빠른 프로젝트 착수가 가능합니다.
          </p>
          <p className="text-neutral-600 dark:text-neutral-300">
            Tailwind CSS가 기본 적용되어 있어 색상, 폰트, 여백 등을 쉽게 커스터마이징할 수 있습니다.
          </p>
        </div>
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <dl className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
            <div>
              <dt className="font-medium text-neutral-900 dark:text-neutral-100">프로젝트 시작 속도</dt>
              <dd>기본 골격을 미리 갖춰둬서 설정에 드는 시간을 크게 줄였습니다.</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-900 dark:text-neutral-100">맞춤형 확장성</dt>
              <dd>필요한 섹션만 골라 쓰고 나머지는 쉽게 교체할 수 있도록 컴포넌트를 분리했습니다.</dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-900 dark:text-neutral-100">다국어 대응 준비</dt>
              <dd>한국어 기본, 다른 언어로도 빠르게 텍스트만 변경해 대응할 수 있습니다.</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
