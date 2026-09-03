import Link from "next/link";

const HOURS = [
  { day: "MON - FRI", time: "10:00 AM - 08:00 PM" },
  { day: "SAT", time: "10:00 AM - 09:00 PM" },
  { day: "SUN", time: "10:00 AM - 07:00 PM" }
] as const;

const SOCIAL = [
  { label: "INSTAGRAM", href: "https://www.instagram.com/hairup_official/" },
  { label: "FACEBOOK", href: "https://facebook.com" },
  { label: "YOUTUBE", href: "https://youtube.com" }
] as const;

const BUSINESS = [
  { label: "상호명", value: "연주회" },
  { label: "대표자", value: "최연주" },
  { label: "사업자번호", value: "237-28-01677" },
  { label: "주소", value: "경기도 포천시 화현면 봉화로781번길 5-199" }
] as const;

export function MobileFooter() {
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-hu-black px-[20px] py-[64px] text-hu-white" aria-label="사이트 푸터">
      <div className="mx-auto flex w-[350px] max-w-full flex-col gap-10">
        <p className="font-serif text-[28px] tracking-[0.06em]">HAIR UP</p>

        <div>
          <h3 className="font-serif text-[13px] tracking-[0.12em] text-hu-white">OPENING HOURS</h3>
          <dl className="mt-4 space-y-3">
            {HOURS.map((row) => (
              <div key={row.day}>
                <dt className="font-sans-kr text-[11px] tracking-[0.06em] text-hu-white/80">
                  {row.day}
                </dt>
                <dd className="mt-1 font-sans-kr text-[12px] text-hu-white/60">{row.time}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h3 className="font-serif text-[13px] tracking-[0.12em] text-hu-white">BOOK YOUR VISIT</h3>
          <p className="mt-4 font-serif text-[18px] tracking-[0.04em]">02.1234.5678</p>
          <p className="mt-2 font-sans-kr text-[12px] leading-[1.7] text-hu-white/60">
            서울특별시 강남구 청담동 123-4, 2층
          </p>
        </div>

        <div>
          <h3 className="font-serif text-[13px] tracking-[0.12em] text-hu-white">SOCIAL</h3>
          <ul className="mt-4 flex flex-col gap-2">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  target="_blank"
                  className="font-sans-kr text-[12px] tracking-[0.06em] text-hu-white/70"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 pt-6">
          <dl className="flex flex-col gap-1.5 font-sans-kr text-[11px] text-hu-white/35">
            {BUSINESS.map((row) => (
              <div key={row.label} className="flex gap-1.5">
                <dt>{row.label}</dt>
                <dd className="text-hu-white/50">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-sans-kr text-[10px] tracking-[0.08em] text-hu-white/40">
            © {year} COPYRIGHT BY HAIR UP
          </p>
          <p className="mt-1 font-sans-en text-[10px] tracking-[0.12em] text-hu-white/30">
            DESIGNED BY MARANATHA · abi
          </p>
          <Link
            href="/admin/login"
            className="mt-4 inline-block font-sans-en text-[10px] tracking-[0.14em] text-hu-white/25"
          >
            ADMIN
          </Link>
        </div>
      </div>
    </footer>
  );
}
