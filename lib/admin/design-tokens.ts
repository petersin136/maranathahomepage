/**
 * 관리자 화면 기준은 고객관리.
 * 값은 app/admin/customers/page.tsx 와 components/admin/AdminShell.tsx 에서 읽은 것.
 */

export const adminColor = {
  ink: "#1C1C1C",
  inkSub: "#3A3A3A",
  muted: "#8A847C",
  label: "#9A948C",
  ruleStrong: "#C9C3BB",
  rule: "#F3EFEA",
  sidebarBg: "#F9F8F4",
  rowSelect: "#F4EFE9",
  accent: "#2F3A2F",
  surface: "#ffffff"
} as const;

export const adminType = {
  pageTitle: { fontSize: "30px", fontWeight: 700 },
  pageCount: { fontSize: "15px", fontWeight: 400 },
  tableHead: { fontSize: "15px", fontWeight: 700 },
  tableCell: { fontSize: "16px", fontWeight: 500 },
  sidebarNav: { fontSize: "17px", fontWeight: 500 },
  button: { fontSize: "14px", fontWeight: 700 }
} as const;

export const adminSize = {
  sidebarWidth: "242px",
  navItemHeight: "59px",
  navItemRadius: "4px",
  buttonHeight: "40px",
  buttonRadius: "8px",
  tableCellPaddingY: "15px"
} as const;

/**
 * 고객관리에 hex는 있으나 위 목록에 없던 빨강.
 * 발송 실패·취소 상태색과 같다. 경고와 하락에만 쓴다.
 */
export const adminDanger = "#E24B4B";

/** 기존 화면에 없는 요소. 위 값에서 파생. */
export const adminStatCard = {
  background: adminColor.surface,
  border: `1px solid ${adminColor.rule}`,
  borderRadius: adminSize.buttonRadius,
  boxShadow: "none",
  padding: "20px",
  value: {
    fontSize: "30px",
    fontWeight: 700,
    color: adminColor.ink,
    lineHeight: 1
  },
  label: {
    fontSize: adminType.pageCount.fontSize,
    fontWeight: adminType.pageCount.fontWeight,
    color: adminColor.muted,
    lineHeight: 1
  }
} as const;

export const adminChart = {
  color: adminColor.accent,
  warning: adminDanger
} as const;

export const adminTrend = {
  up: adminColor.accent,
  down: adminDanger,
  flat: adminColor.muted
} as const;

export const adminLayout = {
  pageBg: "#F5F4F0",
  cardRadius: "8px",
  cardShadow: "0 1px 3px rgba(0,0,0,0.04)",
  cardPadding: "20px 24px",
  cardGap: "16px",
  statNumber: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#1C1C1C",
    lineHeight: 1
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: 500,
    color: "#8A847C",
    lineHeight: 1
  }
} as const;
