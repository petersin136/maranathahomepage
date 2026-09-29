"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const ITEMS = [
  { href: "/admin/settings", label: "사업자 정보" },
  { href: "/admin/artists", label: "디자이너" },
  { href: "/admin/services", label: "시술" }
] as const;

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const on = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href as never}
            className={clsx(
              "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 font-sans-kr text-[14px] font-bold leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
              on
                ? "border-[#2F3A2F] bg-[#2F3A2F] text-white"
                : "border-[#9A948C] bg-white text-[#1C1C1C]"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
