"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const cards = [
  {
    id: "loss",
    targetValue: 1800,
    suffix: "만원",
    descriptionLines: ["홈페이지 없어서", "연간 손실되는 평균 매출"],
  },
  {
    id: "lead",
    targetValue: 72,
    suffix: "%",
    descriptionLines: ["프로 웹사이트가 신뢰 판단에", "영향을 준다고 답한 고객"],
  },
  {
    id: "time",
    targetValue: 3,
    suffix: "초",
    descriptionLines: ["첫인상에서 브랜드를 기억하는 데", "걸리는 평균 시간"],
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

  const renderIcon = (cardId: string) => {
    switch (cardId) {
      case "loss":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="3" width="15" height="13" />
            <polyline points="16 8 20 8 20 21 4 21 4 16" />
          </svg>
        );
      case "lead":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case "time":
      default:
        return (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
    }
  };

  return (
    <section
      id="metrics"
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[#f9fafb] px-6 py-24 sm:px-10 lg:px-16"
      aria-labelledby="metrics-heading"
    >
      <div className="absolute inset-x-0 top-0 z-[-1] h-28 bg-gradient-to-b from-black via-black/35 to-transparent opacity-70" />

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-16">
        <div className="space-y-5 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.32em] text-neutral-400">The Online Necessity</p>
          <h2
            id="metrics-heading"
            className="text-[40px] font-bold tracking-[-0.02em] text-slate-900 sm:text-[52px] lg:text-[56px]"
          >
            비즈니스 성장의 필수 요소
          </h2>
        </div>

        <div className="grid gap-20 sm:grid-cols-3">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={`metric-card group relative flex transform flex-col items-center rounded-[22px] bg-white/95 px-8 py-14 text-center transition duration-500 ${
                visible ? "metric-card--visible" : ""
              }`}
              style={{ transitionDelay: `${visible ? index * 120 : 0}ms` }}
            >
              <div className="stat-accent absolute inset-x-0 top-0 mx-auto h-[3px] w-24 opacity-0 transition duration-500" />
              <div className="stat-icon mb-10 flex h-24 w-24 items-center justify-center rounded-full border-2 border-neutral-200 text-slate-700 transition duration-500">
                {renderIcon(card.id)}
              </div>
              <div className="stat-divider mb-6 h-[1.5px] w-12 rounded-full bg-neutral-200 opacity-0 transition duration-500" />
              <p className="text-[50px] font-extrabold leading-none tracking-[-0.045em] text-slate-900 sm:text-[56px] lg:text-[60px]">
                {formattedValues[index]}
              </p>
              <p className="text-[17px] leading-relaxed text-neutral-600 sm:text-[18px]">
                {card.descriptionLines.map((line, lineIndex) => (
                  <span key={`${card.id}-line-${lineIndex}`} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .metric-card {
          opacity: 0;
          transform: translateY(40px) scale(0.96);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        }

        .metric-card--visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          box-shadow: 0 24px 56px rgba(15, 23, 42, 0.12);
        }

        .metric-card:hover,
        .metric-card:focus-visible {
          transform: translateY(-10px) scale(1.01);
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.14);
        }

        .metric-card:focus-visible {
          outline: 2px solid rgba(15, 23, 42, 0.18);
          outline-offset: 6px;
        }

        .metric-card:hover .stat-icon,
        .metric-card:focus-visible .stat-icon {
          border-color: rgba(15, 23, 42, 0.6);
          transform: rotate(360deg);
        }

        .metric-card:hover .stat-divider,
        .metric-card:focus-visible .stat-divider {
          opacity: 1;
        }

        .metric-card:hover .stat-accent,
        .metric-card:focus-visible .stat-accent {
          opacity: 1;
          background: linear-gradient(
            90deg,
            rgba(15, 23, 42, 0),
            rgba(15, 23, 42, 0.4),
            rgba(15, 23, 42, 0)
          );
        }

        .stat-icon {
          will-change: transform;
          transition: all 0.6s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .stat-icon svg {
          width: 42px;
          height: 42px;
          transition: stroke 0.4s ease;
        }

        .metric-card:hover .stat-icon svg,
        .metric-card:focus-visible .stat-icon svg {
          stroke: rgba(15, 23, 42, 0.7);
        }
      `}</style>
    </section>
  );
}
