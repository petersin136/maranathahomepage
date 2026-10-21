import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { aggregateCustomersDashboard } from "@/lib/admin/customers-data";

export const preferredRegion = "icn1";

const BOOKING_FIELDS =
  "id, status, booking_date, booking_time, customer_name, customer_phone, artist_id, artist_name, service_ids, service_names, final_amount, deposit_paid";

type CustomersPayload = ReturnType<typeof aggregateCustomersDashboard>;

let inflight: Promise<CustomersPayload> | null = null;

function loadCustomers() {
  if (!inflight) {
    inflight = queryCustomers().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function queryCustomers(): Promise<CustomersPayload> {
  const admin = getSupabaseAdmin();
  const [bookingsRes, servicesRes, remindersRes] = await Promise.all([
    admin
      .from("bookings")
      .select(BOOKING_FIELDS)
      .order("booking_date", { ascending: true })
      .order("booking_time", { ascending: true })
      .limit(20000),
    admin.from("services").select("id, name, revisit_days"),
    admin.from("customer_reminders").select("customer_phone, sent")
  ]);

  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (servicesRes.error) throw new Error(servicesRes.error.message);

  const data = aggregateCustomersDashboard({
    bookings: (bookingsRes.data ?? []) as never,
    services: (servicesRes.data ?? []) as never
  });

  if (!remindersRes.error && remindersRes.data) {
    const byPhone = new Map<string, { sent: boolean; pending: boolean }>();
    for (const row of remindersRes.data) {
      const phone = String(row.customer_phone || "").trim();
      if (!phone) continue;
      const cur = byPhone.get(phone) ?? { sent: false, pending: false };
      if (row.sent) cur.sent = true;
      else cur.pending = true;
      byPhone.set(phone, cur);
    }
    data.directory = data.directory.map((row) => {
      const flag = byPhone.get(row.phone);
      if (!flag) return row;
      return { ...row, sendStatus: flag.sent ? "sent" : "pending" };
    });
  }

  return data;
}

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const shared = await loadCustomers();
    const data = auth.role === "designer" ? structuredClone(shared) : shared;

    if (auth.role === "designer") {
      data.directory = data.directory.map((row) => ({
        ...row,
        lifetimeRevenue: null as unknown as number
      }));
      data.churn.expectedRecoverRevenue = null as unknown as number;
      data.churn.customers = data.churn.customers.map((row) => ({
        ...row,
        lifetimeRevenue: null as unknown as number
      }));
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    console.error("[admin/customers GET]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "집계에 실패했습니다." },
      { status: 500 }
    );
  }
}
