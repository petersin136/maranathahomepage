import { NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase/admin";

/**
 * 직원 계정 아이디(이메일) 확인 — 입력한 이메일이 등록돼 있는지 안내.
 * 가입 여부만 확인하며, 상세 정보는 노출하지 않습니다.
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "올바른 이메일을 입력해 주세요." },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseServiceRole();
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      console.error("[find-id]", error);
      return NextResponse.json(
        { ok: false, error: "확인 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const found = data.users.some((u) => u.email?.toLowerCase() === email);
    if (!found) {
      return NextResponse.json({
        ok: true,
        found: false,
        message: "해당 이메일로 등록된 직원 계정이 없습니다. 원장에게 문의해 주세요."
      });
    }

    const [local, domain] = email.split("@");
    const maskedLocal =
      local.length <= 2
        ? `${local[0] || ""}*`
        : `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 4))}`;

    return NextResponse.json({
      ok: true,
      found: true,
      maskedEmail: `${maskedLocal}@${domain}`,
      message: "등록된 직원 계정입니다. 아래 이메일로 로그인해 주세요."
    });
  } catch (err) {
    console.error("[find-id]", err);
    return NextResponse.json(
      { ok: false, error: "확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}