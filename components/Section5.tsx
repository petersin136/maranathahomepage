"use client";

import { useState, useEffect } from "react";

const featureDescriptions: Record<string, Record<string, string>> = {
  basic: {
    "5페이지 (메인/소개/서비스/오시는길/문의)":
      "메인, 회사소개, 서비스, 오시는길, 문의 페이지로 구성됩니다. 전문 서비스업에 필요한 핵심 페이지만 포함되어 있습니다. 소규모 사업이나 시작 단계에 적합한 구성입니다.",
    "반응형 디자인 (PC + 모바일)":
      "컴퓨터, 태블릿, 스마트폰 등 모든 기기에서 최적화된 화면으로 표시됩니다. 화면 크기에 따라 자동으로 레이아웃이 조정되어 어디서나 보기 편합니다. 모바일 사용자가 70% 이상인 요즘, 필수적인 기능입니다.",
    "상담 신청 폼":
      "고객이 이름, 연락처, 상담 내용을 입력하여 바로 문의할 수 있습니다. 입력된 내용은 즉시 이메일이나 카카오톡으로 알림이 갑니다. 24시간 언제든 상담 신청을 받을 수 있어 영업 기회를 놓치지 않습니다.",
    "지도 연동":
      "네이버 지도와 구글 지도로 사무실 위치를 정확하게 표시합니다. 클릭 한 번으로 길찾기 앱이 실행되어 고객이 쉽게 찾아올 수 있습니다. 주변 대중교통, 주차장 정보까지 함께 안내 가능합니다.",
    "기본 SEO":
      "네이버와 구글 검색 엔진에 사이트가 잘 노출되도록 최적화합니다. 메타 태그, 사이트맵 등 검색 엔진이 좋아하는 구조로 제작됩니다. '지역명 + 업종' 검색 시 1-2페이지 노출을 목표로 작업합니다.",
    "6개월 무료 유지보수":
      "제작 완료 후 6개월간 오류 수정, 간단한 텍스트/이미지 변경을 무료로 지원합니다. 긴급한 문제 발생 시 24시간 내 대응해드립니다. 안심하고 사이트를 운영할 수 있도록 기술 지원을 제공합니다.",
  },
  standard: {
    "10페이지":
      "BASIC의 2배인 10개 페이지로 더욱 풍부한 정보를 제공할 수 있습니다. 팀 소개, 포트폴리오, FAQ, 고객후기 등 추가 페이지 구성이 가능합니다. 서비스를 세분화하여 전문성을 더욱 강조할 수 있습니다.",
    "프리미엄 디자인":
      "템플릿이 아닌 귀사만을 위한 100% 맞춤 디자인으로 제작합니다. 브랜드 컬러, 로고, 이미지를 활용해 독창적인 아이덴티티를 구축합니다. 경쟁사와 확실히 차별화되어 고객에게 전문적인 인상을 남깁니다.",
    "카카오톡 상담 연동":
      "클릭 한 번으로 카카오톡 채팅 상담이 바로 시작됩니다. 전화 통화가 부담스러운 고객도 편하게 문의할 수 있어 상담율이 높아집니다. 실시간 대화로 빠른 응대가 가능해 고객 만족도가 상승합니다.",
    "블로그/뉴스 게시판":
      "회사 소식, 성공 사례, 업계 정보 등을 직접 작성하여 올릴 수 있습니다. 정기적인 콘텐츠 업데이트로 SEO 효과가 지속적으로 향상됩니다. 고객과의 소통 창구로 활용하여 신뢰도를 높일 수 있습니다.",
    "고급 SEO":
      "키워드 분석부터 경쟁사 분석까지 전문적인 SEO 전략을 수립합니다. 구조화된 데이터, 속도 최적화 등 고급 기술을 적용합니다. 일반적으로 2-3개월 내 검색 1페이지 진입을 목표로 합니다.",
    "구글 애널리틱스":
      "하루 방문자 수, 어떤 경로로 유입되었는지 등 상세한 통계를 확인할 수 있습니다. 어떤 페이지가 인기 있는지, 고객이 어디서 이탈하는지 분석 가능합니다. 데이터 기반으로 사이트를 개선하여 전환율을 높일 수 있습니다.",
    "1년 무료 유지보수":
      "제작 완료 후 1년간 모든 수정과 업데이트를 무료로 제공합니다. 콘텐츠 변경, 기능 추가, 디자인 수정 등 무제한 지원합니다. 사업 성장에 맞춰 사이트도 함께 발전시킬 수 있습니다.",
  },
  premium: {
    "무제한 페이지":
      "페이지 개수 제한 없이 필요한 만큼 자유롭게 구성할 수 있습니다. 서비스별 상세 페이지, 사례 페이지 등 원하는 대로 확장 가능합니다. 사업이 성장하면서 콘텐츠를 계속 추가할 수 있어 장기적으로 유리합니다.",
    "맞춤형 디자인":
      "브랜드 아이덴티티를 완벽히 반영한 유일무이한 디자인을 제작합니다. 경쟁사와 완전히 차별화된 프리미엄 외관으로 브랜드 가치를 높입니다. 고급 애니메이션과 인터랙션으로 방문자에게 강한 인상을 남깁니다.",
    "온라인 예약 시스템":
      "고객이 24시간 언제든 원하는 시간에 상담/예약을 신청할 수 있습니다. 캘린더에서 예약 가능한 시간을 확인하고 바로 예약이 완료됩니다. 예약 확인 문자/이메일이 자동 발송되어 관리가 편리합니다.",
    "관리자 페이지":
      "예약 현황, 문의 내역을 한눈에 확인하고 관리할 수 있는 전용 페이지입니다. 고객 정보, 상담 이력을 체계적으로 저장하고 검색할 수 있습니다. 통계 대시보드로 월별 예약 추이, 인기 서비스 등을 분석할 수 있습니다.",
    "챗봇 상담":
      "24시간 365일 자동으로 고객 문의에 답변하는 AI 챗봇을 제공합니다. 영업시간 외에도 기본적인 안내와 상담 예약을 자동으로 처리합니다. 단순 반복 문의는 챗봇이 처리하여 업무 효율이 크게 향상됩니다.",
    "1년 무료 유지보수":
      "제작 완료 후 1년간 무제한 수정, 기능 추가, 최적화를 무료로 제공합니다. 월 1회 정기 점검으로 사이트 상태를 체크하고 개선 방안을 제안합니다. 사업 성장 단계에 맞춰 지속적으로 사이트를 업그레이드할 수 있습니다.",
  },
};

const packages = [
  {
    id: "basic",
    name: "BASIC",
    originalPrice: 500000,
    oneTimePrice: 320000,
    monthlyPrice: 69000,
    months: 6,
    features: [
      "5페이지 (메인/소개/서비스/오시는길/문의)",
      "반응형 디자인 (PC + 모바일)",
      "상담 신청 폼",
      "지도 연동",
      "기본 SEO",
      "6개월 무료 유지보수",
    ],
    period: "1주",
    popular: false,
  },
  {
    id: "standard",
    name: "STANDARD",
    originalPrice: 1000000,
    oneTimePrice: 630000,
    monthlyPrice: 139000,
    months: 6,
    features: [
      "10페이지",
      "프리미엄 디자인",
      "카카오톡 상담 연동",
      "블로그/뉴스 게시판",
      "고급 SEO",
      "구글 애널리틱스",
      "1년 무료 유지보수",
    ],
    period: "2주",
    popular: true,
  },
  {
    id: "premium",
    name: "PREMIUM",
    originalPrice: 1500000,
    oneTimePrice: 950000,
    monthlyPrice: 209000,
    months: 6,
    features: [
      "무제한 페이지",
      "맞춤형 디자인",
      "온라인 예약 시스템",
      "관리자 페이지",
      "챗봇 상담",
      "1년 무료 유지보수",
    ],
    period: "3주",
    popular: false,
  },
];

interface FeatureItemProps {
  feature: string;
  packageId: string;
}

function FeatureItem({ feature, packageId }: FeatureItemProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const description = featureDescriptions[packageId]?.[feature] || "";

  if (!description) {
    return (
      <div className="flex items-start gap-3 border-b border-[#333333] pb-3 text-sm text-[#d3d3d3] last:border-0 last:pb-0">
        <span className="mt-0.5 text-[#d3d3d3]">✓</span>
        <span className="flex-1 leading-relaxed">{feature}</span>
      </div>
    );
  }

  const handleToggle = () => {
    setIsTooltipVisible((prev) => !prev);
  };

  const handleMouseEnter = () => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  return (
    <div
      className="group relative flex items-start gap-3 border-b border-[#333333] pb-3 text-sm text-[#d3d3d3] last:border-0 last:pb-0"
      onMouseLeave={handleMouseLeave}
    >
      <span className="mt-0.5 text-[#d3d3d3]">✓</span>
      <span className="flex-1 leading-relaxed">{feature}</span>
      <button
        type="button"
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleToggle}
        className="relative z-10 mt-0.5 flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#999999] text-[10px] font-bold text-[#999999] transition-all duration-200 hover:border-[#D4AF37] hover:text-[#D4AF37] active:border-[#D4AF37] active:text-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 focus:ring-offset-[#1a1a1a]"
        aria-label="자세한 정보"
        aria-expanded={isTooltipVisible}
      >
        i
      </button>

      {/* 툴팁 */}
      {isTooltipVisible && (
        <>
          {/* 모바일 백드롭 */}
          <div
            className="fixed inset-0 z-[99] bg-black/20 md:hidden"
            onClick={handleMouseLeave}
            onTouchStart={handleMouseLeave}
          />
          <div
            className="tooltip-animate pointer-events-auto absolute left-0 right-0 top-full z-[100] mt-2 max-w-full rounded-lg bg-[rgba(26,26,26,0.95)] px-4 py-3 text-sm leading-relaxed text-white shadow-2xl backdrop-blur-sm md:left-auto md:right-0 md:top-8 md:max-w-[320px]"
            style={{
              lineHeight: "1.6",
              fontSize: "14px",
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* 화살표 - 데스크톱만 */}
            <div className="absolute -top-1 right-6 hidden h-2 w-2 rotate-45 bg-[rgba(26,26,26,0.95)] md:block" />
            <p>{description}</p>
          </div>
        </>
      )}
    </div>
  );
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
  packageName: string;
  features: string[];
}

function DetailModal({ isOpen, onClose, packageId, packageName, features }: DetailModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 백드롭 - 투명도 낮은 배경 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 콘텐츠 - 투명도 낮은 네모 창 */}
      <div
        className="modal-content relative z-[1001] max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg border border-[#666666] shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "rgba(26, 26, 26, 0.75)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* 헤더 */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between border-b border-[#444444] px-6 py-5 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(26, 26, 26, 0.85)",
          }}
        >
          <h3
            className="text-2xl font-semibold tracking-wide text-[#e5e5e5]"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {packageName} 상세 정보
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#666666] text-xl text-[#d3d3d3] transition-all duration-200 hover:border-[#888888] hover:text-[#f5f5f5] hover:bg-[#333333]"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        {/* 내용 */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(85vh - 80px)" }}>
          <div className="space-y-5">
            {features.map((feature, idx) => {
              const description = featureDescriptions[packageId]?.[feature] || "";
              if (!description) return null;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-[#444444]/40 p-5 transition-all duration-200 hover:border-[#555555] hover:bg-[rgba(255,255,255,0.05)]"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                  }}
                >
                  <h4 className="mb-3 text-lg font-medium text-[#e5e5e5]">{feature}</h4>
                  <p className="text-base leading-relaxed text-[#d3d3d3]">{description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Section5() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  const handleOpenModal = (packageId: string) => {
    setSelectedPackage(packageId);
    document.body.style.overflow = "hidden";
  };

  const handleCloseModal = () => {
    setSelectedPackage(null);
    document.body.style.overflow = "";
  };

  const selectedPkg = packages.find((pkg) => pkg.id === selectedPackage);

  return (
    <section
      id="pricing"
      className="bg-white px-6 py-20 sm:px-10 lg:px-16"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <div className="mb-12 text-center">
          <h2
            id="pricing-heading"
            className="text-5xl font-bold text-[#2a2a2a] sm:text-6xl lg:text-7xl"
          >
            Choose Your Plan
          </h2>
        </div>

        {/* 패키지 카드 - 레스토랑 메뉴판 스타일 */}
        <div className="grid gap-6 lg:grid-cols-3">
          {packages.map((pkg) => (
            <article
              key={pkg.id}
              className="relative flex flex-col overflow-visible rounded-sm bg-[#1a1a1a] transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              style={{
                border: "1px solid #D4AF37",
                minHeight: "600px",
                boxShadow: "0 10px 40px rgba(212, 175, 55, 0.3)",
              }}
            >
              <div className="relative flex flex-1 flex-col border border-[#D4AF37] m-2 overflow-visible">
                <div className="flex flex-1 flex-col p-6">
                  {/* 카테고리 타이틀 */}
                  <div className="mb-6 text-center">
                    <h3
                      className="text-xl font-bold tracking-wider text-[#d3d3d3]"
                      style={{
                        fontFamily: "Arial, sans-serif",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {pkg.name}
                    </h3>
                    <div className="mx-auto mt-3 h-px w-16 bg-[#D4AF37]"></div>
                  </div>

                  {/* 가격 */}
                  <div className="mb-6 space-y-3 text-center">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-3xl font-bold text-[#d3d3d3]">
                        {formatPrice(pkg.oneTimePrice)}
                      </span>
                      <span className="text-lg text-[#999999]">원</span>
                    </div>

                    {/* 할인 정보 - 텍스트로만 표시 */}
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#999999]">
                      <span className="line-through">
                        {formatPrice(pkg.originalPrice)}원
                      </span>
                      <span>오픈 기념 특가 30% 할인</span>
                    </div>
                  </div>

                  {/* 기능 목록 */}
                  <div className="mb-6 flex-1 space-y-3">
                    {pkg.features.map((feature, idx) => (
                      <FeatureItem key={idx} feature={feature} packageId={pkg.id} />
                    ))}
                  </div>

                  {/* 제작 기간 */}
                  <div className="mb-6 flex items-center justify-between border-t border-b border-[#333333] px-4 py-3">
                    <span className="text-sm text-[#999999]">제작기간</span>
                    <span className="text-sm font-medium text-[#d3d3d3]">
                      {pkg.period}
                    </span>
                  </div>

                  {/* 버튼 - 하단 고정 */}
                  <button
                    type="button"
                    onClick={() => handleOpenModal(pkg.id)}
                    className="mt-auto w-full rounded-sm border border-white bg-transparent px-6 py-3 text-sm font-medium text-[#d3d3d3] transition-all duration-200 hover:bg-white/10 hover:border-white/80"
                  >
                    자세히 알아보기
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 상세 정보 모달 */}
      {selectedPkg && (
        <DetailModal
          isOpen={selectedPackage !== null}
          onClose={handleCloseModal}
          packageId={selectedPkg.id}
          packageName={selectedPkg.name}
          features={selectedPkg.features}
        />
      )}
    </section>
  );
}