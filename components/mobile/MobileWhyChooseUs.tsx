"use client";

import { useState } from "react";
import { clsx } from "clsx";

const items = [
  {
    id: "01",
    title: "01. PERSONAL HAIR CONSULTS",
    emphasize: "오직 당신만을 위한 1:1 퍼스널 카운셀링",
    body: "모든 디자인은 깊이 있는 소통에서 시작됩니다. 평소의 라이프스타일과 니즈를 완벽히 이해하여, 인위적이지 않고 오랜 시간 자연스럽게 어우러지는 감도 높은 맞춤형 스타일을 제안합니다."
  },
  {
    id: "02",
    title: "02. PASSIONATE CREATIVE STYLISTS",
    emphasize: "트렌드를 완성하는 열정적인 크리에이티브 스타일리스트",
    body: "끊임없는 연구와 감각으로 무장한 전문 스타일리스트가 함께합니다. 당신의 개성과 라이프스타일을 이해하고, 유행을 넘어 오래도록 아름다운 스타일을 완성합니다."
  },
  {
    id: "03",
    title: "03. RELAXING SALON EXPERIENCE",
    emphasize: "온전한 휴식이 되는 프라이빗 살롱 경험",
    body: "감각적인 공간과 세심한 케어 속에서 진정한 여유를 누리세요. 머무는 순간까지 특별하도록, 편안하고 품격 있는 시간을 선사합니다."
  },
  {
    id: "04",
    title: "04. EASY ONLINE BOOKING",
    emphasize: "언제 어디서나 간편한 온라인 예약",
    body: "원하는 시간과 스타일리스트를 손쉽게 예약하세요. 복잡한 절차 없이 몇 번의 터치만으로, 당신의 소중한 시간을 지켜드립니다."
  }
] as const;

export function MobileWhyChooseUs() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section
      id="about"
      className="bg-hu-white px-[20px] py-[64px]"
      aria-labelledby="why-choose-us-heading"
    >
      <div className="mx-auto w-[350px] max-w-full">
        <p className="font-serif text-[13px] font-normal tracking-[0.01em] text-hu-muted">
          About us
        </p>
        <h2
          id="why-choose-us-heading"
          className="mt-2 font-serif text-[32px] font-medium leading-[1.08] tracking-[0.01em] text-hu-black"
        >
          <span className="block">WHY</span>
          <span className="block">CHOOSE US</span>
        </h2>

        <div className="mt-8 flex flex-col gap-3">
          {items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className="overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="flex min-h-[56px] w-full items-center justify-between bg-hu-beige px-4 py-3 text-left"
                >
                  <span className="pr-3 font-serif text-[12px] font-medium tracking-[0.03em] text-hu-black">
                    {item.title}
                  </span>
                  <span
                    aria-hidden
                    className={clsx(
                      "shrink-0 text-[11px] text-hu-muted transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  >
                    ∨
                  </span>
                </button>
                <div
                  className={clsx(
                    "grid transition-[grid-template-rows] duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="bg-hu-white px-4 pb-6 pt-4">
                      <p className="font-sans-kr text-[14px] font-bold leading-[1.5] text-hu-black">
                        {item.emphasize}
                      </p>
                      <p className="mt-2 font-sans-kr text-[13px] font-normal leading-[1.75] text-hu-body">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
