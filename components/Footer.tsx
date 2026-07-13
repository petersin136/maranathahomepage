export default function Footer() {
  const year = new Date().getFullYear();

  const businessRows = [
    { label: "상호명", value: "연주회" },
    { label: "대표자", value: "최연주" },
    { label: "사업자번호", value: "237-28-01677" },
    { label: "주소", value: "경기도 포천시 화현면 봉화로781번길 5-199" },
  ] as const;

  return (
    <footer
      id="contact"
      className="relative overflow-hidden bg-[#0a0a0a] text-white"
      aria-label="사업자 정보"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4AE3B5]/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#4AE3B5]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-sm space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#4AE3B5]/80">
              Hair Up
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">헤어업</h2>
            <p className="text-[15px] leading-relaxed text-white/55">
              헤어 디자이너와 샵을 위한 카톡·n8n 예약 자동화와 랜딩페이지 마케팅 솔루션
            </p>
          </div>

          <dl className="grid w-full max-w-xl gap-x-10 gap-y-5 sm:grid-cols-2">
            {businessRows.map((row) => (
              <div
                key={row.label}
                className={row.label === "주소" ? "sm:col-span-2" : undefined}
              >
                <dt className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/35">
                  {row.label}
                </dt>
                <dd className="mt-1.5 text-[15px] leading-snug text-white/85">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs tracking-wide text-white/35">
            © {year} 연주회. All rights reserved.
          </p>
          <p className="text-xs tracking-wide text-white/25">Business Information</p>
        </div>
      </div>
    </footer>
  );
}
