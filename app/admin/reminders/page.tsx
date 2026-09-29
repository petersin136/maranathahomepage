"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";
import { ADMIN_SIDEBAR_SLOT_ID } from "@/lib/admin/nav";

const PAGE_SIZE = 12;

type Reminder = {
  id: number | string;
  customer_phone: string | null;
  customer_name: string | null;
  remind_date: string;
  reason: string | null;
  source: string | null;
  sent: boolean;
  booking_id: string | null;
  created_at: string;
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateValue(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function sourceLabel(source: string | null) {
  if (source === "auto") return "자동";
  if (source === "manual") return "수동";
  return source || "—";
}

function ArrowIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[20px] w-[20px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? (
        <>
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </>
      ) : (
        <>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </>
      )}
    </svg>
  );
}

function pageButtons(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

export default function AdminRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [includeSent, setIncludeSent] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [sidebarSlot, setSidebarSlot] = useState<HTMLElement | null>(null);
  const today = useMemo(() => todayYmd(), []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return reminders.filter((r) => {
      if (!q) return true;
      const name = (r.customer_name || "").toLowerCase();
      const phone = (r.customer_phone || "").replace(/\D/g, "");
      return name.includes(q) || (digits.length > 0 && phone.includes(digits));
    });
  }, [reminders, query]);

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, includeSent]);

  const load = () => {
    const qs = includeSent ? "?include_sent=1" : "";
    return fetch(`/api/admin/reminders${qs}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "로드 실패");
        setReminders(data.reminders);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    setError(null);
    load();
  }, [includeSent]);

  useEffect(() => {
    setSidebarSlot(document.getElementById(ADMIN_SIDEBAR_SLOT_ID));
  }, []);

  const updateDate = async (id: Reminder["id"], remind_date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(remind_date)) return;
    setError(null);
    const res = await fetch(`/api/admin/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remind_date })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "저장 실패");
      load();
      return;
    }
    setReminders((cur) =>
      cur
        .map((r) => (String(r.id) === String(id) ? { ...r, remind_date } : r))
        .sort((a, b) => dateValue(a.remind_date).localeCompare(dateValue(b.remind_date)))
    );
  };

  const remove = async (id: Reminder["id"]) => {
    if (!confirm("이 알림을 삭제할까요?")) return;
    setError(null);
    const res = await fetch(`/api/admin/reminders/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error || "삭제 실패");
      return;
    }
    load();
  };

  return (
    <div className="member-panel">
      <div className="member-toolbar">
        <label className="member-search member-search__box">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객명, 연락처 검색"
            aria-label="알림 검색"
            className="member-search__input"
          />
          <span className="member-search__toggle" aria-hidden>
            <span
              className="inline-block h-[16px] w-[16px] shrink-0 bg-current"
              style={{
                WebkitMaskImage: "url(/admin-icons/lnb/chevron-down.png)",
                maskImage: "url(/admin-icons/lnb/chevron-down.png)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain"
              }}
            />
          </span>
        </label>
      </div>

      {sidebarSlot
        ? createPortal(
            <div className="sidebar__filters">
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">필터</span>
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={includeSent}
                onClick={() => setIncludeSent((v) => !v)}
                className="sidebar__option"
              >
                <span className={clsx("sidebar__option-box", includeSent && "is-checked")} />
                <span>발송 완료 포함</span>
              </button>
            </div>,
            sidebarSlot
          )
        : null}

      {error ? <p className="mt-4 text-pc-base text-danger">{error}</p> : null}

      <div className="member-card">
        <div className="overflow-x-auto">
          <table className="member-table min-w-[960px]">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[28%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead>
              <tr>
                <th>연락 예정일</th>
                <th>고객명</th>
                <th>전화번호</th>
                <th>사유</th>
                <th>구분</th>
                <th>발송</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const date = dateValue(r.remind_date);
                const overdue = !r.sent && date && date < today;
                return (
                  <tr key={r.id} className={clsx(overdue && "is-overdue")}>
                    <td>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => updateDate(r.id, e.target.value)}
                        aria-label="연락 예정일"
                        className="reminder-date"
                      />
                    </td>
                    <td className="member-cell-name">{r.customer_name || "—"}</td>
                    <td className="member-cell-sub tabular-nums">
                      {r.customer_phone ? formatPhone(r.customer_phone) : "—"}
                    </td>
                    <td className="member-cell-content truncate">{r.reason || "—"}</td>
                    <td className="member-cell-sub">{sourceLabel(r.source)}</td>
                    <td className={clsx("member-cell-content", r.sent && "text-text3")}>
                      {r.sent ? "발송" : "미발송"}
                    </td>
                    <td>
                      <button type="button" onClick={() => remove(r.id)} className="reminder-delete">
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {shown.length === 0 ? (
          <p className="py-16 text-center text-pc-md font-semibold text-text1">알림이 없습니다.</p>
        ) : null}
      </div>

      <div className="member-pager-wrap">
        <div className="member-pager">
          <button
            type="button"
            aria-label="이전 페이지"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="member-pager__arrow"
          >
            <ArrowIcon dir="left" />
          </button>
          <div className="member-pager__pages">
            {pageButtons(safePage, pageCount).map((item, i) =>
              item === "…" ? (
                <span key={`gap-${i}`} className="member-pager__ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={clsx("member-pager__page", item === safePage && "is-active")}
                >
                  {item}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            aria-label="다음 페이지"
            disabled={safePage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="member-pager__arrow"
          >
            <ArrowIcon dir="right" />
          </button>
        </div>
      </div>
    </div>
  );
}
