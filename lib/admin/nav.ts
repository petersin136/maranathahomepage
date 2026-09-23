export type AdminHref =
  | "/admin"
  | "/admin/bookings"
  | "/admin/calendar"
  | "/admin/sales"
  | "/admin/expenses"
  | "/admin/settlements"
  | "/admin/tax"
  | "/admin/export"
  | "/admin/customers"
  | "/admin/reminders"
  | "/admin/artists"
  | "/admin/services"
  | "/admin/settings";

export type AdminNavItem = {
  href: AdminHref;
  label: string;
  /** true면 pathname === href 만 활성 (대시보드 /admin) */
  exact?: boolean;
};

export type AdminNavGroup = {
  id: "ops" | "finance" | "customers" | "settings";
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "ops",
    label: "운영",
    items: [
      { href: "/admin", label: "대시보드", exact: true },
      { href: "/admin/bookings", label: "예약" },
      { href: "/admin/calendar", label: "캘린더" }
    ]
  },
  {
    id: "finance",
    label: "정산",
    items: [
      { href: "/admin/sales", label: "매출" },
      { href: "/admin/expenses", label: "비용" },
      { href: "/admin/settlements", label: "정산" },
      { href: "/admin/tax", label: "세무" },
      { href: "/admin/export", label: "내보내기" }
    ]
  },
  {
    id: "customers",
    label: "고객",
    items: [
      { href: "/admin/customers", label: "고객 분석" },
      { href: "/admin/reminders", label: "알림" }
    ]
  },
  {
    id: "settings",
    label: "설정",
    items: [
      { href: "/admin/artists", label: "디자이너" },
      { href: "/admin/services", label: "시술" },
      { href: "/admin/settings", label: "사업자 정보" }
    ]
  }
];

export function isAdminNavItemActive(pathname: string, item: AdminNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findAdminNavGroup(pathname: string): AdminNavGroup {
  for (const group of ADMIN_NAV_GROUPS) {
    if (group.items.some((item) => isAdminNavItemActive(pathname, item))) {
      return group;
    }
  }
  return ADMIN_NAV_GROUPS[0];
}
