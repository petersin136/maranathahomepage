import { NextResponse } from "next/server";
import { requireAdminUser, getSupabaseAdmin } from "@/lib/admin/auth";
import { isExpenseCategory } from "@/lib/admin/expense-categories";
import { isYmd } from "@/lib/admin/sales-data";

export const preferredRegion = "icn1";

const FIELDS =
  "id, expense_date, category, amount, vendor, memo, has_tax_invoice, receipt_url, is_recurring, created_at";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  let body: {
    expense_date?: string;
    category?: string;
    amount?: number | string;
    vendor?: string | null;
    memo?: string | null;
    has_tax_invoice?: boolean;
    is_recurring?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.expense_date !== undefined) {
    const expense_date = String(body.expense_date || "").trim();
    if (!isYmd(expense_date)) {
      return NextResponse.json({ ok: false, error: "날짜가 올바르지 않습니다." }, { status: 400 });
    }
    patch.expense_date = expense_date;
  }
  if (body.category !== undefined) {
    const category = String(body.category || "").trim();
    if (!isExpenseCategory(category)) {
      return NextResponse.json(
        { ok: false, error: "카테고리가 올바르지 않습니다." },
        { status: 400 }
      );
    }
    patch.category = category;
  }
  if (body.amount !== undefined) {
    const amount = Math.round(Number(body.amount));
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ ok: false, error: "금액이 올바르지 않습니다." }, { status: 400 });
    }
    patch.amount = amount;
  }
  if (body.vendor !== undefined) {
    const vendor = body.vendor == null ? "" : String(body.vendor).trim();
    patch.vendor = vendor || null;
  }
  if (body.memo !== undefined) {
    const memo = body.memo == null ? "" : String(body.memo).trim();
    patch.memo = memo || null;
  }
  if (body.has_tax_invoice !== undefined) {
    patch.has_tax_invoice = Boolean(body.has_tax_invoice);
  }
  if (body.is_recurring !== undefined) {
    patch.is_recurring = Boolean(body.is_recurring);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .select(FIELDS)
    .single();

  if (error || !data) {
    console.error("[admin/expenses PATCH]", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "수정에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, expense: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("expenses").delete().eq("id", id).select("id");

  if (error) {
    console.error("[admin/expenses DELETE]", error);
    return NextResponse.json(
      { ok: false, error: error.message || "삭제에 실패했습니다." },
      { status: 500 }
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ ok: false, error: "지출을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
