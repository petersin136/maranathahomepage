"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const cards = [
  {
    id: "loss",
    icon: "💸",
    targetValue: 1800,
    suffix: "만원",
    description: "홈페이지 없어서 연간 손실되는 평균 매출",
  },
  {
    id: "lead",
    icon: "🤝",
    targetValue: 72,
    suffix: "%",
    description: "프로 웹사이트가 신뢰 판단에 영향을 준다고 답한 고객",
  },
  {
    id: "time",
    icon: "⏱️",
    targetValue: 3,
    suffix: "초",
    description: "첫인상에서 브랜드를 기억하는 데 걸리는 평균 시간",
  },
];

export default function Section1() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [currentValues, setCurrentValues] = useState(() =>
    cards.map((card) => ({
      id: card.id,
      value: card.id === "loss" ? 0 : 0,
    })),
  );

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

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const durations = cards.map((card) => (card.id === "loss" ? 1600 : 1000));
    const startTimestamp = performance.now();

    let animationFrame: number;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimestamp;

      setCurrentValues((prev) =>
        prev.map((entry, index) => {
          const { targetValue } = cards[index];
          const duration = durations[index];
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = Math.round(targetValue * eased);
          return { ...entry, value };
        }),
      );

      if (elapsed < Math.max(...durations)) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [visible]);

  const formattedValues = useMemo(
    () =>
      currentValues.map(({ id, value }) => {
        const card = cards.find((item) => item.id === id);
        if (!card) return "0";

        const formatter =
          card.id === "loss"
            ? new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 })
            : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

        return `${formatter.format(value)}${card.suffix}`;
      }),
    [currentValues],
  );

  return (
    <section
      id="metrics"
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-white px-6 py-24 sm:px-10 lg:px-16"
      aria-labelledby="metrics-heading"
    >
      <div className="absolute inset-x-0 top-0 z-[-1] h-24 bg-gradient-to-b from-black via-black/40 to-white opacity-70" />

      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <div className="space-y-5 text-center">
          <p className="uppercase tracking-[0.28em] text-xs text-neutral-400">Trust Metrics</p>
          <h2 id="metrics-heading" className="text-[40px] font-bold sm:text-[52px] lg:text-[56px]">
            숫자로 보는 신뢰도
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={`metric-card group relative flex transform flex-col gap-6 rounded-[16px] bg-[#F7F9FC] p-10 text-left transition duration-500 ${
                visible ? "metric-card--visible" : ""
              }`}
              style={{ transitionDelay: `${visible ? index * 120 : 0}ms` }}
            >
              <span className="text-[32px] sm:text-[36px]" role="img" aria-hidden>
                {card.icon}
              </span>
            <div>
                <p className="text-[36px] font-extrabold leading-none text-black sm:text-[44px] lg:text-[48px]">
                  {formattedValues[index]}
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-[#666666] sm:text-[16px]">
                  {card.description}
                </p>
            </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .metric-card {
          opacity: 0;
          transform: translateY(40px) scale(0.98);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .metric-card--visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        }

        .metric-card:hover,
        .metric-card:focus-visible {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
        }

        .metric-card:focus-visible {
          outline: 2px solid rgba(15, 23, 42, 0.18);
          outline-offset: 6px;
        }
      `}</style>
    </section>
  );
}
