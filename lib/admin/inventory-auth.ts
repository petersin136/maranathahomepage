import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/auth";

export async function requireInventoryOwner() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth;
  if (auth.role !== "owner") {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 })
    };
  }
  return auth;
}
