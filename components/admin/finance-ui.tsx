"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

export const TRIM_KR = "[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";

export const TABLE_HEAD_ROW = "border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]";
export const TABLE_ROW = "border-b border-[#F3EFEA]";
export const TH = "py-3 pr-3 font-bold";
export const TD = "py-[15px] pr-3";

export const INPUT =
  "h-[34px] rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[14px] font-medium text-[#1C1C1C] outline-none placeholder:text-[#B5AFA7] focus:border-[color:var(--input-border-active)]";

const FINANCE_TABS = [
  { href: "/admin/sales", label: "매출" },
  { href: "/admin/settlements", label: "정산" },
  { href: "/admin/expenses", label: "비용" },
  { href: "/admin/tax", label: "세무" },
  { href: "/admin/export", label: "내보내기" }
] as const;

export function won(value: number | null | undefined) {
  return value != null ? `${value.toLocaleString("ko-KR")}원` : "—";
}

export function pct(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function Icon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain"
      }}
    />
  );
}

export function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-[15px] w-[15px] shrink-0 text-[#9A948C]" fill="none">
      <rect x="2.2" y="3.2" width="11.6" height="10.6" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.2 6.4h11.6M5.4 1.8v2.6M10.6 1.8v2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="M10 3.5 5.5 8l4.5 4.5" /> : <path d="M6 3.5 10.5 8 6 12.5" />}
    </svg>
  );
}

/** 매출·정산 공통 헤더: 제목 + 하위 탭 (예약관리 화면과 같은 구조) */
export function FinanceHeader({
  subtitle,
  right,
  embedded = false
}: {
  subtitle?: string;
  right?: React.ReactNode;
  embedded?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className={embedded ? undefined : "sticky top-0 z-20 bg-white pt-10"}>
      <div className="flex items-center justify-between gap-6 pt-6">
        <h1 className="flex items-baseline gap-2 text-[30px] font-bold leading-none tracking-[-0.02em]">
          매출·정산
          {subtitle ? <span className="text-[15px] font-normal tracking-normal text-[#8A847C]">{subtitle}</span> : null}
        </h1>
        {right}
      </div>
      <nav className="mt-[66px] flex border-b border-[#E6E1DA]">
        {FINANCE_TABS.map((t) => {
          const on = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "-mb-px flex items-end border-b-2 px-[18px] pb-[14px] text-[16px] leading-none",
                on ? "border-[#1C1C1C] text-[#1C1C1C]" : "border-transparent text-[#8A847C] hover:text-[#1C1C1C]"
              )}
            >
              <span className={clsx(TRIM_KR, on ? "font-bold" : "font-normal")}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** 탭 아래 필터·액션 줄 */
export function Toolbar({ left, right }: { left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mt-[34px] flex items-center gap-[6px]">
      {left}
      {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (ref.current?.contains(target) || target.closest?.("[data-admin-date]")) return;
      close();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

export function ChipDropdown({
  icon,
  label,
  width = 202,
  children
}: {
  icon?: React.ReactNode;
  label: React.ReactNode;
  width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useOutsideClose(open, close);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width }}
        className="flex h-[34px] items-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
      >
        {icon ?? <CalendarIcon />}
        <span className="ml-2 min-w-0 truncate leading-normal">{label}</span>
        <Icon
          src={open ? "/admin-icons/lnb/chevron-down-bold.png" : "/admin-icons/lnb/chevron-down.png"}
          className={clsx("ml-auto h-[16px] w-[16px] text-[#9A948C]", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="absolute left-0 top-[40px] z-30 w-max min-w-full rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

export function PanelOption({
  label,
  selected,
  onClick
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-5 py-2 text-left text-[14px] text-[#1C1C1C] hover:bg-[#F6F4F0]"
    >
      {label}
      {selected ? <Icon src="/admin-icons/lnb/check.png" className="ml-4 h-[12px] w-[12px]" /> : null}
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  disabled,
  children
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white text-[#9A948C] hover:bg-[#F6F4F0] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function RefreshButton({ onClick, spinning }: { onClick: () => void; spinning?: boolean }) {
  return (
    <IconButton label="새로고침" onClick={onClick} disabled={spinning}>
      <Icon src="/admin-icons/lnb/refresh.png" className={clsx("h-[16px] w-[16px]", spinning && "animate-spin")} />
    </IconButton>
  );
}

export function shiftMonth(year: number, month: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1 };
}

/** [2026년 10월 ▾] — 매출 기간 칩과 같은 모양. 안에서 연도·월을 고른다. */
export function MonthPicker({
  year,
  month,
  onChange
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const [viewYear, setViewYear] = useState(year);
  useEffect(() => setViewYear(year), [year]);

  return (
    <ChipDropdown label={`${year}년 ${month}월`}>
      {(close) => (
        <div className="w-[248px] px-4 py-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="이전 연도"
              onClick={() => setViewYear((y) => y - 1)}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#9A948C] hover:bg-[#F6F4F0]"
            >
              <Chevron dir="left" />
            </button>
            <span className="text-[15px] font-bold">{viewYear}년</span>
            <button
              type="button"
              aria-label="다음 연도"
              onClick={() => setViewYear((y) => y + 1)}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#9A948C] hover:bg-[#F6F4F0]"
            >
              <Chevron dir="right" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const on = viewYear === year && m === month;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onChange(viewYear, m);
                    close();
                  }}
                  className={clsx(
                    "h-[34px] rounded-[6px] text-[14px] font-medium",
                    on ? "bg-[#2F3A2F] font-bold text-white" : "text-[#1C1C1C] hover:bg-[#F6F4F0]"
                  )}
                >
                  {m}월
                </button>
              );
            })}
          </div>
        </div>
      )}
    </ChipDropdown>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  danger,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex h-[34px] min-w-[96px] items-center justify-center gap-2 rounded-[8px] px-4 text-[14px] font-bold leading-none text-white disabled:opacity-40",
        danger ? "bg-[#E24B4B]" : "bg-[#2F3A2F]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  disabled,
  className
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "inline-flex h-[34px] items-center justify-center rounded-[8px] border border-[#E4E0DA] bg-white px-4 text-[14px] font-bold leading-none text-[#3A3A3A] hover:bg-[#F6F4F0] disabled:opacity-40",
        className
      )}
    >
      {children}
    </button>
  );
}

export type StatItem = {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger" | "muted";
  href?: string;
};

/** 고객 상세와 같은 요약 줄 — cols 개씩 줄바꿈 */
export function StatStrip({
  items,
  cols = items.length,
  className = "mt-10"
}: {
  items: StatItem[];
  cols?: number;
  className?: string;
}) {
  return (
    <dl
      className={clsx("grid border-y-[1.5px] border-[#C9C3BB]", className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((item, i) => {
        const first = i % cols === 0;
        const body = (
          <>
            <dt className="text-[15px] font-bold text-[#9A948C]">{item.label}</dt>
            <dd
              className={clsx(
                "mt-3 truncate text-[20px] font-bold leading-[24px] tabular-nums",
                item.tone === "danger" && "text-[#E24B4B]",
                item.tone === "muted" && "text-[#9A948C]"
              )}
            >
              {item.value}
            </dd>
            {item.hint ? (
              <dd className={clsx("mt-1 truncate text-[13px]", item.tone === "danger" ? "text-[#E24B4B]" : "text-[#8A847C]")}>
                {item.hint}
              </dd>
            ) : null}
          </>
        );
        const cls = clsx(
          "block min-w-0 px-5 py-5",
          first ? "pl-1" : "border-l border-[#F3EFEA]",
          i >= cols && "border-t border-[#F3EFEA]"
        );
        return item.href ? (
          <Link key={item.label} href={item.href as never} className={clsx(cls, "hover:bg-[#F9F8F4]")}>
            {body}
          </Link>
        ) : (
          <div key={item.label} className={cls}>
            {body}
          </div>
        );
      })}
    </dl>
  );
}

export function Section({
  title,
  meta,
  right,
  className,
  children
}: {
  title: string;
  meta?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={clsx("mt-14", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="flex items-baseline gap-2 text-[18px] font-bold">
          {title}
          {meta != null ? <span className="text-[15px] font-normal text-[#8A847C]">{meta}</span> : null}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-[13px] text-[#8A847C]">{children}</p>;
}

export function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("mt-4 text-[13px] leading-[20px] text-[#8A847C]", className)}>{children}</p>;
}

export function ShareBar({ share }: { share: number }) {
  return (
    <div className="mt-2 h-[6px] rounded-full bg-[#F3EFEA]">
      <div
        className="h-full rounded-full bg-[#2F3A2F]"
        style={{ width: `${Math.min(100, Math.max(share, share > 0 ? 2 : 0))}%` }}
      />
    </div>
  );
}

/** 라벨-값 행 목록 (고객 상세 '기본 정보'와 같은 형태) */
export function FieldList({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="mt-4 border-t-[1.5px] border-[#C9C3BB]">
      {rows.map((r) => (
        <Fragment key={r.label}>
          <div className="flex items-baseline gap-8 border-b border-[#F3EFEA] py-[15px]">
            <dt className="w-[120px] shrink-0 text-[15px] font-bold text-[#9A948C]">{r.label}</dt>
            <dd className="min-w-0 text-[16px] font-medium">{r.value}</dd>
          </div>
        </Fragment>
      ))}
    </dl>
  );
}

export function CheckBox({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 whitespace-nowrap text-[14px] font-medium text-[#1C1C1C]"
    >
      <span
        className={clsx(
          "flex h-[18px] w-[18px] items-center justify-center rounded-[3px] border",
          checked ? "border-[#1C1C1C] bg-[#1C1C1C] text-white" : "border-[#D5D0CA] bg-white"
        )}
      >
        {checked ? <Icon src="/admin-icons/lnb/check.png" className="h-[12px] w-[12px]" /> : null}
      </span>
      {label}
    </button>
  );
}

export function Modal({
  title,
  onClose,
  busy,
  children,
  actions
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 font-sans-kr"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-[420px] rounded-[12px] bg-white p-7 text-[#1C1C1C] shadow-[0_8px_24px_rgba(28,28,28,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[18px] font-bold">{title}</p>
        <div className="mt-3 text-[14px] leading-[22px] text-[#3A3A3A]">{children}</div>
        <div className="mt-7 flex items-center justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}
