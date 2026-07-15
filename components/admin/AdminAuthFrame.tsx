import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminAuthFrame({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f6] text-hu-black">
      <header className="border-b border-hu-black/10 bg-hu-black px-8 py-5 text-hu-white">
        <div className="mx-auto flex max-w-[440px] items-baseline justify-between">
          <Link href="/" className="font-serif text-[20px] tracking-[0.08em]">
            HAIR UP
          </Link>
          <span className="font-sans-kr text-[12px] text-white/45">Staff Admin</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col px-8 py-16">
        <h1 className="font-serif text-[32px] tracking-[0.06em]">{title}</h1>
        {subtitle ? (
          <p className="mt-3 font-sans-kr text-[13px] leading-relaxed text-hu-muted">{subtitle}</p>
        ) : null}
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
