/** 양력 고정 공휴일. 토요일·일요일이면 다음 평일을 대체공휴일로 둔다. */
const SOLAR: [number, number][] = [
  [1, 1],
  [3, 1],
  [5, 5],
  [6, 6],
  [8, 15],
  [10, 3],
  [10, 9],
  [12, 25]
];

/** 설·추석·부처님오신날과 그해 대체공휴일. MM-DD */
const LUNAR: Record<number, string[]> = {
  2025: ["01-28", "01-29", "01-30", "05-05", "10-05", "10-06", "10-07"],
  2026: ["02-16", "02-17", "02-18", "05-24", "09-24", "09-25", "09-26"],
  2027: ["02-06", "02-07", "02-08", "02-09", "05-12", "09-14", "09-15", "09-16"],
  2028: ["01-26", "01-27", "01-28", "05-02", "05-12", "10-02", "10-03", "10-04", "10-05"]
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function isKoreanHoliday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return false;
  const marked = new Set<string>();
  for (const [sm, sd] of SOLAR) marked.add(ymd(y, sm, sd));
  for (const md of LUNAR[y] ?? []) marked.add(`${y}-${md}`);
  const seeds = [...marked];
  for (const key of seeds) {
    const [yy, mm, dd] = key.split("-").map(Number);
    const dt = new Date(yy, mm - 1, dd);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) continue;
    const cursor = new Date(yy, mm - 1, dd);
    do {
      cursor.setDate(cursor.getDate() + 1);
    } while (
      marked.has(ymd(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate())) ||
      cursor.getDay() === 0 ||
      cursor.getDay() === 6
    );
    marked.add(ymd(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()));
  }
  return marked.has(date);
}
