"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const filters = [
  { id: "all", label: "전체" },
  { id: "tax", label: "세무 컨설팅" },
  { id: "law", label: "법률 서비스" },
  { id: "medical", label: "의료·병원" },
  { id: "church", label: "교회" },
];

type Project = {
  id: string;
  tags: string[];
  title: string;
  description: string;
  categories: string[];
  desktopImage?: string;
  mobileImage?: string;
  desktopUrl?: string;
  mobileUrl?: string;
  desktopOffset?: { x: number; y: number };
  mobileOffset?: { x: number; y: number };
  link?: string;
  desktopAspect?: string;
  mobileAspect?: string;
};

const projects: Project[] = [
  {
    id: "maranatha",
    tags: ["세무법인 · 맞춤 설계"],
    title: "MARANATHA",
    description: "프리미엄 세무 컨설팅을 위한 고급스러운 웹사이트. 3D 효과와 인터랙션으로 브랜드 신뢰를 극대화했습니다.",
    categories: ["tax"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/desk.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
  {
    id: "apex-legal",
    tags: ["법률 서비스"],
    title: "Apex Legal Group",
    description: "법률 서비스의 전문성과 신뢰를 담은 클래식한 디자인. 모바일 퍼널 최적화에 초점을 맞췄습니다.",
    categories: ["tax"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/desk2.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo2.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
  {
    id: "verity-law",
    tags: ["법률 서비스"],
    title: "Verity Law Partners",
    description: "신뢰와 전문성을 강조한 로펌 웹사이트. 다국어 대응과 상담 전환 동선을 강화했습니다.",
    categories: ["law"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/de3.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo3.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
  {
    id: "praxis-legal",
    tags: ["법률 서비스"],
    title: "Praxis Legal Studio",
    description: "프리미엄 리걸 서비스를 위한 모던하고 정교한 레이아웃. 브랜드 컬러와 세심한 마이크로 인터랙션을 적용했습니다.",
    categories: ["law"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/de4.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo4.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
  {
    id: "lumière-medical",
    tags: ["의료 서비스"],
    title: "Lumière Medical Center",
    description: "하이엔드 메디컬 클리닉 브랜딩을 구현한 사이트. 라이트/다크 모두 선명한 가독성과 예약 전환을 강화했습니다.",
    categories: ["medical"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/de5.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo5.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
  {
    id: "celestia-health",
    tags: ["의료 서비스"],
    title: "Celestia Health Lab",
    description: "첨단 메디컬 연구소의 신뢰감을 강조한 인터페이스. 데이터 시각화와 예약 CTA를 직관적으로 배치했습니다.",
    categories: ["medical"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/de6.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo6.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
  {
    id: "grace-church",
    tags: ["교회 · 브랜딩"],
    title: "Grace Fellowship Church",
    description: "현대적 신앙 공동체의 따뜻한 분위기를 담은 웹사이트. 주간 예배 일정과 사역 소개를 직관적으로 구성했습니다.",
    categories: ["church"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/de7.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo7.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
  {
    id: "newlight-church",
    tags: ["교회 · 캠페인"],
    title: "Newlight Worship Center",
    description: "예배 생중계와 사역 후원 CTA를 강조한 교회 랜딩 페이지. 다크 모드에서도 빛나는 컬러 대비를 구현했습니다.",
    categories: ["church"],
    desktopImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/de8.jpg",
    mobileImage: "https://mhnrqqnwljoyiguqzrcp.supabase.co/storage/v1/object/public/portfolio-media/mo8.jpg",
    desktopAspect: "16 / 9",
    mobileAspect: "9 / 19.5",
  },
];

const marqueeWords = Array.from({ length: 30 }, (_, index) => ({
  label: "PORTFOLIO",
  colorClass: ["color-white", "color-red", "color-white", "color-green", "color-white"][index % 5],
}));

export default function Section2() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const rafRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

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
      { threshold: 0.2 },
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateOffset = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const total = viewportHeight + rect.height;
      const rawProgress = (viewportHeight - rect.top) / total;
      const progress = clamp(rawProgress, 0, 1);
      setScrollOffset((prev) => prev + ((-progress * 5) - prev) * 0.08);
      rafRef.current = null;
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(updateOffset);
    };

    updateOffset();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "all") return projects;
    return projects.filter((project) => project.categories.includes(activeFilter));
  }, [activeFilter]);

  return (
    <section
      id="comparison"
      ref={sectionRef}
      className="relative overflow-hidden bg-black px-6 py-28 text-white sm:px-10 lg:px-16"
      aria-labelledby="showcase-heading"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black via-black to-[#050505]" aria-hidden />

      <div className="marquee-shell" aria-hidden>
        <div
          className="marquee-offset"
          aria-hidden
          style={{ transform: `translate3d(${scrollOffset}%, 0, 0)` }}
        >
          <div className="marquee-row">
            {marqueeWords.map((item, index) => (
              <span key={`main-${index}`} className={item.colorClass}>{`${item.label}\u00A0`}</span>
            ))}
          </div>
          <div className="marquee-row" aria-hidden>
            {marqueeWords.map((item, index) => (
              <span key={`dup-${index}`} className={item.colorClass}>{`${item.label}\u00A0`}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="section-heading-placeholder" aria-hidden />

      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-20 px-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
          <aside className="lg:w-40 xl:w-48">
            <div className="hidden text-sm uppercase tracking-[0.3em] text-white/40 lg:block">Filter</div>
            <div className="mt-4 space-y-2 text-base font-medium">
              {filters.map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    aria-pressed={isActive}
                    className={`group flex w-full items-center justify-between rounded-full px-4 py-3 transition ${
                      isActive ? "bg-white text-black" : "text-white/60 hover:text-white"
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className="text-xs uppercase tracking-[0.28em] text-white/40 group-hover:text-white/60">
                      {isActive ? "●" : "○"}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="flex-1">
            <div className="grid gap-16 lg:grid-cols-2">
              {filteredProjects.map((project, index) => {
                const hasDesktopUrl = Boolean(project.desktopUrl);
                const hasMobileUrl = Boolean(project.mobileUrl);
                const desktopScale = hasDesktopUrl ? 0.6 : 1;
                const mobileScale = hasMobileUrl ? 0.7 : 1;

                return (
                  <article
                    key={project.id}
                    className={`group relative flex h-full flex-col overflow-visible rounded-[32px] bg-[#0B0B0F]/95 shadow-[0_50px_120px_rgba(2,6,23,0.55)] ring-1 ring-white/5 transition duration-500 ${
                      visible ? "portfolio-card--visible" : "scale-[0.98] opacity-0"
                    }`}
                    style={{ transitionDelay: `${visible ? index * 120 : 0}ms` }}
                  >
                    <div className="relative w-full overflow-visible pb-20">
                      <div className="desktop-shell relative w-full overflow-hidden rounded-[28px] border border-white/12 bg-[#0f101a] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                        <div className="flex items-center gap-2 border-b border-white/10 bg-[#090b14]/95 px-5 py-3 rounded-t-[28px]">
                          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                        </div>
                        <div
                          className="relative w-full overflow-hidden rounded-b-[28px] bg-black"
                          style={{ aspectRatio: project.desktopAspect ?? "16 / 10" }}
                        >
                          {hasDesktopUrl ? (
                            <iframe
                              src={project.desktopUrl}
                              title={`${project.title} 데스크톱 미리보기`}
                              loading="lazy"
                              style={{
                                width: `${100 / desktopScale}%`,
                                height: `${100 / desktopScale}%`,
                                transform: `translate(${project.desktopOffset?.x ?? 0}%, ${project.desktopOffset?.y ?? 0}%) scale(${desktopScale})`,
                                transformOrigin: "top left",
                                border: 0,
                              }}
                            />
                          ) : (
                            project.desktopImage && (
                              <Image
                                src={project.desktopImage}
                                alt={`${project.title} 데스크톱 미리보기`}
                                fill
                                sizes="(max-width: 1024px) 90vw, 640px"
                                className="object-contain object-top"
                                priority={index === 0}
                              />
                            )
                          )}
                        </div>
                      </div>

                      <div className="mobile-preview absolute -right-14 -bottom-10 w-36 translate-y-0 transition duration-500 ease-out group-hover:-translate-y-5 lg:w-[10.5rem]">
                        <div className="relative w-full rounded-[26px] border border-white/12 bg-[#111627]/90 p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                          <div className="absolute left-1/2 top-1.5 h-2.5 w-14 -translate-x-1/2 rounded-b-2xl bg-[#0d1220]" />
                          <div
                            className="relative w-full overflow-hidden rounded-[20px] border border-white/8 bg-black"
                            style={{ aspectRatio: project.mobileAspect ?? "9 / 19" }}
                          >
                            {hasMobileUrl ? (
                              <iframe
                                src={project.mobileUrl}
                                title={`${project.title} 모바일 미리보기`}
                                loading="lazy"
                                style={{
                                  width: `${100 / mobileScale}%`,
                                  height: `${100 / mobileScale}%`,
                                  transform: `translate(${project.mobileOffset?.x ?? 0}%, ${project.mobileOffset?.y ?? 0}%) scale(${mobileScale})`,
                                  transformOrigin: "top left",
                                  border: 0,
                                }}
                              />
                            ) : (
                              project.mobileImage && (
                                <Image
                                  src={project.mobileImage}
                                  alt={`${project.title} 모바일 미리보기`}
                                  fill
                                  sizes="120px"
                                  className="object-contain object-top"
                                  loading="lazy"
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between gap-6 px-8 pb-10 pt-4">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-[28px] font-semibold leading-snug text-white lg:text-[32px]">{project.title}</h3>
                          <p className="text-sm leading-relaxed text-white/55">{project.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.32em] text-white/55">
                        <span>View case</span>
                        <span className="text-lg">↗</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee-shell {
          position: relative;
          min-height: clamp(120px, 14vw, 170px);
          overflow: hidden;
          display: flex;
          align-items: center;
          margin-top: clamp(30px, 5vw, 60px);
          margin-bottom: clamp(44px, 7vw, 86px);
          padding: clamp(16px, 2vw, 28px) 0;
        }

        .marquee-shell::before,
        .marquee-shell::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: clamp(12px, 1.2vw, 18px);
          pointer-events: none;
          z-index: 2;
          background: linear-gradient(to bottom, black, transparent);
        }

        .marquee-shell::after {
          top: auto;
          bottom: 0;
          background: linear-gradient(to top, black, transparent);
        }

        .marquee-shell::before {
          top: 0;
        }

        .marquee-offset {
          display: flex;
          will-change: transform;
        }

        .marquee-row {
          display: flex;
          gap: clamp(2rem, 5vw, 4rem);
          animation: marqueeFlow 260s linear infinite;
        }

        .marquee-row:nth-of-type(2) {
          animation-delay: -130s;
        }

        .marquee-row span {
          font-family: "Poppins", "Pretendard Variable", "Noto Sans KR", sans-serif;
          font-size: clamp(3.4rem, 10.5vw, 11rem);
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: transparent;
          -webkit-text-stroke-width: 2.4px;
          line-height: 1;
          white-space: nowrap;
        }

        .color-white {
          -webkit-text-stroke-color: rgba(255, 255, 255, 0.85);
        }

        .color-red {
          -webkit-text-stroke-color: rgba(255, 0, 85, 0.85);
        }

        .color-green {
          -webkit-text-stroke-color: rgba(22, 255, 110, 0.85);
        }

        @keyframes marqueeFlow {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        .portfolio-card {
          opacity: 0;
          transform: translateY(40px) scale(0.96);
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .portfolio-card--visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .portfolio-card:hover,
        .portfolio-card:focus-visible {
          transform: translateY(-16px);
        }

        .portfolio-card:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.3);
          outline-offset: 6px;
        }

        .mobile-preview {
          will-change: transform;
        }
      `}</style>
    </section>
  );
}
