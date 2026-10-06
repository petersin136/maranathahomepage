/** 값은 app/globals.css :root 에만 둔다. 여기서는 변수 참조만. */
export const adminTokens = {
  ink: "var(--ink)",
  inkSub: "var(--ink-sub)",
  muted: "var(--muted)",
  label: "var(--label)",
  ruleStrong: "var(--rule-strong)",
  rule: "var(--rule)",
  accent: "var(--accent)",
  surface: "var(--surface)",
  sidebarBg: "var(--sidebar-bg)",
  rowSelect: "var(--row-select)",
  danger: "var(--danger)"
} as const;

export type AdminToken = keyof typeof adminTokens;
