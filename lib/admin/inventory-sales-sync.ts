import type { SupabaseClient } from "@supabase/supabase-js";
import { planSaleMovements, UnknownRetailError } from "@/lib/admin/inventory-sales";

export const SALE_SYNC_WARNING = "재고 반영에 실패했습니다. 재고 관리에서 확인해 주세요.";

function coerceIdList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((id) => String(id));
  return [];
}

export async function clearBookingSaleMovements(admin: SupabaseClient, bookingId: string) {
  const result = await admin
    .from("inventory_movements")
    .delete()
    .eq("booking_id", bookingId)
    .eq("type", "out_sale")
    .select("id");
  if (result.error) {
    console.error("[inventory-sales] clear out_sale", {
      bookingId,
      error: result.error
    });
  } else {
    console.info("[inventory-sales] cleared out_sale", {
      bookingId,
      deleted: result.data?.length ?? 0
    });
  }
  return result;
}

export async function syncBookingSaleMovements(args: {
  admin: SupabaseClient;
  bookingId: string;
  serviceIds: string[] | null | undefined;
  paidAt: string | null | undefined;
  userId: string;
}): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const serviceIds = coerceIdList(args.serviceIds);
  const cleared = await clearBookingSaleMovements(args.admin, args.bookingId);
  if (cleared.error) {
    return { ok: false, error: SALE_SYNC_WARNING };
  }

  const { data: items, error: itemsError } = await args.admin
    .from("inventory_items")
    .select("id, catalog_key")
    .eq("kind", "retail");
  if (itemsError) {
    console.error("[inventory-sales] load items", { bookingId: args.bookingId, error: itemsError });
    return { ok: false, error: SALE_SYNC_WARNING };
  }

  let planned;
  try {
    planned = planSaleMovements(
      serviceIds,
      (items ?? []).map((row) => ({
        id: String(row.id),
        catalogKey: row.catalog_key ? String(row.catalog_key) : null
      }))
    );
  } catch (e) {
    console.error("[inventory-sales] plan", {
      bookingId: args.bookingId,
      serviceIds,
      detail: e instanceof UnknownRetailError ? e.catalogKey : e
    });
    return { ok: false, error: SALE_SYNC_WARNING };
  }

  if (planned.length === 0) {
    console.info("[inventory-sales] sync skip (no retail)", {
      bookingId: args.bookingId,
      serviceIds
    });
    return { ok: true, inserted: 0 };
  }

  const occurredAt = args.paidAt || new Date().toISOString();
  const rows = planned.map((row) => ({
    item_id: row.itemId,
    type: "out_sale" as const,
    quantity: row.quantity,
    unit_cost: null as number | null,
    booking_id: args.bookingId,
    memo: "결제 자동 출고",
    occurred_at: occurredAt,
    created_by: args.userId
  }));

  let { data: inserted, error } = await args.admin.from("inventory_movements").insert(rows).select("id");

  // created_by FK(auth.users) 실패 시 출고는 남기고 created_by만 NULL로 재시도
  if (error && /created_by|foreign key|auth\.users/i.test(`${error.message} ${error.details ?? ""} ${error.hint ?? ""}`)) {
    console.error("[inventory-sales] insert out_sale created_by failed, retry null", {
      bookingId: args.bookingId,
      error
    });
    const retry = await args.admin
      .from("inventory_movements")
      .insert(rows.map((row) => ({ ...row, created_by: null })))
      .select("id");
    inserted = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[inventory-sales] insert out_sale", {
      bookingId: args.bookingId,
      planned,
      error
    });
    return { ok: false, error: SALE_SYNC_WARNING };
  }

  if (!inserted || inserted.length !== planned.length) {
    console.error("[inventory-sales] insert out_sale empty/partial", {
      bookingId: args.bookingId,
      planned: planned.length,
      inserted: inserted?.length ?? 0
    });
    return { ok: false, error: SALE_SYNC_WARNING };
  }

  console.info("[inventory-sales] synced out_sale", {
    bookingId: args.bookingId,
    inserted: inserted.length,
    planned
  });
  return { ok: true, inserted: inserted.length };
}
