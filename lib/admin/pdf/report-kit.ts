import PDFDocument from "pdfkit";
import path from "node:path";

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const M = 40;
export const CW = PAGE_W - M * 2;
export const FOOTER_Y = PAGE_H - 36;
export const LIMIT = FOOTER_Y - 10;

export const COLOR = {
  green: "#2F3A2F",
  greenSub: "#C9CEC9",
  coverSub: "#AEB6AE",
  cream: "#F7F5F0",
  ink: "#1F1F1F",
  sub: "#8A8680",
  line: "#E6E2DA",
  lineStrong: "#CFC9BE",
  track: "#E4DFD6",
  minus: "#A65A3A",
  white: "#FFFFFF",
  seg: ["#2F3A2F", "#8A847C", "#9A948C", "#1C1C1C", "#8A847C"],
};

export const R = "NotoR";
export const B = "NotoB";
const fontPath = (name: string) => path.join(process.cwd(), "lib/admin/fonts", name);

export type Doc = PDFKit.PDFDocument;
export type TOpt = { size: number; bold?: boolean; color?: string; spacing?: number };
export type Chip = { text: string; filled: boolean } | null;

export const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
export const comma = (v: number) => Math.round(Math.abs(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const won = (v: number) => `${comma(v)}원`;
export const kpiWon = (v: number) => `${v < 0 ? "\u2212" : ""}${won(v)}`;
export const signedWon = (v: number, sign: "+" | "-") => `${sign === "+" ? "+" : "\u2212"}${won(v)}`;
export const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export function kst(d: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  return `${g("year")}.${g("month")}.${g("day")} ${g("hour")}:${g("minute")}`;
}

export function width(doc: Doc, s: string, o: TOpt) {
  doc.font(o.bold ? B : R).fontSize(o.size);
  return doc.widthOfString(s, { characterSpacing: o.spacing ?? 0 });
}
export function t(doc: Doc, s: string, x: number, y: number, o: TOpt) {
  doc.font(o.bold ? B : R).fontSize(o.size).fillColor(o.color ?? COLOR.ink)
    .text(s, x, y, { lineBreak: false, characterSpacing: o.spacing ?? 0 });
}
export function tr(doc: Doc, s: string, rightX: number, y: number, o: TOpt) {
  t(doc, s, rightX - width(doc, s, o), y, o);
}
export function hline(doc: Doc, x1: number, x2: number, y: number, w: number, c: string) {
  doc.save().moveTo(x1, y).lineTo(x2, y).lineWidth(w).strokeColor(c).stroke().restore();
}
export function fitSize(doc: Doc, s: string, max: number, min: number, maxW: number) {
  let size = max;
  while (size > min && width(doc, s, { size, bold: true }) > maxW) size -= 0.5;
  return size;
}

export function createReportDoc(title: string) {
  const zero = { top: 0, bottom: 0, left: 0, right: 0 };
  const doc = new PDFDocument({
    size: "A4", margins: zero, bufferPages: true,
    font: fontPath("NotoSansKR-Regular.ttf"),
    info: { Title: title, Author: "HAIR UP" },
  });
  doc.registerFont(R, fontPath("NotoSansKR-Regular.ttf"));
  doc.registerFont(B, fontPath("NotoSansKR-Bold.ttf"));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const addPage = () => { doc.addPage({ size: "A4", margins: zero }); };
  return { doc, done, addPage };
}

export type CoverSpec = {
  salon: string;
  kicker: string;
  title: string;
  subtitle: string;
  heroLabel: string;
  heroValue: string;
  mini: { label: string; value: string }[];
  chip: Chip;
  issuedAt: Date;
};

export function drawCover(doc: Doc, c: CoverSpec) {
  const X = 56;
  const W = PAGE_W - X * 2;
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLOR.green);
  doc.save().fillOpacity(0.05).circle(PAGE_W - 20, 150, 240).fill(COLOR.white).restore();
  doc.save().fillOpacity(0.035).circle(60, PAGE_H - 30, 160).fill(COLOR.white).restore();
  doc.save().roundedRect(24, 24, PAGE_W - 48, PAGE_H - 48, 4)
    .lineWidth(0.5).strokeOpacity(0.25).strokeColor(COLOR.white).stroke().restore();

  t(doc, "HAIR UP", X, 64, { size: 8, bold: true, color: COLOR.white, spacing: 2 });
  tr(doc, "원장 전용 · 대외비", PAGE_W - X, 64, { size: 7.5, color: COLOR.coverSub });

  let y = 270;
  t(doc, c.kicker, X, y, { size: 9, color: COLOR.coverSub, spacing: 3 });
  y += 24;
  const size = fitSize(doc, c.salon, 40, 24, W);
  if (width(doc, c.salon, { size, bold: true }) <= W) {
    t(doc, c.salon, X, y, { size, bold: true, color: COLOR.white });
    y += size * 1.3;
  } else {
    doc.font(B).fontSize(24).fillColor(COLOR.white).text(c.salon, X, y, { width: W, lineGap: 2 });
    y = doc.y + 4;
  }
  y += 14;
  doc.rect(X, y, 36, 1.5).fill(COLOR.cream);
  y += 18;
  t(doc, c.title, X, y, { size: 14, color: COLOR.white });
  t(doc, c.subtitle, X, y + 22, { size: 9, color: COLOR.coverSub });

  let hy = 560;
  t(doc, c.heroLabel, X, hy, { size: 9, color: COLOR.coverSub });
  t(doc, c.heroValue, X, hy + 16, { size: fitSize(doc, c.heroValue, 30, 18, W), bold: true, color: COLOR.white });
  hy += 66;
  doc.save().moveTo(X, hy).lineTo(X + W, hy).lineWidth(0.5).strokeOpacity(0.3).strokeColor(COLOR.white).stroke().restore();

  const n = Math.max(1, c.mini.length);
  const colW = W / n;
  c.mini.forEach((m, i) => {
    const x = X + i * colW + (i === 0 ? 0 : 14);
    if (i > 0) {
      doc.save().moveTo(X + i * colW, hy + 12).lineTo(X + i * colW, hy + 46)
        .lineWidth(0.5).strokeOpacity(0.3).strokeColor(COLOR.white).stroke().restore();
    }
    t(doc, m.label, x, hy + 14, { size: 7.5, color: COLOR.coverSub });
    t(doc, m.value, x, hy + 28, { size: fitSize(doc, m.value, 12, 9, colW - 20), bold: true, color: COLOR.white });
  });

  const by = PAGE_H - 92;
  let ix = X;
  if (c.chip) {
    const cw = width(doc, c.chip.text, { size: 8, bold: true }) + 16;
    if (c.chip.filled) {
      doc.roundedRect(X, by, cw, 16, 4).fill(COLOR.cream);
      t(doc, c.chip.text, X + 8, by + 3, { size: 8, bold: true, color: COLOR.green });
    } else {
      doc.save().roundedRect(X, by, cw, 16, 4).lineWidth(0.7).strokeOpacity(0.6).strokeColor(COLOR.white).stroke().restore();
      t(doc, c.chip.text, X + 8, by + 3, { size: 8, bold: true, color: COLOR.white });
    }
    ix = X + cw + 10;
  }
  t(doc, `발행 ${kst(c.issuedAt)} (KST)`, ix, by + 4, { size: 7.5, color: COLOR.coverSub });
  tr(doc, "Prepared by HAIR UP", PAGE_W - X, by + 4, { size: 7.5, color: COLOR.coverSub, spacing: 0.5 });
}

export type HeaderSpec = { salon: string; kicker: string; subtitle: string; chip: Chip; issuedAt: Date };

export function drawHeader(doc: Doc, h: HeaderSpec, compact = false): number {
  let y = M;
  if (compact) {
    t(doc, h.salon, M, y, { size: 9, bold: true });
    tr(doc, `${h.kicker} · ${h.subtitle.split(" · ")[0]}`, PAGE_W - M, y + 1, { size: 7, color: COLOR.sub, spacing: 0.5 });
    y += 16;
    hline(doc, M, PAGE_W - M, y, 0.5, COLOR.line);
    return y + 12;
  }
  t(doc, h.kicker, M, y, { size: 7, color: COLOR.sub, spacing: 1.5 });
  t(doc, h.salon, M, y + 11, { size: fitSize(doc, h.salon, 15, 11, CW - 140), bold: true });
  t(doc, h.subtitle, M, y + 33, { size: 8.5, color: COLOR.sub });
  if (h.chip) {
    const cw = width(doc, h.chip.text, { size: 8, bold: true }) + 16;
    const cx = PAGE_W - M - cw;
    doc.roundedRect(cx, y + 10, cw, 16, 4).fill(h.chip.filled ? COLOR.green : COLOR.cream);
    if (!h.chip.filled) {
      doc.save().roundedRect(cx, y + 10, cw, 16, 4).lineWidth(0.5).strokeColor(COLOR.lineStrong).stroke().restore();
    }
    t(doc, h.chip.text, cx + 8, y + 13, { size: 8, bold: true, color: h.chip.filled ? COLOR.white : COLOR.sub });
  }
  tr(doc, `발행 ${kst(h.issuedAt)} (KST)`, PAGE_W - M, y + 34, { size: 7, color: COLOR.sub });
  y += 50;
  hline(doc, M, PAGE_W - M, y, 0.5, COLOR.line);
  return y + 12;
}

export type Kpi = { label: string; value: string; caption: string; dark?: boolean };

export function drawKpis(doc: Doc, y: number, kpis: Kpi[]): number {
  const gap = 8;
  const n = kpis.length;
  const kw = (CW - gap * (n - 1)) / n;
  const kh = 62;
  kpis.forEach((k, i) => {
    const x = M + i * (kw + gap);
    doc.roundedRect(x, y, kw, kh, 6).fill(k.dark ? COLOR.green : COLOR.cream);
    const fg = k.dark ? COLOR.white : COLOR.ink;
    t(doc, k.label, x + 12, y + 11, { size: 8, color: fg });
    t(doc, k.value, x + 12, y + 25, { size: fitSize(doc, k.value, 14, 9, kw - 24), bold: true, color: fg });
    t(doc, k.caption, x + 12, y + 47, { size: 6.5, color: k.dark ? COLOR.greenSub : COLOR.sub });
  });
  return y + kh + 10;
}

export type ShareRow = { label: string; amount: number; caption?: string; pctText?: string; color?: string };
export type ShareSpec = {
  title: string;
  rows: ShareRow[];
  base: number;
  bar?: boolean;
  rowBars?: boolean;
  total?: { label: string; amount: number };
};

export function shareHeight(s: ShareSpec) {
  const rowH = (r: ShareRow) => (s.rowBars ? 32 : r.caption ? 30 : 24);
  return 14 + 20 + (s.bar ? 18 : 0) + s.rows.reduce((a, r) => a + rowH(r), 0) + (s.total ? 22 : 0) + 12;
}

export function drawShare(doc: Doc, x: number, y: number, w: number, h: number, s: ShareSpec) {
  doc.roundedRect(x, y, w, h, 6).fill(COLOR.cream);
  const px = 14;
  const iw = w - px * 2;
  let cy = y + 14;
  t(doc, s.title, x + px, cy, { size: 8, color: COLOR.sub });
  cy += 20;

  if (s.bar) {
    doc.roundedRect(x + px, cy, iw, 6, 1.5).fill(COLOR.track);
    let bx = x + px;
    s.rows.forEach((r, i) => {
      const sw = s.base > 0 ? (Math.max(0, r.amount) / s.base) * iw : 0;
      if (sw > 0) doc.rect(bx, cy, Math.min(sw, x + px + iw - bx), 6).fill(r.color ?? COLOR.seg[i % COLOR.seg.length]);
      bx += sw;
    });
    cy += 18;
  }

  s.rows.forEach((r, idx) => {
    const p = r.pctText ?? `${pct(r.amount, s.base)}%`;
    doc.rect(x + px, cy + 1.5, 2, 10).fill(COLOR.ink);
    t(doc, p, x + px + 7, cy, { size: 9, bold: true });
    t(doc, r.label, x + px + 7 + width(doc, p, { size: 9, bold: true }) + 5, cy, { size: 9 });
    tr(doc, won(r.amount), x + w - px, cy, { size: 9, color: COLOR.sub });
    let rh: number;
    if (s.rowBars) {
      const ratio = s.base > 0 ? Math.min(1, Math.max(0, r.amount / s.base)) : 0;
      doc.roundedRect(x + px, cy + 16, iw, 5, 1.5).fill(COLOR.track);
      if (ratio > 0) doc.roundedRect(x + px, cy + 16, iw * ratio, 5, 1.5).fill(r.color ?? COLOR.seg[idx % COLOR.seg.length]);
      rh = 32;
    } else {
      if (r.caption) t(doc, r.caption, x + px + 7, cy + 13, { size: 6.5, color: COLOR.sub });
      rh = r.caption ? 30 : 24;
    }
    cy += rh;
    if (!s.rowBars && idx < s.rows.length - 1) hline(doc, x + px, x + w - px, cy - 4, 0.5, COLOR.line);
  });

  if (s.total) {
    const totalY = y + h - 26;
    hline(doc, x + px, x + w - px, totalY - 8, 1, COLOR.lineStrong);
    t(doc, s.total.label, x + px, totalY, { size: 9, bold: true });
    tr(doc, won(s.total.amount), x + w - px, totalY - 0.5, { size: 9.5, bold: true });
  }
}

export function drawSharePair(doc: Doc, y: number, left: ShareSpec, right: ShareSpec): number {
  const gap = 8;
  const colW = (CW - gap) / 2;
  const h = Math.max(shareHeight(left), shareHeight(right));
  drawShare(doc, M, y, colW, h, left);
  drawShare(doc, M + colW + gap, y, colW, h, right);
  return y + h + 16;
}

export type Col = { key: string; label: string; w: number; align?: "left" | "right"; bold?: boolean; maxLines?: number };
export type TableSpec = {
  title: string;
  count?: string;
  cols: Col[];
  rows: Record<string, string>[];
  maxLines?: number;
  cellPad?: number;
  empty?: string;
};

const FS = 8;
const LH = 11;
const PY = 6;
const HEAD_H = 20;

function wrapCell(doc: Doc, s: string, w: number, max: number, bold: boolean) {
  doc.font(bold ? B : R).fontSize(FS);
  const out: string[] = [];
  let cur = "";
  for (const ch of Array.from(s)) {
    if (ch === "\n") {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    if (cur && doc.widthOfString(cur + ch) > w) {
      const plus = cur.lastIndexOf(" + ");
      const middot = cur.lastIndexOf(" · ");
      const space = cur.lastIndexOf(" ");
      const at = plus > 0 ? plus : middot > 0 ? middot : space;
      if (at > 0) {
        const skip = plus > 0 || middot > 0 ? 3 : 1;
        out.push(cur.slice(0, at));
        cur = cur.slice(at + skip) + ch;
      } else {
        out.push(cur);
        cur = ch === " " ? "" : ch;
      }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  if (out.length <= max) return out.length ? out : [""];
  const kept = out.slice(0, max);
  let last = kept[max - 1];
  while (last && doc.widthOfString(last + "…") > w) last = last.slice(0, -1);
  kept[max - 1] = last + "…";
  return kept;
}

function headerLines(doc: Doc, s: string, w: number) {
  doc.font(R).fontSize(7.5);
  if (doc.widthOfString(s) <= w) return [s];
  const lines: string[] = [];
  let cur = "";
  for (const ch of Array.from(s)) {
    if (cur && doc.widthOfString(cur + ch) > w) {
      const space = cur.lastIndexOf(" ");
      if (space > 0) {
        lines.push(cur.slice(0, space));
        cur = cur.slice(space + 1) + ch;
      } else {
        lines.push(cur);
        cur = ch;
      }
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  if (lines.length <= 2) return lines.length ? lines : [""];
  const kept = lines.slice(0, 2);
  let last = kept[1];
  while (last && doc.widthOfString(last + "…") > w) last = last.slice(0, -1);
  kept[1] = last + "…";
  return kept;
}

export function drawTable(doc: Doc, startY: number, spec: TableSpec, nextPage: () => number): number {
  const pad = spec.cellPad ?? 8;
  const sum = spec.cols.reduce((a, c) => a + c.w, 0);
  const ws = spec.cols.map((c) => (c.w / sum) * CW);
  const xs = ws.map((_, i) => M + ws.slice(0, i).reduce((a, b) => a + b, 0));
  const heads = spec.cols.map((c, i) => headerLines(doc, c.label, ws[i] - pad * 2));
  const headH = heads.some((lines) => lines.length > 1) ? 32 : HEAD_H;
  const head = (yy: number) => {
    doc.roundedRect(M, yy, CW, headH, 4).fill(COLOR.cream);
    spec.cols.forEach((c, i) => {
      const cx = xs[i] + pad;
      const cw = ws[i] - pad * 2;
      heads[i].forEach((ln, k) => {
        const o = { size: 7.5, color: COLOR.sub };
        if (c.align === "right") tr(doc, ln, cx + cw, yy + 5 + k * 12, o);
        else t(doc, ln, cx, yy + 5 + k * 12, o);
      });
    });
    return yy + headH;
  };

  let y = startY;
  if (y + 20 + headH + 28 > LIMIT) y = nextPage();
  t(doc, spec.title, M, y, { size: 11, bold: true });
  if (spec.count) {
    t(doc, spec.count, M + width(doc, spec.title, { size: 11, bold: true }) + 6, y + 3, { size: 8, color: COLOR.sub });
  }
  y = head(y + 20);

  if (!spec.rows.length) {
    t(doc, spec.empty ?? "내역이 없습니다.", M + 8, y + 10, { size: 8, color: COLOR.sub });
    return y + 34;
  }

  for (const row of spec.rows) {
    const cells = spec.cols.map((c, i) =>
      wrapCell(doc, row[c.key] ?? "", ws[i] - pad * 2, c.maxLines ?? (c.align === "right" ? 1 : spec.maxLines ?? 2), !!c.bold));
    const lines = Math.max(1, ...cells.map((l) => l.length));
    const rh = PY * 2 + lines * LH;
    if (y + rh > LIMIT) y = head(nextPage());
    cells.forEach((ls, i) => {
      const c = spec.cols[i];
      const cx = xs[i] + pad;
      const cw = ws[i] - pad * 2;
      ls.forEach((ln, k) => {
        const o = { size: FS, bold: !!c.bold };
        if (c.align === "right") tr(doc, ln, cx + cw, y + PY + k * LH, o);
        else t(doc, ln, cx, y + PY + k * LH, o);
      });
    });
    y += rh;
    hline(doc, M, M + CW, y, 0.5, COLOR.line);
  }
  return y + 14;
}

export function drawNote(doc: Doc, y: number, text: string, nextPage: () => number): number {
  doc.font(R).fontSize(6.5);
  const h = doc.heightOfString(text, { width: CW, lineGap: 2 });
  if (y + h > LIMIT) y = nextPage();
  doc.fillColor(COLOR.sub).text(text, M, y, { width: CW, lineGap: 2 });
  return y + h + 8;
}

export function finalizeFooters(doc: Doc, leftText: string, hasCover = true) {
  const range = doc.bufferedPageRange();
  const start = range.start + (hasCover ? 1 : 0);
  const end = range.start + range.count;
  const total = end - start;
  for (let p = start; p < end; p++) {
    doc.switchToPage(p);
    hline(doc, M, PAGE_W - M, FOOTER_Y, 0.5, COLOR.line);
    t(doc, leftText, M, FOOTER_Y + 6, { size: 7, color: COLOR.sub });
    tr(doc, `Prepared by HAIR UP · ${p - start + 1} / ${total}`, PAGE_W - M, FOOTER_Y + 6, { size: 7, color: COLOR.sub });
  }
}
