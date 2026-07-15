import { NextResponse } from "next/server";

/** 배포 환경변수 점검용 (키 값은 노출하지 않음) */
export async function GET() {
  const url = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const anon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  const service = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  let serviceRole: string | null = null;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "");
  if (key?.includes(".")) {
    try {
      const part = key.split(".")[1];
      const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(padded, "base64url").toString("utf8")) as {
        role?: string;
      };
      serviceRole = payload.role ?? null;
    } catch {
      serviceRole = "invalid_jwt";
    }
  }

  const ok = url && anon && service && serviceRole === "service_role";

  return NextResponse.json({
    ok,
    checks: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
      SUPABASE_SERVICE_ROLE_KEY: service,
      serviceRoleClaim: serviceRole
    },
    hint: ok
      ? "설정 OK"
      : serviceRole === "anon"
        ? "SUPABASE_SERVICE_ROLE_KEY에 anon 키가 들어 있습니다. service_role 키로 교체하세요."
        : !service
          ? "SUPABASE_SERVICE_ROLE_KEY가 없습니다."
          : "Supabase 환경변수를 다시 확인해 주세요."
  });
}
