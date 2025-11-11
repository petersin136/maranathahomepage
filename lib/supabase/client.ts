import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase 환경 변수가 설정되지 않았습니다. 데이터 연동 전 .env.local 파일을 확인하세요."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

/**
 * 사용 방법
 * ```ts
 * import { supabase } from "@/lib/supabase/client";
 *
 * const { data, error } = await supabase.from("table").select();
 * ```
 *
 * 애플리케이션에서 Supabase Auth, Storage, Realtime 등을 활용할 수 있도록 준비만 해둔 상태입니다.
 */
