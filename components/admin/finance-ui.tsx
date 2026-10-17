"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { AdminBellButton } from "@/components/admin/AdminBellButton";
import { AdminPageTitle } from "@/components/admin/AdminPageTitle";
import { useAdminSession } from "@/components/admin/admin-session";

export const TRIM_KR = "[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]";
export const TRIM_LATIN = "[text-box-edge:text_alphabetic] [text-box-trim:trim-both]";

export const TABLE_HEAD_ROW = "border-b-[1.5px] border-[#C9C3BB] text-[15px] font-bold text-[#9A948C]";
export const TABLE_ROW = "border-b border-[#F3EFEA]";
export const TH = "py-3 pr-3 font-bold";
export const TD = "py-[15px] pr-3";

export const INPUT =
  "h-[34px] rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[14px] font-medium text-[#1C1C1C] outline-none placeholder:text-[#B5AFA7] focus:border-[color:var(--input-border-active)]";

const FINANCE_TABS = [
  { href: "/admin/sales", label: "매출" },
  { href: "/admin/expenses", label: "지출" },
  { href: "/admin/settlements", label: "정산" }
] as const;

export function won(value: number | null | undefined) {
  return value != null ? `${value.toLocaleString("ko-KR")}원` : "—";
}

export function pct(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function FinanceSearch() {
  const [q, setQ] = useState("");
  return (
    <div className="flex items-center gap-[8px]">
      <label className="flex h-[36px] w-[308px] items-center gap-[8px] rounded-[8px] border-[1.5px] border-[#9A948C] bg-white px-[12px]">
        <Icon src="/admin-icons/lnb/search-bold.png" className="h-[16px] w-[16px]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="고객명, 연락처 검색"
          className={`min-w-0 flex-1 bg-transparent text-[15px] font-bold leading-none text-[#1C1C1C] outline-none placeholder:text-[#9A948C] ${TRIM_KR}`}
        />
      </label>
      <AdminBellButton />
    </div>
  );
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
  const session = useAdminSession();
  const tabs = FINANCE_TABS.filter((tab) => {
    if (session?.role === "designer" && tab.href === "/admin/expenses") return false;
    return true;
  });
  return (
    <div className={embedded ? undefined : "sticky top-0 z-20 bg-white pt-10 pl-[6px]"}>
      <div className="flex items-start justify-between gap-6">
        <AdminPageTitle>매출/정산</AdminPageTitle>
        <div className="mt-[24px]">{right ?? <FinanceSearch />}</div>
      </div>
      {subtitle ? (
        <p className="mt-[14px] text-[16px] font-medium leading-normal text-[#8A847C]">{subtitle}</p>
      ) : null}
      <nav className={clsx("flex border-b border-[#E6E1DA]", subtitle ? "mt-[10px]" : "mt-12")}>
        {tabs.map((t) => {
          const on = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "-mb-px flex items-end border-b-2 px-[18px] pb-[12px] text-[15px] leading-normal",
                on ? "border-[#1C1C1C] text-[#1C1C1C]" : "border-transparent text-[#B7B2AA]"
              )}
            >
              <span
                className={clsx(
                  "[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
                  on ? "font-bold" : "font-medium"
                )}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** 제목·탭·필터 줄. 본문만 스크롤되고 이 영역은 위에 남는다. */
export function FinanceSticky({ children }: { children: React.ReactNode }) {
  return <div className="sticky top-0 z-20 bg-white pt-10 pb-6 pl-[6px]">{children}</div>;
}

/** 탭 아래 필터·액션 줄 */
export function Toolbar({
  left,
  right,
  className,
  align = "center"
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <div
      className={clsx(
        "flex w-full gap-[6px]",
        align === "start" ? "items-start" : "items-center",
        className ?? "mt-[34px]"
      )}
    >
      {left}
      {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function useOutsideClose(open: boolean, close: () => void) {
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
        <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-max min-w-full rounded-[12px] border border-[#EFEBE6] bg-white py-2 shadow-[0_8px_24px_rgba(28,28,28,0.08)]">
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

/** 매출·정산 담당자 칩. locked 면 본인 이름 하나로 고정되고 열리지 않는다. */
export function ArtistFilterChip({
  count,
  open,
  locked = false,
  name,
  label = "담당자",
  onToggle,
  menu
}: {
  count: number;
  open: boolean;
  locked?: boolean;
  name?: string | null;
  label?: string;
  onToggle: () => void;
  menu?: React.ReactNode;
}) {
  const active = open || count > 0;
  return (
    <div className="relative z-30">
      <button
        type="button"
        aria-expanded={locked ? false : open}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (locked) return;
          onToggle();
        }}
        className="flex h-[34px] w-[186px] items-center rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white pl-3 pr-3 text-[13px] font-semibold leading-none text-[#1C1C1C]"
      >
        <Icon src="/admin-icons/lnb/filter.png" className="h-[15px] w-[15px] text-[#9A948C]" />
        <span className="ml-2 leading-normal">{label}</span>
        <span className="ml-2 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-[4px] bg-[#F3EFEA] px-1 text-[12px] font-semibold leading-normal text-[#9A948C]">
          {count}
        </span>
        <span className="ml-2 min-w-0 flex-1 truncate text-left leading-normal">{locked ? name || "선택" : "선택"}</span>
        <Icon
          src={active ? "/admin-icons/lnb/chevron-down-bold.png" : "/admin-icons/lnb/chevron-down.png"}
          className={clsx("ml-auto h-[16px] w-[16px] shrink-0 text-[#9A948C]", !locked && open && "rotate-180")}
        />
      </button>
      {!locked && open ? menu : null}
    </div>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-[16px] w-[16px]" fill="none" aria-hidden="true">
      <path d="M8 2.2v7.2M5.2 6.8 8 9.6l2.8-2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.2 11.2v1.4c0 .6.5 1 1.1 1h7.4c.6 0 1.1-.4 1.1-1v-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadExportButton({
  year,
  month,
  from,
  to,
  artistIds,
  onError,
  labeled = false
}: {
  year?: number;
  month?: number;
  from?: string;
  to?: string;
  artistIds?: string[];
  onError?: (message: string) => void;
  labeled?: boolean;
}) {
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const download = async (format: "xlsx" | "pdf") => {
    if (busy) return;
    setBusy(format);
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      if (from && to) {
        params.set("from", from);
        params.set("to", to);
      } else {
        params.set("year", String(year));
        params.set("month", String(month));
      }
      for (const id of artistIds ?? []) params.append("artistId", id);
      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "다운로드에 실패했습니다.");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const mm = String((month ?? Number(from?.slice(5, 7))) || 0).padStart(2, "0");
      const yy = year ?? Number(from?.slice(0, 4));
      const filename = utfMatch ? decodeURIComponent(utfMatch[1]) : `헤어업_${yy}년${mm}월_마감자료.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const line =
    "inline-flex h-[34px] items-center gap-2 rounded-[8px] border-[length:var(--input-border-width)] border-[color:var(--input-border)] bg-white px-3 text-[13px] font-semibold leading-normal text-[#1C1C1C] hover:bg-[#F6F4F0] disabled:opacity-40";

  if (labeled) {
    return (
      <>
        <button type="button" disabled={busy != null} onClick={() => void download("xlsx")} className={line}>
          <DownloadGlyph />
          <span>{busy === "xlsx" ? "준비 중" : "엑셀"}</span>
        </button>
        <button type="button" disabled={busy != null} onClick={() => void download("pdf")} className={line}>
          <DownloadGlyph />
          <span>{busy === "pdf" ? "준비 중" : "PDF"}</span>
        </button>
      </>
    );
  }

  return (
    <>
      <IconButton label="엑셀 다운로드" onClick={() => void download("xlsx")} disabled={busy != null}>
        <DownloadGlyph />
      </IconButton>
      <IconButton label="PDF 다운로드" onClick={() => void download("pdf")} disabled={busy != null}>
        <DownloadGlyph />
      </IconButton>
    </>
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
  onChange,
  label,
  width = 202
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  label?: string;
  width?: number;
}) {
  const [viewYear, setViewYear] = useState(year);
  useEffect(() => setViewYear(year), [year]);

  return (
    <ChipDropdown label={label ?? `${year}년 ${month}월`} width={width}>
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
  hintTone?: "accent" | "muted";
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
              <dd
                className={clsx(
                  "mt-1 truncate text-[13px]",
                  item.tone === "danger"
                    ? "text-[#E24B4B]"
                    : item.hintTone === "accent"
                      ? "text-[color:var(--accent)]"
                      : "text-[color:var(--muted)]"
                )}
              >
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
