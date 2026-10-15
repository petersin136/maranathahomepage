"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import BookingActionButtons from "@/components/admin/BookingActionButtons";
import BookingConfirmModal from "@/components/admin/BookingConfirmModal";
import { BOOKING_STATUS_LABEL } from "@/lib/admin/booking-labels";
import { splitIntlPhone } from "@/lib/admin/booking-display";
import { useBookingActions, type BookingActionTarget } from "@/lib/admin/useBookingActions";
import type { BookingRow } from "@/lib/bookings/types";
import AdminCalendarDesktop, { type CalTab } from "@/components/admin/AdminCalendarDesktop";

type PriorVisit = {
  id: string;
  booking_date: string;
  booking_time: string;
  service_names: string[] | null;
  artist_name: string | null;
  status: string;
};

type CustomerSnapshot = {
  priorCount: number;
  visitLabel: string;
  previous: PriorVisit[];
};

type ServiceOption = {
  id: string;
  name: string;
  price: number;
  artist_prices: Record<string, number>;
};

const WEEKDAY_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;

const STATUS_COLOR: Record<string, string> = {
  pending: "#8A847C",
  confirmed: "#1F9D62",
  completed: "#1F9D62",
  cancelled: "#E24B4B",
  noshow: "#E24B4B"
};

function shortTime(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function formatDayHeading(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일 ${WEEKDAY_FULL[date.getDay()]}`;
}

function won(amount: number | null | undefined) {
  if (amount == null) return "—";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatMonthDay(ymd: string) {
  const [, m, d] = ymd.split("-");
  if (!m || !d) return ymd;
  return `${Number(m)}월 ${Number(d)}일`;
}

function requestText(booking: BookingRow) {
  const direct = booking.customer_request?.trim();
  if (direct) return direct;
  const memo = booking.admin_memo?.trim() || "";
  if (memo.startsWith("[고객요청] ")) return memo.slice("[고객요청] ".length).trim();
  return "";
}

function phoneText(phone: string) {
  const parts = splitIntlPhone(phone);
  return parts.countryCode ? `${parts.countryCode} ${parts.national}` : parts.national;
}

function useBookingDetail(detailId: string | null, tick: number) {
  const [detail, setDetail] = useState<BookingRow | null>(null);
  const [customer, setCustomer] = useState<CustomerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      setCustomer(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/bookings/${detailId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok) {
          setDetail(d.booking as BookingRow);
          setCustomer(
            d.customer ?? { priorCount: 0, visitLabel: "첫 방문", previous: [] }
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId, tick]);

  return { detail, customer, loading };
}

export default function AdminCalendarPage() {
  const [tab, setTab] = useState<CalTab>("day");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTick, setDetailTick] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const { detail, customer, loading } = useBookingDetail(detailId, detailTick);
  const actions = useBookingActions({
    onSuccess: () => {
      setReloadKey((n) => n + 1);
      setDetailTick((n) => n + 1);
    }
  });

  return (
    <>
      <AdminCalendarDesktop
        tab={tab}
        onTab={setTab}
        onOpenBooking={setDetailId}
        reloadKey={reloadKey}
      />
      {detailId ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailId(null);
          }}
        >
          <div className="w-[880px] font-sans-kr text-[#1C1C1C]">
            <DetailCard
              detail={detail}
              customer={customer}
              loading={loading}
              onClose={() => setDetailId(null)}
              busyId={actions.busyId}
              onCancel={actions.openCancel}
              onDelete={actions.openDelete}
              onSaved={() => {
                setReloadKey((n) => n + 1);
                setDetailTick((n) => n + 1);
              }}
            />
          </div>
        </div>
      ) : null}
      {actions.confirm ? (
        <BookingConfirmModal
          action={actions.confirm.action}
          booking={actions.confirm.booking}
          busy={!!actions.busyId}
          onClose={actions.closeConfirm}
          onConfirm={actions.runConfirm}
        />
      ) : null}
    </>
  );
}

function prettyPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("010")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phoneText(phone);
}

function DetailCard({
  detail,
  customer,
  loading,
  onClose,
  busyId,
  onCancel,
  onDelete,
  onSaved
}: {
  detail: BookingRow | null;
  customer: CustomerSnapshot | null;
  loading: boolean;
  onClose: () => void;
  busyId: string | null;
  onCancel: (booking: BookingActionTarget) => void;
  onDelete: (booking: BookingActionTarget) => void;
  onSaved: () => void;
}) {
  const story = detail ? requestText(detail) : "";
  const visits = customer?.previous ?? [];
  const [editing, setEditing] = useState(false);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setEditing(false);
    setEditError(null);
    setServiceIds(detail?.service_ids ?? []);
    setNameEditing(false);
    setNameDraft(detail?.customer_name ?? "");
    setNameError(null);
  }, [detail?.id, detail?.customer_name]);

  const openEditor = () => {
    if (!detail) return;
    setServiceIds(detail.service_ids ?? []);
    setEditError(null);
    setEditing(true);
    if (services.length > 0) return;
    fetch("/api/admin/services")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.services)) setServices(d.services);
      })
      .catch(() => setEditError("시술 목록을 불러오지 못했습니다."));
  };

  const previewTotal = useMemo(() => {
    if (!detail) return 0;
    return serviceIds.reduce((sum, id) => {
      const s = services.find((x) => x.id === id);
      if (!s) return sum;
      return sum + (s.artist_prices?.[detail.artist_id] ?? s.price ?? 0);
    }, 0);
  }, [detail, serviceIds, services]);

  const saveName = async () => {
    if (!detail) return;
    const next = nameDraft.trim();
    if (!next) {
      setNameError("고객명을 입력해 주세요.");
      return;
    }
    if (next === detail.customer_name) {
      setNameEditing(false);
      setNameError(null);
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: next })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "이름 저장에 실패했습니다.");
      setNameEditing(false);
      onSaved();
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "이름 저장에 실패했습니다.");
    } finally {
      setNameSaving(false);
    }
  };

  const saveServices = async () => {
    if (!detail) return;
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "시술 저장에 실패했습니다.");
      setEditing(false);
      onSaved();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "시술 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={clsx(
        "flex shrink-0 flex-col rounded-[12px] border border-[#E4E0DA] bg-white px-6 py-3",
        editing ? "max-h-[80vh] overflow-auto" : "h-[248px] overflow-hidden"
      )}
    >
      {!detail ? (
        <p className="m-auto text-center text-[15px] text-[#8A847C]">
          {loading ? "불러오는 중" : "오른쪽 목록에서 예약을 누르면 여기에 상세가 열립니다."}
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {nameEditing ? (
                  <input
                    value={nameDraft}
                    autoFocus
                    disabled={nameSaving}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveName();
                      }
                      if (e.key === "Escape") {
                        setNameDraft(detail.customer_name);
                        setNameEditing(false);
                        setNameError(null);
                      }
                    }}
                    className="h-[36px] w-[180px] rounded-[8px] border-[1.5px] border-[#1C1C1C] bg-white px-3 text-[16px] font-bold text-[#1C1C1C] outline-none disabled:opacity-40"
                  />
                ) : (
                  <h3 className="text-[24px] font-bold leading-none tracking-[-0.02em]">
                    {detail.customer_name}
                  </h3>
                )}
                {nameEditing ? (
                  <>
                    <button
                      type="button"
                      disabled={nameSaving}
                      onClick={() => {
                        setNameDraft(detail.customer_name);
                        setNameEditing(false);
                        setNameError(null);
                      }}
                      className="text-[13px] font-bold text-[#8A847C] disabled:opacity-40"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={nameSaving || !nameDraft.trim()}
                      onClick={() => void saveName()}
                      className="inline-flex h-[32px] items-center rounded-[8px] bg-[#2F3A2F] px-3 text-[13px] font-bold text-white disabled:opacity-40"
                    >
                      {nameSaving ? "저장 중" : "저장"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(detail.customer_name);
                      setNameError(null);
                      setNameEditing(true);
                    }}
                    className="text-[13px] font-bold text-[#1C1C1C] underline-offset-2 hover:underline"
                  >
                    수정
                  </button>
                )}
                <span className="rounded-[4px] bg-[#F3EFEA] px-2 py-1 text-[12px] font-bold text-[#1C1C1C]">
                  {customer?.visitLabel || "첫 방문"}
                  {customer && customer.priorCount > 0 ? ` · 이전 ${customer.priorCount}회` : ""}
                </span>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: STATUS_COLOR[detail.status] || "#8A847C" }}
                >
                  {BOOKING_STATUS_LABEL[detail.status] || detail.status}
                </span>
              </div>
              {nameError ? <p className="mt-2 text-[13px] text-[#E24B4B]">{nameError}</p> : null}
              <p className="mt-3 text-[16px] font-medium text-[#1C1C1C]">
                {formatDayHeading(detail.booking_date)}
                <span className="mx-2 text-[#C9C3BB]">/</span>
                {shortTime(detail.booking_time)}
                <span className="mx-2 text-[#C9C3BB]">/</span>
                <span className="font-normal text-[#3A3A3A]">{prettyPhone(detail.customer_phone)}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-[36px] shrink-0 items-center rounded-[8px] border-[1.5px] border-[#9A948C] px-3 text-[14px] font-bold"
            >
              닫기
            </button>
          </div>

          <div className="mt-3 flex items-baseline gap-8 border-t border-[#F3EFEA] pt-3 text-left">
            <p className="shrink-0 text-[16px] leading-[24px]">
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">담당</span>
              <span className="font-medium">{detail.artist_name || "—"}</span>
            </p>
            <p className="shrink-0 text-[16px] leading-[24px]">
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">예상 금액</span>
              <span className="font-medium">{won(detail.total_amount)}</span>
            </p>
            <p className="shrink-0 text-[16px] leading-[24px]">
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">예약금</span>
              <span className="font-medium">{won(detail.deposit_amount)}</span>
              <span
                className="ml-2 text-[13px] font-bold"
                style={{ color: detail.deposit_paid ? "#1F9D62" : "#E24B4B" }}
              >
                {detail.deposit_paid ? "입금" : "미입금"}
              </span>
            </p>
            <p className="min-w-0 flex-1 truncate text-[16px] leading-[24px]" title={(detail.service_names || []).join(", ")}>
              <span className="mr-2 text-[13px] font-bold text-[#9A948C]">시술</span>
              <span className="font-medium">{(detail.service_names || []).join(", ") || "—"}</span>
              <button
                type="button"
                onClick={openEditor}
                className="ml-3 text-[13px] font-bold text-[#1C1C1C] underline-offset-2 hover:underline"
              >
                {editing ? "편집 중" : "편집"}
              </button>
            </p>
          </div>
          {editing ? (
            <div className="mt-3 border-t border-[#F3EFEA] pt-3">
              <div className="flex max-h-[240px] flex-wrap overflow-auto">
                {services.map((s) => {
                  const on = serviceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setServiceIds((cur) => (on ? cur.filter((x) => x !== s.id) : [...cur, s.id]))
                      }
                      className={clsx(
                        "mb-2 mr-2 inline-flex h-[36px] items-center rounded-[8px] border-[1.5px] px-3 text-[14px] font-bold disabled:opacity-40",
                        on ? "border-[#2F3A2F] bg-[#2F3A2F] text-white" : "border-[#9A948C] bg-white text-[#1C1C1C]"
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex items-center justify-between gap-4">
                <p className="text-[14px] text-[#8A847C]">합계 {previewTotal.toLocaleString("ko-KR")}원</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setEditing(false);
                      setEditError(null);
                      setServiceIds(detail.service_ids ?? []);
                    }}
                    className="text-[14px] font-bold text-[#8A847C] disabled:opacity-40"
                  >
                    편집 취소
                  </button>
                  <button
                    type="button"
                    disabled={saving || serviceIds.length === 0}
                    onClick={() => void saveServices()}
                    className="inline-flex h-[36px] items-center rounded-[8px] bg-[#2F3A2F] px-4 text-[14px] font-bold text-white disabled:opacity-40"
                  >
                    {saving ? "저장 중" : "저장"}
                  </button>
                </div>
              </div>
              {editError ? <p className="mt-2 text-[13px] text-[#E24B4B]">{editError}</p> : null}
            </div>
          ) : null}

          <p className="mt-2 text-[15px] leading-[24px] text-[#1C1C1C]">
            <span className="mr-3 font-bold text-[#9A948C]">고객 메모</span>
            {story || "없음"}
          </p>
          <div className="mt-3 text-[15px] leading-[24px] text-[#1C1C1C]">
            <span className="mr-3 font-bold text-[#9A948C]">이전 시술</span>
            {visits.length > 0 ? (
              visits.map((visit, index) => (
                <span key={visit.id}>
                  {index > 0 ? <span className="mx-2 text-[#C9C3BB]">/</span> : null}
                  {formatMonthDay(visit.booking_date)}{" "}
                  {(visit.service_names || []).join(", ") || "시술 없음"}
                </span>
              ))
            ) : (
              <span className="text-[#8A847C]">없음</span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-end gap-4 pt-2">
            <Link
              href={`/admin/bookings/${detail.id}`}
              className="text-[14px] font-bold underline-offset-2 hover:underline"
            >
              예약 화면
            </Link>
            <BookingActionButtons
              booking={detail}
              busy={busyId === detail.id}
              onCancel={onCancel}
              onDelete={onDelete}
              layout="row"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Fact({
  label,
  value,
  note,
  noteColor
}: {
  label: string;
  value: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <p className="text-[16px] leading-[24px]">
      <span className="mr-2 text-[13px] font-bold text-[#9A948C]">{label}</span>
      <span className="font-medium text-[#1C1C1C]">{value}</span>
      {note ? (
        <span className="ml-2 text-[13px] font-bold" style={{ color: noteColor }}>
          {note}
        </span>
      ) : null}
    </p>
  );
}
