"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const headingLines = [
  "블로그는 취미,",
  "홈페이지는",
  "신뢰입니다",
];

export default function Hero() {
  const [animateIn, setAnimateIn] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleScrollToPortfolio = useCallback(() => {
    const target = document.getElementById("comparison");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleCanPlay = () => {
      setVideoReady(true);
    };

    const handleError = (e: Event) => {
      console.warn("영상 로딩 실패:", e);
      setVideoReady(true);
    };

    const handleLoadStart = () => {
      console.log("영상 로딩 시작");
    };

    videoElement.addEventListener("canplaythrough", handleCanPlay, { once: true });
    videoElement.addEventListener("error", handleError, { once: true });
    videoElement.addEventListener("loadstart", handleLoadStart, { once: true });

    if (videoElement.readyState >= 3) {
      setVideoReady(true);
    }

    return () => {
      videoElement.removeEventListener("canplaythrough", handleCanPlay);
      videoElement.removeEventListener("error", handleError);
      videoElement.removeEventListener("loadstart", handleLoadStart);
    };
  }, []);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setAnimateIn(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!videoReady) return;
    setAnimateIn(true);
  }, [videoReady]);

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

        <div className={`hero-visual ${animateIn ? "hero-visual--animate" : ""}`} role="presentation" aria-hidden={false}>
          <div className="hero-visual__glow" aria-hidden />
          <div className="monitor">
            <div className="monitor__frame">
              <div className="monitor__bezel">
                <div className={`monitor__screen ${videoReady ? "monitor__screen--ready" : ""}`}>
                  <div className="monitor__placeholder" aria-hidden />
                  <video
                    ref={videoRef}
                    className="monitor__video"
                    src="https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/1114.mov"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                  />
                  <div className="monitor__overlay" />
                </div>
              </div>
              <div className="monitor__footer" aria-hidden>
                <span className="monitor__wordmark">MARANATHA HOMEPAGE</span>
              </div>
            </div>
            <div className="monitor__stand" aria-hidden />
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
          opacity: 1;
          transform: perspective(1200px) rotateY(-16deg) rotateX(6deg) translateY(0) scale(1.32);
          filter: drop-shadow(0 60px 120px rgba(0, 0, 0, 0.6));
          pointer-events: none;
        }

        .hero-visual--animate {
          animation: hero-visual-enter 1.2s cubic-bezier(0.4, 0, 0.2, 1) both;
        }

        .hero-visual__glow {
          position: absolute;
          inset: 12% -20%;
          background: radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.3), transparent 60%);
          filter: blur(40px);
          opacity: 0.6;
        }

        .monitor {
          position: relative;
          width: 100%;
          height: 100%;
          padding: clamp(14px, 2.8vw, 22px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }

        .monitor__frame {
          position: relative;
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          border-radius: 10px;
          background: linear-gradient(145deg, rgba(24, 26, 32, 0.97), rgba(12, 12, 18, 0.99));
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.03),
            inset 0 6px 16px rgba(255, 255, 255, 0.04),
            0 36px 90px rgba(0, 0, 0, 0.48);
        }

        .monitor__bezel {
          position: relative;
          flex: 1;
          padding: clamp(10px, 1.8vw, 16px);
          border-radius: 10px 10px 0 0;
        }

        .monitor__screen {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 7px;
          overflow: hidden;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.02),
            inset 0 0 36px rgba(0, 0, 0, 0.45);
          background: radial-gradient(circle at center, rgba(60, 64, 78, 0.24), rgba(20, 22, 30, 0.9));
        }

        .monitor__placeholder {
          position: absolute;
          inset: 0;
          background: linear-gradient(140deg, rgba(40, 42, 58, 0.65), rgba(16, 18, 28, 0.9));
          transition: opacity 0.3s ease-in-out;
        }

        .monitor__video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          filter: saturate(1.04);
          opacity: 0;
          transition: opacity 0.4s ease-in-out;
        }

        .monitor__screen--ready .monitor__video {
          opacity: 1;
        }

        .monitor__screen--ready .monitor__placeholder {
          opacity: 0;
        }

        .monitor__overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(72, 54, 160, 0.05), rgba(8, 12, 20, 0.16));
          pointer-events: none;
        }

        .monitor__footer {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(8px, 1.2vw, 12px);
          border-radius: 0 0 10px 10px;
          background: linear-gradient(180deg, rgba(236, 237, 244, 0.95), rgba(192, 196, 208, 0.88));
          box-shadow:
            inset 0 6px 12px rgba(255, 255, 255, 0.34),
            inset 0 -8px 14px rgba(140, 142, 150, 0.22);
        }

        .monitor__wordmark {
          font-size: clamp(0.68rem, 1.6vw, 0.9rem);
          font-weight: 600;
          letter-spacing: 0.36em;
          color: rgba(56, 58, 68, 0.75);
          text-transform: uppercase;
        }

        .monitor__stand {
          position: absolute;
          bottom: -1.6rem;
          width: clamp(150px, 44%, 220px);
          height: clamp(28px, 4vw, 40px);
          z-index: -1;
          background: linear-gradient(180deg, rgba(216, 218, 226, 0.9), rgba(152, 156, 168, 0.82));
          clip-path: polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%);
          border-radius: 0 0 18px 18px;
          box-shadow:
            inset 0 3px 6px rgba(255, 255, 255, 0.4),
            inset 0 -4px 8px rgba(0, 0, 0, 0.16),
            0 14px 30px rgba(0, 0, 0, 0.4);
        }

        @keyframes hero-visual-enter {
          0% {
            opacity: 0;
            transform: perspective(1200px) rotateY(-28deg) rotateX(12deg) translateY(140px) scale(0.92);
          }
          100% {
            opacity: 1;
            transform: perspective(1200px) rotateY(-16deg) rotateX(6deg) translateY(0) scale(1.32);
          }
        }

        @media (max-width: 1024px) {
          .hero-visual {
            width: 94vw;
            transform: perspective(1100px) rotateY(-20deg) rotateX(8deg) translateY(120px) scale(0.98);
          }

          .monitor {
            padding: clamp(12px, 3.2vw, 20px);
          }

          .monitor__bezel {
            padding: clamp(8px, 2vw, 14px);
          }

          .hero-visual--animate {
            animation: hero-visual-enter-md 1.2s cubic-bezier(0.4, 0, 0.2, 1) both;
          }
        }

        @media (max-width: 768px) {
          .hero-visual {
            width: 96vw;
            transform: perspective(1000px) rotateY(-10deg) rotateX(4deg) translateY(0) scale(1.18);
          }

          .monitor {
            padding: clamp(10px, 4vw, 18px);
          }

          .monitor__frame {
            border-radius: 8px;
          }

          .monitor__bezel {
            padding: clamp(6px, 2.6vw, 12px);
          }

          .monitor__screen {
            border-radius: 6px;
          }

          .monitor__stand {
            bottom: -1.4rem;
            width: clamp(130px, 48%, 190px);
            height: clamp(22px, 5vw, 34px);
          }

          .hero-visual--animate {
            animation: hero-visual-enter-sm 1.2s cubic-bezier(0.4, 0, 0.2, 1) both;
          }
        }

        @keyframes hero-visual-enter-md {
          0% {
            opacity: 0;
            transform: perspective(1100px) rotateY(-26deg) rotateX(10deg) translateY(110px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: perspective(1100px) rotateY(-20deg) rotateX(8deg) translateY(120px) scale(0.98);
          }
        }

        @keyframes hero-visual-enter-sm {
          0% {
            opacity: 0;
            transform: perspective(1000px) rotateY(-16deg) rotateX(7deg) translateY(80px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: perspective(1000px) rotateY(-10deg) rotateX(4deg) translateY(0) scale(1.18);
          }
        }

        .scroll-indicator {
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}
