"use client";

import { useEffect, useRef, useState } from "react";

const personas = [
  {
    id: "tax",
    icon: "📊",
    title: "세무사",
    description: "복잡한 세무 정보도 한눈에 정리되는 구조로 고객 신뢰를 빠르게 확보합니다.",
  },
  {
    id: "law",
    icon: "⚖️",
    title: "변호사",
    description: "전문성 강조 섹션과 고객 후기 구성으로 법률 서비스의 설득력을 높입니다.",
  },
  {
    id: "medical",
    icon: "🏥",
    title: "병원",
    description: "의료진 소개, 진료 예약 CTA 등을 명확하게 배치해 환자 경험을 향상시킵니다.",
  },
];

export default function Section3() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="audience"
      ref={sectionRef}
      className="relative overflow-hidden bg-white px-6 py-24 sm:px-10 lg:px-16"
      aria-labelledby="audience-heading"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <div className="space-y-4 text-center">
          <h2 id="audience-heading" className="text-[36px] font-bold tracking-tight text-black sm:text-[44px]">
            이런 분들을 위해 만듭니다
          </h2>
          <p className="mx-auto max-w-2xl text-base text-[#555555]">
            전문가의 전문성을 보여주면서도 사용자가 신뢰할 수 있는 구조를 기본으로 제공합니다.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {personas.map((persona, index) => (
            <article
              key={persona.id}
              className={`glass-card group relative flex flex-col gap-6 rounded-[24px] border border-white/30 bg-white/50 p-10 text-left text-black shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-xl transition-transform duration-600 ${
                visible ? "glass-card--visible" : ""
              }`}
              style={{ transitionDelay: `${visible ? index * 120 : 0}ms` }}
            >
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-black text-3xl text-white shadow-[inset_0_8px_16px_rgba(255,255,255,0.3)]">
                <span role="img" aria-hidden>
                  {persona.icon}
                </span>
              </span>
              <div className="space-y-3">
                <h3 className="text-2xl font-semibold tracking-tight">{persona.title}</h3>
                <p className="text-[16px] leading-relaxed text-[#555555]">{persona.description}</p>
              </div>
              <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/20">
                <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-white/60 blur-[2px]" aria-hidden />
              </div>
            </article>
          ))}
        </div>
      </div>

      <style jsx>{`
        .glass-card {
          opacity: 0;
          transform: translateY(40px);
        }

        .glass-card--visible {
          opacity: 1;
          transform: translateY(0);
        }

        .glass-card:hover,
        .glass-card:focus-visible {
          transform: translateY(-10px);
          background: rgba(255, 255, 255, 0.7);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
        }

        .glass-card:focus-visible {
          outline: 2px solid rgba(0, 0, 0, 0.12);
          outline-offset: 6px;
        }
      `}</style>
    </section>
  );
}
