const categories = [
  {
    name: "CUT",
    items: [
      { name: "기본 컷", price: 25000 },
      { name: "시그니처 레이어드 / 디자인 컷", price: 35000 },
      { name: "맨즈 디자인 컷 (+다운펌 패키지)", price: 60000 }
    ]
  },
  {
    name: "PERM",
    items: [
      { name: "디자인 일반펌", price: 90000 },
      { name: "셋팅 / 디지털 열펌", price: 160000 },
      { name: "시그니처 볼륨매직 / 매직셋팅", price: 200000 }
    ]
  },
  {
    name: "COLOR",
    items: [
      { name: "베이직 전체 컬러", price: 100000 },
      { name: "프리미엄 케어 컬러", price: 140000 },
      { name: "디자인 탈색 / 발레아쥬 (1회 기준)", price: 150000 }
    ]
  },
  {
    name: "CLINIC & CARE",
    items: [
      { name: "수분 단백질 집중 케어", price: 80000 },
      { name: "프리미엄 모발 재생 클리닉", price: 150000 },
      { name: "스칼프 두피 스파 케어", price: 70000 }
    ]
  }
] as const;

function formatPrice(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function MobilePricingMenu() {
  return (
    <section
      id="pricing"
      className="bg-hu-white px-[20px] py-[64px]"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto w-[350px] max-w-full">
        <h2
          id="pricing-heading"
          className="font-serif text-[32px] font-medium tracking-[0.04em] text-hu-black"
        >
          PRICING MENU
        </h2>
        <p className="mt-3 font-sans-kr text-[13px] font-medium tracking-[-0.01em] text-hu-accent">
          시술 메뉴 및 가격
        </p>
        <div className="mt-6 space-y-2 font-sans-kr text-[12px] leading-[1.7] text-hu-black">
          <p>기장 및 모량, 사용하는 약제 종류에 따라 시술 금액이 변동될 수 있습니다.</p>
          <p>디자이너 직급(원장/부원장/실장)에 따라 직급별 수수료가 적용될 수 있습니다.</p>
        </div>

        <a
          href="#booking"
          className="mt-8 inline-flex h-[48px] w-full items-center justify-between bg-hu-cta px-5 font-sans-kr text-[13px] font-medium text-hu-white"
        >
          <span>원하는 시술로 바로 예약하기</span>
          <span aria-hidden>›</span>
        </a>

        <div className="mt-10 flex flex-col gap-8">
          {categories.map((category) => (
            <div key={category.name}>
              <h3 className="font-serif text-[13px] font-medium tracking-[0.14em] text-hu-accent">
                {category.name}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {category.items.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-baseline gap-2 font-sans-kr text-[13px] text-hu-black"
                  >
                    <span className="min-w-0 shrink">{item.name}</span>
                    <span
                      className="mb-[0.35em] min-w-[16px] flex-1 border-b border-dotted border-hu-leader"
                      aria-hidden
                    />
                    <span className="shrink-0 tabular-nums">{formatPrice(item.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
