"use client";

import { useEffect, useRef, useState } from "react";

const personas = [
  {
    id: "solo",
    icon: "✂️",
    title: "1인 디자이너",
    description: "시술 중에도 카톡 상담·예약을 놓치지 않도록 자동 응대로 운영을 도와줍니다.",
  },
  {
    id: "owner",
    icon: "💇",
    title: "헤어샵 원장",
    description: "직원 응대 부담을 줄이고, n8n 자동화로 예약 누수와 노쇼를 줄입니다.",
  },
  {
    id: "salon",
    icon: "🏪",
    title: "신규 오픈 살롱",
    description: "랜딩페이지와 카톡 예약 플로우를 처음부터 세팅해 첫 고객 유입을 만듭니다.",
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
            카톡 상담부터 예약·랜딩페이지까지, 샵 운영에 맞게 자동화합니다.
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
