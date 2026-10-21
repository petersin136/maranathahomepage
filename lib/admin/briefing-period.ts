import { addDays, monthEnd, weekStartMonday } from "@/lib/admin/sales-data";

export type BriefingKind = "day" | "week" | "month" | "quarter" | "half" | "year";

export type BriefingRange = {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
};

function ymd(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function quarterIndex(month: number) {
  return Math.floor((Math.min(12, Math.max(1, month)) - 1) / 3) + 1;
}

export function briefingRange(kind: BriefingKind, year: number, month: number, date?: string): BriefingRange {
  if (kind === "year") {
    return {
      from: ymd(year, 1, 1),
      to: ymd(year, 12, 31),
      prevFrom: ymd(year - 1, 1, 1),
      prevTo: ymd(year - 1, 12, 31)
    };
  }
  if (kind === "half") {
    if (month <= 6) {
      return {
        from: ymd(year, 1, 1),
        to: ymd(year, 6, 30),
        prevFrom: ymd(year - 1, 7, 1),
        prevTo: ymd(year - 1, 12, 31)
      };
    }
    return {
      from: ymd(year, 7, 1),
      to: ymd(year, 12, 31),
      prevFrom: ymd(year, 1, 1),
      prevTo: ymd(year, 6, 30)
    };
  }
  if (kind === "quarter") {
    const startMonth = (quarterIndex(month) - 1) * 3 + 1;
    const from = ymd(year, startMonth, 1);
    const to = monthEnd(ymd(year, startMonth + 2, 1));
    const prevStart = new Date(Date.UTC(year, startMonth - 1 - 3, 1));
    const prevYear = prevStart.getUTCFullYear();
    const prevMonth = prevStart.getUTCMonth() + 1;
    const prevFrom = ymd(prevYear, prevMonth, 1);
    return { from, to, prevFrom, prevTo: monthEnd(ymd(prevYear, prevMonth + 2, 1)) };
  }
  if (kind === "week") {
    const anchor = date && date.length >= 10 ? date : ymd(year, month, 1);
    const from = weekStartMonday(anchor);
    const to = addDays(from, 6);
    return { from, to, prevFrom: addDays(from, -7), prevTo: addDays(from, -1) };
  }
  if (kind === "day") {
    const anchor = date && date.length >= 10 ? date : ymd(year, month, 1);
    const prev = addDays(anchor, -1);
    return { from: anchor, to: anchor, prevFrom: prev, prevTo: prev };
  }
  const from = ymd(year, month, 1);
  const to = monthEnd(from);
  const prevAnchor = new Date(Date.UTC(year, month - 2, 1));
  const prevYear = prevAnchor.getUTCFullYear();
  const prevMonth = prevAnchor.getUTCMonth() + 1;
  const prevFrom = ymd(prevYear, prevMonth, 1);
  return { from, to, prevFrom, prevTo: monthEnd(prevFrom) };
}

export function periodsPerYear(kind: BriefingKind) {
  if (kind === "year") return 1;
  if (kind === "half") return 2;
  if (kind === "quarter") return 4;
  if (kind === "month") return 12;
  if (kind === "week") return 52;
  return 365;
}

export function chipLabel(kind: BriefingKind, year: number, month: number, from: string, to: string) {
  if (kind === "week") return `${from.slice(5).replace("-", ". ")} ~ ${to.slice(5).replace("-", ". ")}`;
  if (kind === "day") return `${from.slice(0, 4)}. ${from.slice(5, 7)}. ${from.slice(8, 10)}`;
  if (kind === "quarter") return `${year}. ${quarterIndex(month)}분기`;
  if (kind === "half") return `${year}. ${month <= 6 ? "상" : "하"}반기`;
  if (kind === "year") return `${year}년`;
  return `${year}. ${String(month).padStart(2, "0")}`;
}

export function subtitleRange(kind: BriefingKind, year: number, month: number, from: string, to: string) {
  if (kind === "week") return `${from.slice(0, 4)}년 ${from.slice(5).replace("-", ". ")} ~ ${to.slice(5).replace("-", ". ")}`;
  if (kind === "day") {
    const [y, m, d] = from.split("-");
    return `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`;
  }
  if (kind === "quarter") return `${year}년 ${quarterIndex(month)}분기`;
  if (kind === "half") return `${year}년 ${month <= 6 ? "상반기" : "하반기"}`;
  if (kind === "year") return `${year}년`;
  return `${year}년 ${month}월`;
}

export function periodNoun(kind: BriefingKind) {
  if (kind === "week") return "이번 주";
  if (kind === "day") return "이날";
  if (kind === "quarter") return "이번 분기";
  if (kind === "half") return "이번 반기";
  if (kind === "year") return "올해";
  return "이번 달";
}

export function compareNoun(kind: BriefingKind) {
  if (kind === "week") return "지난주보다";
  if (kind === "day") return "전날보다";
  if (kind === "quarter") return "전분기보다";
  if (kind === "half") return "전반기보다";
  if (kind === "year") return "전년보다";
  return "지난달보다";
}

export function compareWord(kind: BriefingKind) {
  if (kind === "week") return "전주";
  if (kind === "day") return "전일";
  if (kind === "quarter") return "전분기";
  if (kind === "half") return "전반기";
  if (kind === "year") return "전년";
  return "전월";
}
