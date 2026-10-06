export type CalendarTone = "perm" | "color" | "clinic" | "cut" | "consult";

/** 여러 시술이면 펌 > 염색 > 클리닉 > 커트 > 상담 */
const TONE_PRIORITY: CalendarTone[] = ["perm", "color", "clinic", "cut", "consult"];

function serviceTone(service: { category: string | null; name: string }): CalendarTone {
  if (service.name.includes("상담")) return "consult";
  switch (service.category) {
    case "Perm":
      return "perm";
    case "Color":
      return "color";
    case "Clinic":
      return "clinic";
    case "Cut":
      return "cut";
  }
  if (/펌|매직/.test(service.name)) return "perm";
  if (/염색|컬러|탈색/.test(service.name)) return "color";
  if (/클리닉|케어/.test(service.name)) return "clinic";
  return "cut";
}

export function bookingTone(services: { category: string | null; name: string }[]): CalendarTone {
  if (services.length === 0) return "cut";
  const tones = new Set(services.map(serviceTone));
  return TONE_PRIORITY.find((t) => tones.has(t)) ?? "cut";
}
