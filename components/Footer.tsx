import Link from "next/link";

const HOURS = [
  { day: "MON - FRI", time: "10:00 AM - 08:00 PM" },
  { day: "SAT", time: "10:00 AM - 09:00 PM" },
  { day: "SUN", time: "10:00 AM - 07:00 PM" }
] as const;

const SOCIAL = [
  { label: "INSTAGRAM", href: "https://instagram.com/hairup.official" },
  { label: "FACEBOOK", href: "https://facebook.com" },
  { label: "YOUTUBE", href: "https://youtube.com" }
] as const;

const BUSINESS = [
  { label: "상호명", value: "연주회" },
  { label: "대표자", value: "최연주" },
  { label: "사업자번호", value: "237-28-01677" },
  { label: "주소", value: "경기도 포천시 화현면 봉화로781번길 5-199" }
] as const;

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-hu-black text-hu-white" aria-label="사이트 푸터">
      <div className="mx-auto max-w-frame px-side py-[80px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
          {/* Brand */}
          <div className="flex flex-col justify-between">
            <p className="font-serif text-[40px] tracking-[0.06em]">HAIR UP</p>
            <div className="mt-12 space-y-1.5 lg:mt-auto">
              <p className="font-sans-kr text-[11px] tracking-[0.08em] text-hu-white/40">
                © {year} COPYRIGHT BY HAIR UP
              </p>
              <p className="font-sans-en text-[10px] tracking-[0.12em] text-hu-white/30">
                DESIGNED BY MARANATHA · abi
              </p>
            </div>
          </div>

          {/* Opening hours */}
          <div>
            <h3 className="font-serif text-[15px] tracking-[0.12em] text-hu-white">
              OPENING HOURS
            </h3>
            <dl className="mt-6 space-y-4">
              {HOURS.map((row) => (
                <div key={row.day}>
                  <dt className="font-sans-kr text-[12px] tracking-[0.06em] text-hu-white/80">
                    {row.day}
                  </dt>
                  <dd className="mt-1 font-sans-kr text-[13px] text-hu-white/60">{row.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Book your visit */}
          <div>
            <h3 className="font-serif text-[15px] tracking-[0.12em] text-hu-white">
              BOOK YOUR VISIT
            </h3>
            <p className="mt-6 font-serif text-[22px] tracking-[0.04em]">02.1234.5678</p>
            <p className="mt-3 font-sans-kr text-[13px] leading-[1.7] text-hu-white/60">
              서울특별시 강남구 청담동 123-4, 2층
            </p>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-serif text-[15px] tracking-[0.12em] text-hu-white">SOCIAL</h3>
            <ul className="mt-6 space-y-3">
              {SOCIAL.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    target="_blank"
                    className="font-sans-kr text-[13px] tracking-[0.06em] text-hu-white/70 transition-opacity hover:opacity-100"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Business info (사업자 정보) */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-white/10 pt-6">
          <dl className="flex flex-wrap gap-x-8 gap-y-2 font-sans-kr text-[11px] text-hu-white/35">
            {BUSINESS.map((row) => (
              <div key={row.label} className="flex gap-1.5">
                <dt>{row.label}</dt>
                <dd className="text-hu-white/50">{row.value}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/admin/login"
            className="font-sans-en text-[10px] tracking-[0.14em] text-hu-white/25 transition-colors hover:text-hu-white/50"
          >
            ADMIN
          </Link>
        </div>
      </div>
    </footer>
  );
}
