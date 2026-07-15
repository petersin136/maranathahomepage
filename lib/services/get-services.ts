import { getSupabase } from "@/lib/supabase/client";
import type { ServiceItem } from "@/lib/services/types";

export const SERVICES_FALLBACK: ServiceItem[] = [
  { id: "cut-basic", category: "Cut", name: "기본 컷", price: 25000, durationMinutes: 40, depositAmount: 10000, sortOrder: 0 },
  { id: "cut-signature", category: "Cut", name: "시그니처 레이어드 / 디자인 컷", price: 35000, durationMinutes: 60, depositAmount: 10000, sortOrder: 1 },
  { id: "cut-mens", category: "Cut", name: "맨즈 디자인 컷", price: 60000, durationMinutes: 50, depositAmount: 20000, sortOrder: 2 },
  { id: "perm-design", category: "Perm", name: "디자인 일반펌", price: 90000, durationMinutes: 120, depositAmount: 30000, sortOrder: 0 },
  { id: "perm-digital", category: "Perm", name: "디지털 열펌", price: 160000, durationMinutes: 150, depositAmount: 50000, sortOrder: 1 },
  { id: "perm-volume", category: "Perm", name: "시그니처 볼륨매직", price: 200000, durationMinutes: 180, depositAmount: 50000, sortOrder: 2 },
  { id: "color-basic", category: "Color", name: "베이직 전체 컬러", price: 100000, durationMinutes: 120, depositAmount: 30000, sortOrder: 0 },
  { id: "color-premium", category: "Color", name: "프리미엄 케어 컬러", price: 140000, durationMinutes: 150, depositAmount: 40000, sortOrder: 1 },
  { id: "color-bleach", category: "Color", name: "디자인 탈색 / 발레아쥬 1회 기준", price: 150000, durationMinutes: 180, depositAmount: 50000, sortOrder: 2 },
  { id: "clinic-protein", category: "Clinic", name: "수분 단백질 집중 케어", price: 80000, durationMinutes: 60, depositAmount: 20000, sortOrder: 0 },
  { id: "clinic-regen", category: "Clinic", name: "프리미엄 모발 재생 클리닉", price: 150000, durationMinutes: 90, depositAmount: 40000, sortOrder: 1 },
  { id: "clinic-scalp", category: "Clinic", name: "스칼프 두피 스파 케어", price: 70000, durationMinutes: 50, depositAmount: 20000, sortOrder: 2 }
];

export async function getServices(): Promise<ServiceItem[]> {
  const supabase = getSupabase();
  if (!supabase) return SERVICES_FALLBACK;

  try {
    const { data, error } = await supabase
      .from("services")
      .select("id, category, name, price, duration_minutes, deposit_amount, sort_order")
      .eq("is_published", true)
      .order("category")
      .order("sort_order");

    if (error || !data?.length) return SERVICES_FALLBACK;

    return data.map((row) => ({
      id: row.id,
      category: row.category,
      name: row.name,
      price: row.price,
      durationMinutes: row.duration_minutes ?? 60,
      depositAmount: row.deposit_amount,
      sortOrder: row.sort_order ?? 0
    }));
  } catch {
    return SERVICES_FALLBACK;
  }
}
