"use client";

const features = [
  {
    id: "custom",
    icon: "💎",
    title: "100% 맞춤 제작",
    description: "브랜드 아이덴티티에 맞춘 설계로 템플릿 느낌 없이 고유한 웹사이트를 완성합니다.",
  },
  {
    id: "sample",
    icon: "⚡",
    title: "48시간 무료 샘플",
    description: "핵심 화면을 빠르게 시안으로 제공해 협의 속도를 높이고 방향성을 명확히 합니다.",
  },
  {
    id: "roi",
    icon: "📈",
    title: "ROI 보장 컨설팅",
    description: "비즈니스 지표를 기반으로 유입·전환 전략을 함께 설계해 실질적인 성과를 뒷받침합니다.",
  },
];

export default function Section4() {
  return (
    <section
      id="services"
      className="relative isolate overflow-hidden bg-black px-6 py-24 text-white sm:px-10 lg:px-16"
      aria-labelledby="services-heading"
    >
      <div
        className="absolute -z-10 h-[120%] w-[120%] translate-x-1/4 -translate-y-1/4 bg-gradient-to-br from-[#7C3AED]/40 via-transparent to-transparent blur-3xl"
        aria-hidden
      />
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <div className="space-y-4 text-center">
          <h2
            id="services-heading"
            className="text-[36px] font-bold leading-[1.15] tracking-tight sm:text-[44px] lg:text-[48px]"
          >
            템플릿이 아닌, 당신만의 이야기를 만듭니다
          </h2>
          <p className="mx-auto max-w-2xl text-base text-white/70">
            정밀한 사용자 조사와 비주얼 디렉션을 통해 브랜드의 고유한 스토리를 설계합니다.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.id}
              className="feature-card group relative flex flex-col gap-6 rounded-3xl border border-[#333333] bg-[#1A1A1A] p-10 transition-transform duration-500 ease-out"
            >
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-black text-5xl text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <span role="img" aria-hidden>
                  {feature.icon}
                </span>
              </span>
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-white">{feature.title}</h3>
                <p className="text-[16px] leading-relaxed text-[#AAAAAA]">{feature.description}</p>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 opacity-0 transition-opacity duration-500 group-hover:opacity-70" />
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        .feature-card {
          background-image: linear-gradient(145deg, rgba(45, 45, 45, 0.9), rgba(18, 18, 18, 0.95));
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
          position: relative;
          overflow: hidden;
        }

        .feature-card::before {
          content: "";
          position: absolute;
          inset: -40% 0 auto 0;
          height: 60%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
          opacity: 0.6;
          pointer-events: none;
        }

        .feature-card:hover,
        .feature-card:focus-visible {
          transform: translateY(-10px) scale(1.02);
          border-color: rgba(255, 255, 255, 0.6);
          background-image: linear-gradient(145deg, rgba(50, 50, 50, 0.95), rgba(15, 15, 15, 0.95));
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.55);
        }

        .feature-card:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.4);
          outline-offset: 6px;
        }
      `}</style>
    </section>
  );
}



