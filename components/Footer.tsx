export default function Footer() {
  const year = new Date().getFullYear();

  const businessRows = [
    { label: "상호명", value: "연주회" },
    { label: "대표자", value: "최연주" },
    { label: "사업자번호", value: "237-28-01677" },
    { label: "주소", value: "경기도 포천시 화현면 봉화로781번길 5-199" }
  ] as const;

  return (
    <footer id="contact" className="bg-hu-black text-hu-white" aria-label="사업자 정보">
      <div className="hu-container py-16">
        <p className="font-serif text-[28px] tracking-[0.08em]">HAIR UP</p>
        <dl className="mt-8 grid gap-4 font-sans-kr text-[13px] text-white/70 sm:grid-cols-2">
          {businessRows.map((row) => (
            <div key={row.label} className={row.label === "주소" ? "sm:col-span-2" : undefined}>
              <dt className="text-[11px] tracking-[0.16em] text-white/35">{row.label}</dt>
              <dd className="mt-1 text-white/80">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 border-t border-white/10 pt-5 text-xs text-white/35">
          © {year} 연주회. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
