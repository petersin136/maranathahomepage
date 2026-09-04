"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";

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

export default function AdminRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [includeSent, setIncludeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => todayYmd(), []);

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
    <div>
      <h1 className="font-serif text-[28px] tracking-[0.06em] lg:text-[32px]">REMINDERS</h1>
      <p className="mt-2 font-sans-kr text-[13px] text-hu-muted">재방문 알림 관리</p>
      <p className="mt-4 min-h-[20px] font-sans-kr text-[13px] text-[#9b4a4a]">
        {error || "\u00a0"}
      </p>

      <label className="mt-2 flex items-center gap-2 font-sans-kr text-[13px]">
        <input
          type="checkbox"
          checked={includeSent}
          onChange={(e) => setIncludeSent(e.target.checked)}
        />
        발송 완료 포함
      </label>

      <ul className="mt-6 divide-y divide-hu-black/10 bg-hu-white lg:hidden">
        {reminders.length === 0 ? (
          <li className="px-5 py-8 font-sans-kr text-[13px] text-hu-muted">알림이 없습니다.</li>
        ) : (
          reminders.map((r) => {
            const date = dateValue(r.remind_date);
            const overdue = !r.sent && date && date < today;
            return (
              <li
                key={r.id}
                className={clsx("flex flex-col gap-2 px-5 py-4", overdue && "bg-[#f8eeee] text-[#9b4a4a]")}
              >
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => updateDate(r.id, e.target.value)}
                    className={clsx(
                      "border-b bg-transparent py-1 font-sans-kr text-[13px] outline-none",
                      overdue ? "border-[#9b4a4a]/40" : "border-hu-black/30"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="shrink-0 font-sans-kr text-[12px] text-[#9b4a4a]"
                  >
                    삭제
                  </button>
                </div>
                <p className="font-sans-kr text-[15px]">
                  {r.customer_name || "—"}{" "}
                  <span className={clsx("text-[13px]", overdue ? "text-[#9b4a4a]/70" : "text-hu-muted")}>
                    {r.customer_phone || ""}
                  </span>
                </p>
                {r.reason ? <p className="font-sans-kr text-[13px]">{r.reason}</p> : null}
                <p className={clsx("font-sans-kr text-[12px]", overdue ? "text-[#9b4a4a]/70" : "text-hu-muted")}>
                  {sourceLabel(r.source)} · {r.sent ? "발송" : "미발송"}
                </p>
              </li>
            );
          })
        )}
      </ul>

      <div className="mt-8 hidden overflow-x-auto bg-hu-white lg:block">
        <table className="min-w-full text-left font-sans-kr text-[13px]">
          <thead className="border-b border-hu-black/10 text-[11px] tracking-[0.08em] text-hu-muted">
            <tr>
              <th className="px-5 py-3 font-medium">연락 예정일</th>
              <th className="px-5 py-3 font-medium">고객명</th>
              <th className="px-5 py-3 font-medium">전화번호</th>
              <th className="px-5 py-3 font-medium">사유</th>
              <th className="px-5 py-3 font-medium">구분</th>
              <th className="px-5 py-3 font-medium">발송</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hu-black/10">
            {reminders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-hu-muted">
                  알림이 없습니다.
                </td>
              </tr>
            ) : (
              reminders.map((r) => {
                const date = dateValue(r.remind_date);
                const overdue = !r.sent && date && date < today;
                return (
                  <tr
                    key={r.id}
                    className={clsx(overdue && "bg-[#f8eeee] text-[#9b4a4a]")}
                  >
                    <td className="px-5 py-4">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => updateDate(r.id, e.target.value)}
                        className={clsx(
                          "border-b bg-transparent py-1 font-sans-kr text-[13px] outline-none",
                          overdue ? "border-[#9b4a4a]/40" : "border-hu-black/30"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4">{r.customer_name || "—"}</td>
                    <td className="px-5 py-4">{r.customer_phone || "—"}</td>
                    <td className="max-w-[280px] truncate px-5 py-4">{r.reason || "—"}</td>
                    <td className="px-5 py-4">{sourceLabel(r.source)}</td>
                    <td className="px-5 py-4">{r.sent ? "발송" : "미발송"}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="px-3 py-1 font-sans-kr text-[12px] text-[#9b4a4a]"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
