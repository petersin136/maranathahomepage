export type ServiceItem = {
  id: string;
  category: "Cut" | "Perm" | "Color" | "Clinic" | string;
  name: string;
  price: number;
  durationMinutes: number;
  depositAmount: number | null;
  sortOrder: number;
};

/**
 * Supabase services 테이블 — 마이그레이션 002 참고
 */
