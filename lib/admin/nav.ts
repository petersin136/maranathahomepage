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
  | "/admin/customers/dashboard"
  | "/admin/customers/analytics"
  | "/admin/reminders"
  | "/admin/artists"
  | "/admin/services"
  | "/admin/settings";

export type AdminNavItem = {
  href: AdminHref;
  label: string;
  icon?: string;
  /** true면 pathname === href 만 활성 (대시보드 /admin) */
  exact?: boolean;
};

/** 1단 = 왼쪽 사이드바 큰 메뉴, 2단 = 상단 하위 탭(items) */
export type AdminMenu = {
  id: "dashboard" | "bookings" | "calendar" | "customers" | "finance" | "settings";
  label: string;
  href: AdminHref;
  icon: string;
  exact?: boolean;
  badge?: "bookings";
  items: AdminNavItem[];
};

export const ADMIN_MENUS: AdminMenu[] = [
  {
    id: "dashboard",
    label: "대시보드",
    href: "/admin",
    icon: "/admin-icons/lnb/house.png",
    exact: true,
    items: []
  },
  {
    id: "bookings",
    label: "예약관리",
    href: "/admin/bookings",
    icon: "/admin-icons/lnb/calendar.png",
    badge: "bookings",
    items: [
      { href: "/admin/bookings", label: "예약 목록", icon: "/admin-icons/lnb/calendar.png" },
      { href: "/admin/reminders", label: "알림", icon: "/admin-icons/lnb/calendar-check.png" }
    ]
  },
  {
    id: "calendar",
    label: "캘린더",
    href: "/admin/calendar",
    icon: "/admin-icons/lnb/calendar-check.png",
    items: []
  },
  {
    id: "customers",
    label: "고객관리",
    href: "/admin/customers",
    icon: "/admin-icons/lnb/users.png",
    items: [
      { href: "/admin/customers/dashboard", label: "대시보드", icon: "/admin-icons/lnb/house.png" },
      { href: "/admin/customers", label: "고객 목록", exact: true, icon: "/admin-icons/lnb/users.png" },
      { href: "/admin/customers/analytics", label: "고객 분석", icon: "/admin-icons/lnb/circle-user.png" }
    ]
  },
  {
    id: "finance",
    label: "매출·정산",
    href: "/admin/sales",
    icon: "/admin-icons/lnb/usd.png",
    items: [
      { href: "/admin/sales", label: "매출", icon: "/admin-icons/lnb/usd.png" },
      { href: "/admin/expenses", label: "비용", icon: "/admin-icons/lnb/card.png" },
      { href: "/admin/settlements", label: "정산", icon: "/admin-icons/lnb/calendar-check.png" },
      { href: "/admin/tax", label: "세무", icon: "/admin-icons/lnb/check.png" },
      { href: "/admin/export", label: "내보내기", icon: "/admin-icons/lnb/exit.png" }
    ]
  },
  {
    id: "settings",
    label: "매장설정",
    href: "/admin/settings",
    icon: "/admin-icons/lnb/settings.png",
    items: [
      { href: "/admin/artists", label: "디자이너", icon: "/admin-icons/lnb/user.png" },
      { href: "/admin/services", label: "시술", icon: "/admin-icons/lnb/list-filter.png" },
      { href: "/admin/settings", label: "사업자 정보", icon: "/admin-icons/lnb/settings.png" }
    ]
  }
];

export function isAdminNavItemActive(pathname: string, item: { href: string; exact?: boolean }) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function isAdminMenuActive(pathname: string, menu: AdminMenu) {
  if (isAdminNavItemActive(pathname, menu)) return true;
  return menu.items.some((item) => isAdminNavItemActive(pathname, item));
}

export function findAdminMenu(pathname: string): AdminMenu | null {
  return ADMIN_MENUS.find((menu) => isAdminMenuActive(pathname, menu)) ?? null;
}

/** 상단 탭 — 하위가 없으면 큰 메뉴 자신을 탭 1개로 */
export function adminSubTabs(menu: AdminMenu | null): AdminNavItem[] {
  if (!menu) return [];
  if (menu.items.length > 0) return menu.items;
  return [{ href: menu.href, label: menu.label, icon: menu.icon, exact: menu.exact }];
}

export const ADMIN_SIDEBAR_SLOT_ID = "admin-sidebar-slot";
