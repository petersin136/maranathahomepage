import { NextResponse } from "next/server";
import { requireAdminUser, requireSupabaseAdmin } from "@/lib/admin/auth";
import { buildProfiles, type CustomerBookingRow } from "@/lib/admin/customers-data";
import { resolveCustomerRequestText } from "@/lib/admin/booking-display";
import { resolveDurationMinutes } from "@/lib/booking/overlap";
import { bookingTone } from "@/lib/admin/calendar-tone";

type CalendarRow = {
  id: string;
  booking_date: string;
  booking_time: string;
  artist_id: string;
  artist_name: string | null;
  customer_name: string;
  customer_phone: string | null;
  status: string;
  service_ids: string[] | null;
  service_names: string[] | null;
  cancel_reason: string | null;
  duration_minutes: number | null;
  customer_request: string | null;
  admin_memo: string | null;
};

type ServiceMeta = { id: string; category: string; name: string; duration_minutes: number | null };

export async function GET(request: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const db = requireSupabaseAdmin();
  if (!db.ok) return db.response;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const artistId = searchParams.get("artistId");

  if (!from || !to) {
    return NextResponse.json(
      { ok: false, error: "from, to 날짜가 필요합니다." },
      { status: 400 }
    );
  }

  let query = db.admin
    .from("bookings")
    .select(
      "id, booking_date, booking_time, artist_id, artist_name, customer_name, customer_phone, status, service_ids, service_names, cancel_reason, duration_minutes, customer_request, admin_memo"
    )
    .gte("booking_date", from)
    .lte("booking_date", to)
    .order("booking_date")
    .order("booking_time");

  if (artistId) query = query.eq("artist_id", artistId);

  const { data, error } = await query;
  if (error) {
    console.error("[GET /api/admin/calendar]", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const rows = (data ?? []) as CalendarRow[];

  const { data: serviceData } = await db.admin
    .from("services")
    .select("id, category, name, duration_minutes");
  const services = (serviceData ?? []) as ServiceMeta[];
  const serviceById = new Map(services.map((s) => [String(s.id), s]));
  const serviceByName = new Map(services.map((s) => [s.name.trim(), s]));

  const phones = Array.from(
    new Set(rows.map((r) => (r.customer_phone || "").trim()).filter(Boolean))
  );
  const completedByPhone = new Map<string, { id: string; bookingDate: string; bookingTime: string }[]>();
  if (phones.length > 0) {
    const { data: history } = await db.admin
      .from("bookings")
      .select(
        "id, status, booking_date, booking_time, customer_name, customer_phone, artist_id, artist_name, service_ids, service_names, final_amount, deposit_paid"
      )
      .in("customer_phone", phones)
      .eq("status", "completed");
    const { profiles } = buildProfiles((history ?? []) as CustomerBookingRow[]);
    for (const p of profiles) completedByPhone.set(p.phone, p.completedVisits);
  }

  const bookings = rows.map((row) => {
    const ids = Array.isArray(row.service_ids) ? row.service_ids.map(String) : [];
    const names = Array.isArray(row.service_names) ? row.service_names : [];
    const metas = ids.length
      ? ids.map((id) => serviceById.get(id) ?? null)
      : names.map((n) => serviceByName.get(String(n || "").trim()) ?? null);
    const durationMinutes = resolveDurationMinutes(
      row.duration_minutes,
      metas.map((m) => Number(m?.duration_minutes) || 0)
    );
    const tone = bookingTone(
      metas.map((m, i) => ({
        category: m?.category ?? null,
        name: m?.name ?? String(names[i] ?? "")
      }))
    );
    const phone = (row.customer_phone || "").trim();
    const prior = phone ? completedByPhone.get(phone) ?? [] : [];
    const isNew = !prior.some(
      (v) =>
        v.id !== row.id &&
        (v.bookingDate < row.booking_date ||
          (v.bookingDate === row.booking_date && v.bookingTime < row.booking_time))
    );
    return {
      id: row.id,
      booking_date: row.booking_date,
      booking_time: row.booking_time,
      artist_id: row.artist_id,
      artist_name: row.artist_name,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      status: row.status,
      service_names: row.service_names,
      cancel_reason: row.cancel_reason,
      duration_minutes: durationMinutes,
      tone,
      is_new: isNew,
      memo: resolveCustomerRequestText(row.customer_request, row.admin_memo)
    };
  });

  return NextResponse.json({ ok: true, bookings });
}
