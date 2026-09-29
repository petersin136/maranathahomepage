"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const ITEMS = [
  { href: "/admin/sales", label: "매출" },
  { href: "/admin/settlements", label: "정산" },
  { href: "/admin/expenses", label: "비용" },
  { href: "/admin/tax", label: "세무" },
  { href: "/admin/export", label: "내보내기" }
] as const;

export default function FinanceNav() {
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
              "inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 font-sans-kr text-[14px] font-bold",
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
