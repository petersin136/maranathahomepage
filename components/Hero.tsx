"use client";

import { useCallback, useEffect, useState } from "react";

const headingLines = [
  "블로그는 취미,",
  "홈페이지는",
  "신뢰입니다",
];

export default function Hero() {
  const [visualVisible, setVisualVisible] = useState(false);
  const handleScrollToPortfolio = useCallback(() => {
    const target = document.getElementById("comparison");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisualVisible(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section
      id="hero"
      className="hero-section relative isolate overflow-hidden bg-black text-white"
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0 -z-30 bg-black" aria-hidden />
      <div className="grid-overlay absolute inset-0 -z-20 opacity-40" aria-hidden />
      <div className="purple-haze pointer-events-none absolute -bottom-1/4 -left-1/4 h-[140%] w-[140%] -z-10" aria-hidden />

      <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center gap-12 px-6 py-32 sm:px-12 lg:flex-row lg:items-center lg:justify-between lg:px-16">
        <div className="flex w-full max-w-[620px] flex-col gap-8 text-left">
          <div className="space-y-7">
            <h1
              id="hero-heading"
              className="flex flex-col gap-4 text-[56px] font-extrabold tracking-[-0.02em] sm:text-[72px] lg:text-[82px]"
            >
              {headingLines.map((line, lineIndex) => (
                <span
                  key={line}
                  className={`block leading-[1.05] sm:leading-[1.07] lg:leading-[1.08] ${
                    lineIndex === 1 ? "text-[#4AE3B5]" : ""
                  }`}
                >
                  {line.split("").map((char, charIndex) => {
                    const delay = (lineIndex * line.length + charIndex) * 0.1;
                    return (
                      <span
                        key={`${lineIndex}-${charIndex}-${char}`}
                        className="letter inline-block"
                        style={{ animationDelay: `${delay}s` }}
                      >
                        {char === " " ? "\u00A0" : char}
                      </span>
                    );
                  })}
                </span>
              ))}
          </h1>
            <p className="w-full text-[20px] font-medium text-white/80 sm:text-[24px]">
              전문가의 첫인상을 3초 만에 완성하는 맞춤형 웹사이트
          </p>
        </div>

          <div className="flex flex-wrap items-center gap-5">
          <button
              type="button"
              onClick={() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center justify-center rounded-full border border-emerald-200/40 bg-gradient-to-r from-emerald-300 via-teal-200 to-indigo-400 px-10 py-3.5 font-semibold uppercase tracking-[0.12em] text-slate-900 shadow-[0_12px_32px_rgba(102,255,212,0.25)] transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:shadow-[0_18px_36px_rgba(102,255,212,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
              무료 상담 신청
          </button>
          <button
              type="button"
              onClick={handleScrollToPortfolio}
              className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-10 py-3.5 font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:bg-white/16 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
              포트폴리오 보기
          </button>
          </div>
        </div>

        <div
          className={`hero-visual ${visualVisible ? "hero-visual--visible" : ""}`}
          role="presentation"
          aria-hidden={!visualVisible}
        >
          <div className="hero-visual__glow" aria-hidden />
          <div className="hero-visual__screen">
            <div className="hero-visual__topbar">
              <span />
              <span />
              <span />
            </div>
            <div className="hero-visual__content">
              <div className="hero-visual__sidebar">
                <div className="hero-visual__avatar" />
                <div className="hero-visual__nav">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className="hero-visual__main">
                <div className="hero-visual__header">
                  <span />
                  <span />
                </div>
                <div className="hero-visual__metrics">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="hero-visual__cards">
                  <div />
                  <div />
                  <div />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-indicator absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-[11px] tracking-[0.4em] text-white/60">
        <span className="relative flex h-16 w-10 items-start justify-center">
          <span className="scroll-container h-full w-px overflow-hidden rounded-full bg-white/30">
            <span className="scroll-line block h-full w-full" />
          </span>
        </span>
        <span className="uppercase">SCROLL</span>
      </div>

      <style jsx>{`
        @keyframes letterFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gridDrift {
          0% {
            background-position: 0 0, 0 0;
          }
          100% {
            background-position: 40px 40px, 40px 40px;
          }
        }

        @keyframes scrollPulse {
          0% {
            transform: translateY(-90%);
          }
          50% {
            transform: translateY(10%);
          }
          100% {
            transform: translateY(-90%);
          }
        }

        .hero-section :global(.letter) {
          animation: letterFadeIn 0.8s forwards;
          opacity: 0;
        }

        .grid-overlay {
          background-image: linear-gradient(
              to right,
              rgba(255, 255, 255, 0.08) 1px,
              transparent 1px
            ),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridDrift 12s linear infinite;
        }

        .purple-haze {
          background: radial-gradient(
            circle at left bottom,
            rgba(124, 58, 237, 0.2),
            transparent 65%
          );
          filter: blur(4px);
        }

        .scroll-container {
          position: relative;
        }

        .scroll-line {
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #ffffff);
          animation: scrollPulse 2.8s infinite;
        }

        .hero-visual {
          position: relative;
          width: min(760px, 96vw);
          aspect-ratio: 16 / 10;
          opacity: 0;
          transform: perspective(1200px) rotateY(-28deg) rotateX(12deg) translateY(140px) scale(0.92);
          transition: transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 60px 120px rgba(0, 0, 0, 0.6));
          pointer-events: none;
        }

        .hero-visual--visible {
          opacity: 1;
          transform: perspective(1200px) rotateY(-16deg) rotateX(6deg) translateY(0) scale(1.32);
        }

        .hero-visual__glow {
          position: absolute;
          inset: 12% -20%;
          background: radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.3), transparent 60%);
          filter: blur(40px);
          opacity: 0.6;
        }

        .hero-visual__screen {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(140deg, rgba(18, 18, 20, 0.9), rgba(32, 17, 45, 0.95));
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.06),
            inset 0 45px 60px rgba(255, 255, 255, 0.04),
            0 35px 80px rgba(0, 0, 0, 0.45);
        }

        .hero-visual__screen::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.12), transparent 55%);
          opacity: 0.35;
        }

        .hero-visual__topbar {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 0.4rem;
          padding: 1.2rem 1.4rem;
        }

        .hero-visual__topbar span {
          display: inline-block;
          height: 0.65rem;
          width: 0.65rem;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.25);
        }

        .hero-visual__content {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 140px 1fr;
          padding: 0 1.6rem 1.6rem;
          gap: 1.6rem;
          height: calc(100% - 3.5rem);
        }

        .hero-visual__sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
          border-radius: 18px;
          padding: 1.2rem;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .hero-visual__avatar {
          height: 54px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.9), rgba(255, 255, 255, 0.15));
        }

        .hero-visual__nav {
          display: grid;
          gap: 0.8rem;
        }

        .hero-visual__nav span {
          display: block;
          height: 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.14);
        }

        .hero-visual__main {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .hero-visual__header {
          display: flex;
          gap: 1rem;
        }

        .hero-visual__header span:first-of-type {
          flex: 1;
          height: 20px;
          border-radius: 12px;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.28), rgba(124, 58, 237, 0.4));
        }

        .hero-visual__header span:last-of-type {
          width: 64px;
          height: 20px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.14);
        }

        .hero-visual__metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.8rem;
        }

        .hero-visual__metrics span {
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(140deg, rgba(255, 255, 255, 0.12), rgba(124, 58, 237, 0.3));
        }

        .hero-visual__cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .hero-visual__cards div {
          height: 120px;
          border-radius: 18px;
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02));
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .hero-visual__cards div:nth-child(2) {
          background: linear-gradient(160deg, rgba(124, 58, 237, 0.7), rgba(72, 35, 140, 0.8));
        }

        .hero-visual__cards div:nth-child(3) {
          background: linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.02));
        }

        @media (max-width: 1024px) {
          .hero-visual {
            width: 94vw;
            transform: perspective(1100px) rotateY(-20deg) rotateX(8deg) translateY(120px) scale(0.98);
          }

          .hero-visual__content {
            grid-template-columns: 110px 1fr;
          }
        }

        @media (max-width: 768px) {
          .hero-visual {
            width: 96vw;
            transform: perspective(1000px) rotateY(-12deg) rotateX(6deg) translateY(90px) scale(1);
          }

          .hero-visual--visible {
            transform: perspective(1000px) rotateY(-10deg) rotateX(4deg) translateY(0) scale(1.18);
          }

          .hero-visual__content {
            grid-template-columns: 1fr;
          }
        }

        .scroll-indicator {
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}
