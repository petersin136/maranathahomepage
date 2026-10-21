import { getSupabaseAdmin } from "@/lib/admin/auth";

export async function getSalonName() {
  const { data, error } = await getSupabaseAdmin()
    .from("shop_settings")
    .select("business_name")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return String(data?.business_name ?? "").trim() || "HAIR UP";
}

export async function isSettlementMonthClosed(year: number, month: number) {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const { data, error } = await getSupabaseAdmin()
    .from("settlement_closes")
    .select("year_month")
    .eq("year_month", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export function reportDisposition(salon: string, reportName: string, fileKey: string, ascii: string) {
  const safe = salon.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_") || "HAIR_UP";
  const name = `${safe}_${reportName.replace(/\s+/g, "_")}_${fileKey}.pdf`;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
