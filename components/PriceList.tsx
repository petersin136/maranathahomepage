"use client";

interface ServiceItem {
  name: string;
  price: number;
}

interface ServiceSection {
  title: string;
  leftColumn: ServiceItem[];
  rightColumn: ServiceItem[];
}

const serviceSections: ServiceSection[] = [
  {
    title: "Cut & Styling",
    leftColumn: [
      { name: "커트 | 디자이너", price: 30000 },
      { name: "커트 | 실장", price: 35000 },
      { name: "드라이 | 디자이너", price: 20000 },
      { name: "드라이 | 실장", price: 30000 },
    ],
    rightColumn: [
      { name: "스타일링", price: 20000 },
      { name: "앞머리 커트", price: 8000 },
      { name: "샴푸", price: 10000 },
    ],
  },
  {
    title: "Perm",
    leftColumn: [
      { name: "앞머리", price: 30000 },
      { name: "뿌리펌", price: 100000 },
      { name: "남자펌 (공통)", price: 120000 },
      { name: "뿌리매직", price: 150000 },
    ],
    rightColumn: [
      { name: "숏", price: 150000 },
      { name: "미디엄", price: 180000 },
      { name: "롱", price: 200000 },
    ],
  },
  {
    title: "Color & Care",
    leftColumn: [
      { name: "뿌리염색", price: 60000 },
      { name: "숏", price: 100000 },
      { name: "미디엄", price: 120000 },
      { name: "롱", price: 150000 },
    ],
    rightColumn: [
      { name: "모발 클리닉", price: 50000 },
      { name: "두피 클리닉", price: 30000 },
    ],
  },
];

export default function PriceList() {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  return (
    <section className="bg-[#e8e8e8] px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-16 text-center">
          <h1 className="mb-3 text-5xl font-bold text-[#2a2a2a] sm:text-6xl">Your LOGO</h1>
          <p className="text-sm tracking-[0.4em] text-[#4a4a4a] sm:text-base">HAIR BOUTIQUE</p>
        </div>

        {/* 요금표 섹션 */}
        <div className="space-y-6">
          {serviceSections.map((section, sectionIndex) => {
            const maxRows = Math.max(section.leftColumn.length, section.rightColumn.length);

            return (
              <div
                key={sectionIndex}
                className="overflow-hidden rounded-tl-[24px] border-[1.5px] border-[#333333] bg-white"
              >
                {/* 섹션 타이틀 */}
                <div className="border-b-[1.5px] border-[#333333] px-6 py-4">
                  <h2 className="text-xl font-semibold text-[#2a2a2a]">{section.title}</h2>
                </div>

                {/* 서비스 목록 - 행 단위로 렌더링 */}
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {/* 왼쪽 컬럼 */}
                  <div className="border-r-[1.5px] border-[#333333]">
                    {Array.from({ length: maxRows }).map((_, rowIndex) => {
                      const leftItem = section.leftColumn[rowIndex];
                      const isLastRow = rowIndex === maxRows - 1;

                      return (
                        <div
                          key={rowIndex}
                          className={`flex items-center justify-between px-6 py-4 ${
                            !isLastRow ? "border-b-[1.5px] border-[#333333]" : ""
                          }`}
                        >
                          {leftItem ? (
                            <>
                              <span className="text-[#2a2a2a]">{leftItem.name}</span>
                              <span className="font-medium text-[#2a2a2a]">
                                {formatPrice(leftItem.price)}
                              </span>
                            </>
                          ) : (
                            <div className="flex-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 오른쪽 컬럼 */}
                  <div>
                    {Array.from({ length: maxRows }).map((_, rowIndex) => {
                      const rightItem = section.rightColumn[rowIndex];
                      const isLastRow = rowIndex === maxRows - 1;

                      return (
                        <div
                          key={rowIndex}
                          className={`flex items-center justify-between px-6 py-4 ${
                            !isLastRow ? "border-b-[1.5px] border-[#333333]" : ""
                          }`}
                        >
                          {rightItem ? (
                            <>
                              <span className="text-[#2a2a2a]">{rightItem.name}</span>
                              <span className="font-medium text-[#2a2a2a]">
                                {formatPrice(rightItem.price)}
                              </span>
                            </>
                          ) : (
                            <div className="flex-1" />
                          )}
                        </div>
                      );
                    })}
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