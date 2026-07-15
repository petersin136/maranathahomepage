import { NextResponse } from "next/server";

export const runtime = "nodejs";

function clean(value?: string | null) {
  return value?.trim().replace(/^["']|["']$/g, "") || "";
}

function jwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

/** 배포 환경변수 점검용 (키 값 자체는 노출하지 않음) */
export async function GET() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const anonPayload = anon ? jwtPayload(anon) : null;
  const servicePayload = service ? jwtPayload(service) : null;

  const serviceRole = (servicePayload?.role as string | undefined) ?? null;
  const anonRef = (anonPayload?.ref as string | undefined) ?? null;
  const serviceRef = (servicePayload?.ref as string | undefined) ?? null;
  const urlHost = (() => {
    try {
      return url ? new URL(url).hostname : null;
    } catch {
      return null;
    }
  })();

  const refsMatch = Boolean(anonRef && serviceRef && anonRef === serviceRef);
  const urlMatchesRef = Boolean(urlHost && anonRef && urlHost.startsWith(`${anonRef}.`));

  const ok =
    Boolean(url && anon && service) &&
    serviceRole === "service_role" &&
    refsMatch &&
    urlMatchesRef;

  let hint = "설정 OK";
  if (!service) hint = "SUPABASE_SERVICE_ROLE_KEY가 없습니다.";
  else if (serviceRole === "anon")
    hint = "SUPABASE_SERVICE_ROLE_KEY에 anon 키가 들어 있습니다.";
  else if (!refsMatch)
    hint =
      "anon 키와 service_role 키의 프로젝트가 서로 다릅니다. 같은 프로젝트 키로 맞춰 주세요.";
  else if (!urlMatchesRef)
    hint =
      "NEXT_PUBLIC_SUPABASE_URL 과 API 키의 프로젝트가 다릅니다. URL/키를 같은 프로젝트로 맞춰 주세요.";

  return NextResponse.json({
    ok,
    checks: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(url),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anon),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(service),
      serviceRoleClaim: serviceRole,
      projectRefAnon: anonRef,
      projectRefService: serviceRef,
      urlHost,
      refsMatch,
      urlMatchesRef
    },
    hint
  });
}
