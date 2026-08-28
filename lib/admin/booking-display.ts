/** Language tags prepended to customer_request, e.g. `[JP] …` */
const LANG_TAG_RE = /^\[(JP|EN|CN)\]\s*/i;

/** Longer codes first so +886 wins over +86. */
const COUNTRY_CODE_PREFIXES = [
  "+886",
  "+852",
  "+853",
  "+855",
  "+856",
  "+880",
  "+971",
  "+966",
  "+972",
  "+81",
  "+82",
  "+86",
  "+84",
  "+66",
  "+65",
  "+63",
  "+62",
  "+61",
  "+60",
  "+49",
  "+44",
  "+39",
  "+34",
  "+33",
  "+31",
  "+7",
  "+1"
] as const;

export type BookingLang = "JP" | "EN" | "CN";

export function resolveCustomerRequestText(
  customerRequest: string | null | undefined,
  adminMemo?: string | null
): string {
  const direct = customerRequest?.trim();
  if (direct) return direct;
  const memo = adminMemo?.trim();
  if (memo?.startsWith("[고객요청] ")) return memo.slice("[고객요청] ".length).trim();
  return "";
}

export function parseRequestLanguage(requestText: string): {
  lang: BookingLang | null;
  body: string;
} {
  const m = requestText.match(LANG_TAG_RE);
  if (!m) return { lang: null, body: requestText };
  return {
    lang: m[1].toUpperCase() as BookingLang,
    body: requestText.slice(m[0].length).trim()
  };
}

/** Split `+…` phones into country code + national number for muted display. */
export function splitIntlPhone(phone: string): {
  countryCode: string | null;
  national: string;
} {
  const raw = phone.trim();
  if (!raw.startsWith("+")) return { countryCode: null, national: raw };

  const spaced = raw.match(/^(\+\d{1,4})\s+(.+)$/);
  if (spaced) {
    return { countryCode: spaced[1], national: spaced[2] };
  }

  for (const code of COUNTRY_CODE_PREFIXES) {
    if (raw.startsWith(code) && raw.length > code.length) {
      return { countryCode: code, national: raw.slice(code.length).replace(/^[\s-]+/, "") };
    }
  }

  const fallback = raw.match(/^(\+\d{1,3})(.*)$/);
  if (fallback && fallback[2]) {
    return {
      countryCode: fallback[1],
      national: fallback[2].replace(/^[\s-]+/, "")
    };
  }

  return { countryCode: raw, national: "" };
}
