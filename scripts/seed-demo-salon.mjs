/**
 * 원장님 데모용 8~10월 살롱 운영 데이터.
 * 10/16 연예인 하루 예시는 유지하고, 그 전후 재방문·신규·제품·지출·정산을 채운다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = value;
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

const ARTISTS = [
  { id: "jay", name: "재이", rate: 0, freelance: true, off: null, bank: ["하나은행", "1111111111", "재이테스트"] },
  { id: "seoa", name: "서아", rate: 30, freelance: true, off: 2, bank: ["하나은행", "2222222222", "서아테스트"] },
  { id: "kai", name: "카이", rate: 40, freelance: true, off: null, bank: ["하나은행", "0123456789", "헤어업살롱"] },
  { id: "yumi", name: "유미", rate: 35, freelance: true, off: null, bank: ["하나은행", "3333333333", "유미테스트"] }
];

const SERVICES = [
  { id: "cut-basic", name: "기본 컷", price: 25000, duration: 55, deposit: 10000 },
  { id: "cut-signature", name: "시그니처 레이어드 / 디자인 컷", price: 35000, duration: 60, deposit: 10000 },
  { id: "cut-mens", name: "맨즈 디자인 컷", price: 60000, duration: 50, deposit: 20000 },
  { id: "perm-design", name: "디자인 일반펌", price: 90000, duration: 120, deposit: 30000 },
  { id: "perm-digital", name: "디지털 열펌", price: 160000, duration: 150, deposit: 50000 },
  { id: "perm-volume", name: "시그니처 볼륨매직", price: 200000, duration: 180, deposit: 50000 },
  { id: "color-basic", name: "베이직 전체 컬러", price: 100000, duration: 120, deposit: 30000 },
  { id: "color-premium", name: "프리미엄 케어 컬러", price: 140000, duration: 150, deposit: 40000 },
  { id: "color-bleach", name: "디자인 탈색 / 발레아쥬 1회 기준", price: 150000, duration: 180, deposit: 50000 },
  { id: "clinic-protein", name: "수분 단백질 집중 케어", price: 80000, duration: 60, deposit: 20000 },
  { id: "clinic-regen", name: "프리미엄 모발 재생 클리닉", price: 150000, duration: 90, deposit: 40000 },
  { id: "clinic-scalp", name: "스칼프 두피 스파 케어", price: 70000, duration: 50, deposit: 20000 }
];
const SERVICE_BY_ID = Object.fromEntries(SERVICES.map((row) => [row.id, row]));

const PRODUCT_DESIGNER_RATE = 15;
const PRODUCTS = [
  { id: "prod-oribe-shampoo", name: "오리베 골드 샴푸 250ml", price: 48000, cost: 26400 },
  { id: "prod-oribe-cond", name: "오리베 컨디셔너 250ml", price: 48000, cost: 26400 },
  { id: "prod-kerastase-oil", name: "케라스타즈 엘릭서 얼팀 오일", price: 62000, cost: 34100 },
  { id: "prod-molton-shampoo", name: "몰튼브라운 리페어 샴푸", price: 42000, cost: 23100 },
  { id: "prod-ampoule", name: "헤어업 홈케어 앰플 세트", price: 38000, cost: 14400 },
  { id: "prod-scalp-kit", name: "두피 스케일링 홈키트", price: 35000, cost: 13300 },
  { id: "prod-curl-essence", name: "컬링 에센스", price: 28000, cost: 10600 }
];
const PRODUCT_BY_NAME = Object.fromEntries(PRODUCTS.map((row) => [row.name, row]));

function productRetailFromNames(names) {
  let retail = 0;
  for (const raw of names || []) {
    const text = String(raw || "");
    if (!text.startsWith("[제품] ")) continue;
    const product = PRODUCT_BY_NAME[text.slice("[제품] ".length).trim()];
    if (product) retail += product.price;
  }
  return retail;
}

/** 남성: 맨즈컷·재생·기본컷 위주. 여성 전용(볼륨매직·레이어드·탈색) 제외 */
const COMBOS_M = [
  ["cut-mens"],
  ["cut-mens"],
  ["cut-mens", "clinic-protein"],
  ["cut-mens", "clinic-regen"],
  ["cut-basic"],
  ["cut-basic", "clinic-protein"],
  ["cut-mens", "clinic-scalp"],
  ["clinic-regen"],
  ["clinic-protein"],
  ["color-basic"],
  ["color-premium", "clinic-protein"],
  ["perm-design", "cut-basic"],
  ["cut-basic", "perm-digital"]
];

/** 여성: 레이어드·볼륨매직·컬러·탈색. 맨즈컷 제외 */
const COMBOS_W = [
  ["cut-signature"],
  ["cut-signature", "perm-volume"],
  ["perm-volume"],
  ["cut-basic"],
  ["cut-basic", "perm-digital"],
  ["color-premium"],
  ["color-premium", "clinic-protein"],
  ["color-bleach", "clinic-protein"],
  ["clinic-scalp", "cut-signature"],
  ["clinic-protein"],
  ["color-basic"],
  ["perm-design", "cut-basic"],
  ["cut-signature", "clinic-protein"]
];

function combosFor(gender) {
  return gender === "M" ? COMBOS_M : COMBOS_W;
}

const REQUESTS = [
  "잘 부탁 드립니다!",
  "시간 꼭 지켜 주세요. 촬영이 바로 있어서요.",
  "앞머리만 가볍게 해주세요.",
  "펌이 잘 안 먹는 머리라 세게 말아주세요.",
  "두피가 예민해서 자극 적은 약으로 부탁드려요.",
  "이번엔 톤만 살짝 올리려구요.",
  "소개받고 왔어요. 잘 부탁해요.",
  "지난번 스타일 그대로 해주세요.",
  "볼륨이 너무 죽어서 살려주세요.",
  "출근 전에 들렀어요. 빠르게만 부탁합니다."
];

const NOTES = [
  "모발이 얇고 펌이 잘 안 먹음. 약 농도 한 단계 올려도 됨.",
  "두피 예민 / 약 냄새 싫어함. 시술 전 패치 테스트.",
  "성격이 급함. 대기 없이 바로 시작해야 함.",
  "컬러 후기 사진 찍는 거 좋아함. SNS 태그 허용.",
  "예약 변경이 잦음. 하루 전 리마인드 필수.",
  "특정 디자이너만 찾음. 다른 담당 배정 시 미리 설명.",
  "탈색 이력 있음. 클리닉 같이 권유.",
  "아이 픽업 시간 때문에 18시 이후 불가.",
  "카카오 알림은 잘 봄. 전화는 잘 안 받음.",
  "샴푸·오일은 매장 제품 재구매 의사 있음."
];

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261016);

function pick(list) {
  return list[Math.floor(rng() * list.length)];
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}
function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function dow(date) {
  return new Date(`${date}T12:00:00+09:00`).getDay();
}
function addMin(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

async function rest(path, init = {}) {
  const res = await fetch(URL_BASE + path, { ...init, headers: { ...HEADERS, ...(init.headers || {}) } });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} ${res.status} ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return json;
}

function celebrityRoster() {
  return [
    { name: "하정우", phone: "01055566669", gender: "M", artist: "yumi", newbie: false, note: "모발 재생 주기 짧음. 촬영 전날 예약 많음." },
    { name: "장동건", phone: "01055566699", gender: "M", artist: "kai", newbie: true, note: "첫 방문. 스타일 변화 원함. 상담 길게." },
    { name: "조인성", phone: "01056545454", gender: "M", artist: "jay", newbie: false, note: "디지털펌 단골. 결과 예민하니 사진 비교 준비." },
    { name: "고현정", phone: "01055669999", gender: "W", artist: "seoa", newbie: false, note: "촬영 스케줄 타이트. 시간 절대 오버 금지." },
    { name: "김건모", phone: "01055669888", gender: "M", artist: "kai", newbie: false, note: "투어 시즌엔 케어 위주. 볼륨 유지 요청." },
    { name: "김진한", phone: "01055556666", gender: "M", artist: "yumi", newbie: true, note: "입대 전 컷. 짧은 길이 선호." },
    { name: "한고은", phone: "01055566666", gender: "W", artist: "yumi", newbie: false, note: "볼륨매직 유지. 뿌리 볼륨 약하면 바로 클레임." },
    { name: "이병헌", phone: "01055556687", gender: "M", artist: "seoa", newbie: false, note: "말수 적음. 평소 맨즈컷만." },
    { name: "유아인", phone: "01056848455", gender: "M", artist: "jay", newbie: false, note: "레이어드 짧게. 원장님만 찾음." },
    { name: "한석규", phone: "01065485555", gender: "M", artist: "seoa", newbie: false, note: "푸석함 고민. 클리닉+컷 세트 자주." },
    { name: "전지현", phone: "01054859656", gender: "W", artist: "jay", newbie: false, note: "스케줄 엄수. 볼륨매직 주기 4개월." },
    { name: "지드레곤", phone: "01055557777", gender: "M", artist: "seoa", newbie: false, note: "두피 스파 선호. 디자인 컷은 과하지 않게." },
    { name: "현 빈", phone: "01056669988", gender: "M", artist: "kai", newbie: false, note: "손예진 소개. 촬영 전 맨즈컷." },
    { name: "김광규", phone: "01056565656", gender: "M", artist: "yumi", newbie: false, note: "모발 힘 약함. 재생 클리닉 권유." },
    { name: "손예진", phone: "01055566777", gender: "W", artist: "kai", newbie: false, note: "컬러+단백질 케어. 남편이랑 같이 오는 날 있음." },
    { name: "구하라", phone: "01056548888", gender: "W", artist: "seoa", newbie: true, note: "소개 첫 방문. 컬러 상담 자세히." },
    { name: "이종석", phone: "01056558888", gender: "M", artist: "jay", newbie: true, note: "기분 전환 컷. 과한 스타일 변화는 부담." },
    { name: "김민종", phone: "01055556661", gender: "M", artist: "yumi", newbie: true, note: "프로그램 보고 방문. 첫 상담 친절히." }
  ];
}

function extraRoster() {
  const names = [
    ["공유", "M", "jay"],
    ["송혜교", "W", "seoa"],
    ["아이유", "W", "jay"],
    ["박보검", "M", "kai"],
    ["김태희", "W", "yumi"],
    ["원빈", "M", "jay"],
    ["이민호", "M", "kai"],
    ["수지", "W", "seoa"],
    ["정해인", "M", "yumi"],
    ["한소희", "W", "seoa"],
    ["이동욱", "M", "jay"],
    ["신민아", "W", "yumi"],
    ["강동원", "M", "kai"],
    ["김고은", "W", "seoa"],
    ["류준열", "M", "jay"],
    ["혜리", "W", "yumi"],
    ["정우성", "M", "kai"],
    ["이영애", "W", "jay"],
    ["김수현", "M", "seoa"],
    ["박서준", "M", "yumi"],
    ["윤아", "W", "seoa"],
    ["이준기", "M", "kai"],
    ["전도연", "W", "jay"],
    ["조정석", "M", "yumi"],
    ["공효진", "W", "seoa"],
    ["유연석", "M", "kai"],
    ["김지원", "W", "yumi"],
    ["남주혁", "M", "jay"],
    ["박신혜", "W", "seoa"],
    ["이성경", "W", "yumi"],
    ["김우빈", "M", "kai"],
    ["신세경", "W", "jay"],
    ["임시완", "M", "seoa"],
    ["한지민", "W", "yumi"],
    ["조여정", "W", "kai"],
    ["김남길", "M", "jay"],
    ["이솜", "W", "seoa"],
    ["마동석", "M", "kai"],
    ["유해진", "M", "yumi"],
    ["황정민", "M", "jay"],
    ["김혜수", "W", "seoa"],
    ["송강호", "M", "kai"],
    ["이정재", "M", "jay"],
    ["하지원", "W", "yumi"],
    ["권상우", "M", "seoa"],
    ["장나라", "W", "kai"],
    ["이효리", "W", "jay"],
    ["김윤석", "M", "yumi"],
    ["박해일", "M", "seoa"],
    ["천우희", "W", "kai"]
  ];
  return names.map(([name, gender, artist], index) => ({
    name,
    phone: `0106${String(1000000 + index).slice(-7)}`,
    gender,
    artist,
    newbie: index % 10 < 3,
    note: NOTES[index % NOTES.length]
  }));
}

function comboMeta(ids) {
  const rows = ids.map((id) => SERVICE_BY_ID[id]).filter(Boolean);
  return {
    ids: rows.map((row) => row.id),
    names: rows.map((row) => row.name),
    price: rows.reduce((sum, row) => sum + row.price, 0),
    duration: rows.reduce((sum, row) => sum + row.duration, 0)
  };
}

function pickPay() {
  const x = rng();
  if (x < 0.72) return "card";
  if (x < 0.88) return "transfer";
  return "cash";
}

function maybeProduct(servicePrice) {
  if (rng() > 0.18) return null;
  const product = pick(PRODUCTS);
  return {
    id: product.id,
    name: `[제품] ${product.name}`,
    price: product.price,
    duration: 0
  };
}

const occupied = new Map();
function keyOcc(date, artist) {
  return `${date}|${artist}`;
}
function fits(date, artist, start, duration) {
  const end = toMin(start) + duration;
  if (end > 19 * 60 + 30) return false;
  const slots = occupied.get(keyOcc(date, artist)) ?? [];
  const a = toMin(start);
  return slots.every(([s, e]) => e <= a || s >= end);
}
function occupy(date, artist, start, duration) {
  const list = occupied.get(keyOcc(date, artist)) ?? [];
  list.push([toMin(start), toMin(start) + duration]);
  occupied.set(keyOcc(date, artist), list);
}

function slotList() {
  const out = [];
  for (let h = 10; h <= 18; h += 1) {
    out.push(`${pad(h)}:00`);
    if (h < 18) out.push(`${pad(h)}:30`);
  }
  return out;
}

function targetCount(date) {
  const day = dow(date);
  if (day === 5) return 14;
  if (day === 6) return 16;
  if (day === 0) return 8;
  return 11;
}

function openDates() {
  const dates = [];
  for (const [y, m] of [
    [2026, 8],
    [2026, 9],
    [2026, 10]
  ]) {
    const last = m === 10 ? 17 : daysInMonth(y, m);
    for (let d = 1; d <= last; d += 1) {
      const date = ymd(y, m, d);
      if (dow(date) === 1) continue;
      dates.push(date);
    }
  }
  return dates;
}

function depositAmountFor(serviceIds) {
  let sum = 0;
  for (const id of serviceIds) {
    const s = SERVICE_BY_ID[id];
    if (s?.deposit) sum += s.deposit;
  }
  return sum > 0 ? sum : 10000;
}

/** 대기=예약금 미입금, 확정=입금 후 스케줄 확정. 완료/취소·노쇼는 대부분 입금 이력이 있음. */
function depositState(status, serviceIds) {
  const amount = depositAmountFor(serviceIds);
  if (status === "pending") return { paid: false, amount };
  if (status === "confirmed") return { paid: true, amount };
  if (status === "completed") return { paid: rng() < 0.88, amount };
  // cancelled / noshow
  return { paid: rng() < 0.45, amount };
}

function makeBooking({ customer, date, time, artist, combo, product, status }) {
  const duration = combo.duration + (product?.duration ?? 0);
  const amount = combo.price + (product?.price ?? 0);
  const serviceIds = product ? [...combo.ids, product.id] : combo.ids;
  const serviceNames = product ? [...combo.names, product.name] : combo.names;
  const method = pickPay();
  const completed = status === "completed";
  const { paid: depositPaid, amount: depositAmount } = depositState(status, combo.ids);
  const cashReceipt = completed && method !== "card" && amount >= 100000 ? rng() < 0.9 : false;
  const paidAt = completed ? `${date}T${addMin(time, Math.max(40, duration))}:00+09:00` : null;
  return {
    booking_date: date,
    booking_time: time,
    artist_id: artist.id,
    artist_name: artist.name,
    service_ids: serviceIds,
    service_names: serviceNames,
    customer_name: customer.name,
    customer_gender: customer.gender,
    customer_phone: customer.phone,
    customer_request: pick(REQUESTS),
    privacy_agreed: true,
    status,
    cancel_reason: status === "cancelled" ? "고객 요청" : status === "noshow" ? "노쇼" : null,
    duration_minutes: duration,
    deposit_paid: depositPaid,
    deposit_amount: depositAmount,
    total_amount: amount,
    final_amount: completed ? amount : null,
    payment_method: completed ? method : null,
    cash_receipt_issued: cashReceipt,
    paid_at: paidAt,
    admin_memo: null
  };
}

function floorWon(value) {
  return Math.floor(value);
}
function floorToTen(value) {
  return Math.floor(value / 10) * 10;
}
function withholding(incentive) {
  const incomeTax = floorToTen(incentive * 0.03);
  const localIncomeTax = floorToTen(incomeTax * 0.1);
  return { incomeTax, localIncomeTax, withholding: incomeTax + localIncomeTax };
}

function snapshotMonth(year, month, bookings) {
  const from = ymd(year, month, 1);
  const to = ymd(year, month, daysInMonth(year, month));
  const grouped = new Map();
  for (const artist of ARTISTS) {
    grouped.set(artist.id, { artist, revenue: 0, count: 0, bookings: [] });
  }
  for (const row of bookings) {
    if (row.status !== "completed" || row.final_amount == null) continue;
    if (!row.paid_at) continue;
    const paidDay = row.paid_at.slice(0, 10);
    if (paidDay < from || paidDay > to) continue;
    const cur = grouped.get(row.artist_id);
    if (!cur) continue;
    const amount = Number(row.final_amount);
    cur.revenue += amount;
    cur.count += 1;
    cur.bookings.push({
      id: row.id,
      bookingDate: row.booking_date,
      paidAt: row.paid_at,
      customerName: row.customer_name,
      serviceNames: row.service_names,
      paymentMethod: row.payment_method,
      paymentMethodLabel: row.payment_method === "card" ? "카드" : row.payment_method === "cash" ? "현금" : "계좌이체",
      amount
    });
  }
  const artists = [...grouped.values()].map(({ artist, revenue, count, bookings: rows }) => {
    const hasCommission = artist.rate > 0;
    let serviceRevenue = 0;
    let productRevenue = 0;
    let serviceIncentive = 0;
    let productIncentive = 0;
    for (const booking of rows) {
      const productRetail = Math.min(productRetailFromNames(booking.serviceNames), booking.amount);
      const serviceAmount = Math.max(0, booking.amount - productRetail);
      serviceRevenue += serviceAmount;
      productRevenue += productRetail;
      if (hasCommission) {
        serviceIncentive += floorWon((serviceAmount * artist.rate) / 100);
        productIncentive += floorWon((productRetail * PRODUCT_DESIGNER_RATE) / 100);
      }
    }
    const incentive = hasCommission ? serviceIncentive + productIncentive : null;
    const tax = incentive == null ? { incomeTax: null, localIncomeTax: null, withholding: null } : withholding(incentive);
    const netPay = incentive == null || tax.withholding == null ? null : incentive - tax.withholding;
    rows.sort((a, b) => a.bookingDate.localeCompare(b.bookingDate) || a.paidAt.localeCompare(b.paidAt));
    return {
      artistId: artist.id,
      artistName: artist.name,
      employmentType: "freelance",
      employmentLabel: "프리랜서",
      isFreelance: true,
      revenue,
      serviceRevenue,
      productRevenue,
      count,
      commissionRate: artist.rate,
      hasCommission,
      serviceIncentive: hasCommission ? serviceIncentive : null,
      productIncentive: hasCommission ? productIncentive : null,
      incentive,
      incomeTax: tax.incomeTax,
      localIncomeTax: tax.localIncomeTax,
      withholding: tax.withholding,
      netPay,
      bankName: artist.bank[0],
      bankAccount: artist.bank[1],
      bankHolder: artist.bank[2],
      bankDisplay: `${artist.bank[0]} ${artist.bank[1]} (${artist.bank[2]})`,
      bookings: rows,
      status: "집계 중",
      paidAt: null
    };
  });
  const summary = {
    totalRevenue: artists.reduce((sum, row) => sum + row.revenue, 0),
    totalIncentive: artists.reduce((sum, row) => sum + (row.incentive ?? 0), 0),
    totalWithholding: artists.reduce((sum, row) => sum + (row.withholding ?? 0), 0),
    totalNetPay: artists.reduce((sum, row) => sum + (row.netPay ?? 0), 0)
  };
  return { year, month, from, to, summary, artists };
}

const MONTHLY_EXPENSES = (year, month, material) => {
  const d = (day) => ymd(year, month, Math.min(day, daysInMonth(year, month)));
  return [
    { expense_date: d(1), category: "occupancy", amount: 3500000, vendor: "금호빌딩", memo: "월세", has_tax_invoice: true, is_recurring: true, payment_method: "transfer", proof_type: "tax_invoice" },
    { expense_date: d(1), category: "occupancy", amount: 280000, vendor: "금호빌딩", memo: "건물 관리비", has_tax_invoice: true, is_recurring: true, payment_method: "transfer", proof_type: "tax_invoice" },
    { expense_date: d(5), category: "rental", amount: 55000, vendor: "코웨이", memo: "정수기", has_tax_invoice: true, is_recurring: true, payment_method: "transfer", proof_type: "tax_invoice" },
    { expense_date: d(5), category: "supplies", amount: 79000, vendor: "헤어업", memo: "AI예약관리,CRM,매장관리 프로그램 운영비", has_tax_invoice: true, is_recurring: true, payment_method: "card", proof_type: "tax_invoice" },
    { expense_date: d(7), category: "marketing", amount: 300000, vendor: "광고나라", memo: "인스타,네이버 전체관리", has_tax_invoice: true, is_recurring: true, payment_method: "card", proof_type: "tax_invoice" },
    { expense_date: d(10), category: "occupancy", amount: 180000 + month * 3000, vendor: "한국전력", memo: "전기요금", has_tax_invoice: true, is_recurring: true, payment_method: "card", proof_type: "tax_invoice" },
    { expense_date: d(12), category: "occupancy", amount: 38000 + month * 2000, vendor: "서울도시가스", memo: "도시가스", has_tax_invoice: true, is_recurring: true, payment_method: "transfer", proof_type: "tax_invoice" },
    { expense_date: d(12), category: "supplies", amount: 88000, vendor: "KT", memo: "인터넷·매장전화", has_tax_invoice: true, is_recurring: true, payment_method: "card", proof_type: "tax_invoice" },
    { expense_date: d(15), category: "other", amount: 32000, vendor: "DB손해보험", memo: "영업배상·화재보험 월분", has_tax_invoice: true, is_recurring: true, payment_method: "transfer", proof_type: "tax_invoice" },
    { expense_date: d(16), category: "material", amount: material, vendor: "미용박사", memo: "염색약품·클리닉 약제", has_tax_invoice: true, is_recurring: true, payment_method: "card", proof_type: "tax_invoice" },
    { expense_date: d(18), category: "supplies", amount: 65000, vendor: "타월플러스", memo: "타월 세탁 외주", has_tax_invoice: true, is_recurring: true, payment_method: "card", proof_type: "tax_invoice" },
    { expense_date: d(20), category: "supplies", amount: 24000 + month * 1000, vendor: "카카오", memo: "알림톡 발송비", has_tax_invoice: true, is_recurring: true, payment_method: "card", proof_type: "tax_invoice" },
    { expense_date: d(21), category: "supplies", amount: 39000, vendor: "이디야커피", memo: "고객 음료·캡슐", has_tax_invoice: false, is_recurring: true, payment_method: "card", proof_type: "simple_receipt" },
    { expense_date: d(22), category: "other", amount: 35000, vendor: "그린환경", memo: "염색 의료폐기물 수거", has_tax_invoice: true, is_recurring: true, payment_method: "transfer", proof_type: "tax_invoice" }
  ];
};

const EXTRA_EXPENSES = [
  { expense_date: "2026-08-08", category: "other", amount: 120000, vendor: "미용공구닥터", memo: "드라이기·가위 수리", has_tax_invoice: true, is_recurring: false, payment_method: "card", proof_type: "tax_invoice" },
  { expense_date: "2026-08-19", category: "marketing", amount: 150000, vendor: "네이버", memo: "플레이스 검색광고 추가", has_tax_invoice: true, is_recurring: false, payment_method: "card", proof_type: "tax_invoice" },
  { expense_date: "2026-09-11", category: "other", amount: 180000, vendor: "코리아헤어쇼", memo: "디자이너 교육 세미나", has_tax_invoice: true, is_recurring: false, payment_method: "transfer", proof_type: "tax_invoice" },
  { expense_date: "2026-09-25", category: "supplies", amount: 74000, vendor: "다이소·쿠팡", memo: "청소용품·쓰레기봉투", has_tax_invoice: false, is_recurring: false, payment_method: "card", proof_type: "simple_receipt" },
  { expense_date: "2026-10-09", category: "supplies", amount: 42000, vendor: "패키징마트", memo: "제품 쇼핑백·포장재", has_tax_invoice: true, is_recurring: false, payment_method: "card", proof_type: "tax_invoice" }
];

async function chunkInsert(table, rows, size = 80) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    const inserted = await rest(`/rest/v1/${table}`, { method: "POST", body: JSON.stringify(slice) });
    out.push(...(Array.isArray(inserted) ? inserted : [inserted]));
  }
  return out;
}

async function main() {
  const existing = await rest(
    "/rest/v1/bookings?select=id,booking_date,booking_time,artist_id,artist_name,customer_name,customer_phone,status,service_ids,service_names,final_amount,payment_method,paid_at&order=booking_date"
  );
  const oct16 = existing.filter((row) => row.booking_date === "2026-10-16");
  if (oct16.length === 0) throw new Error("10/16 예시 예약이 없습니다.");

  const phoneFixes = [
    { name: "손예진", phone: "01055566777" },
    { name: "지드레곤", phone: "01055557777" },
    { name: "김민종", phone: "01055556661" }
  ];
  for (const fix of phoneFixes) {
    const row = oct16.find((item) => item.customer_name === fix.name);
    if (row && row.customer_phone !== fix.phone) {
      await rest(`/rest/v1/bookings?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ customer_phone: fix.phone })
      });
      row.customer_phone = fix.phone;
    }
  }

  const productAdds = [
    { name: "하정우", product: PRODUCTS[0] },
    { name: "한고은", product: PRODUCTS[2] },
    { name: "전지현", product: PRODUCTS[4] }
  ];
  for (const add of productAdds) {
    const row = oct16.find((item) => item.customer_name === add.name);
    if (!row) continue;
    if ((row.service_ids || []).includes(add.product.id)) continue;
    const service_ids = [...(row.service_ids || []), add.product.id];
    const service_names = [...(row.service_names || []), `[제품] ${add.product.name}`];
    const final_amount = Number(row.final_amount || 0) + add.product.price;
    await rest(`/rest/v1/bookings?id=eq.${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({ service_ids, service_names, final_amount, total_amount: final_amount })
    });
    row.service_ids = service_ids;
    row.service_names = service_names;
    row.final_amount = final_amount;
  }

  for (const row of oct16) {
    occupy(row.booking_date, row.artist_id, row.booking_time, 90);
  }

  const customers = [...celebrityRoster(), ...extraRoster()];
  const byPhone = new Map(customers.map((row) => [row.phone, row]));
  const returning = customers.filter((row) => !row.newbie);
  const newcomers = customers.filter((row) => row.newbie);

  const generated = [];
  const notes = customers.map((row) => ({ customer_phone: row.phone, memo: row.note }));

  for (const date of openDates()) {
    if (date === "2026-10-16") continue;
    const day = dow(date);
    const month = Number(date.slice(5, 7));
    let want = targetCount(date);
    if (date === "2026-10-17") want = 12;
    const artistsToday = ARTISTS.filter((artist) => artist.off !== day);
    let placed = 0;
    let guard = 0;
    while (placed < want && guard < 400) {
      guard += 1;
      const artist = pick(artistsToday);
      const slots = slotList().sort(() => rng() - 0.5);
      let customer;
      if (date < "2026-10-01") {
        customer = pick(returning);
      } else if (rng() < 0.3) {
        customer = pick(newcomers);
      } else {
        customer = pick(returning);
      }
      const combo = comboMeta(pick(combosFor(customer.gender)));
      const product = maybeProduct(combo.price);
      const duration = combo.duration;
      const start = slots.find((time) => fits(date, artist.id, time, duration));
      if (!start) continue;
      if (customer.artist && rng() < 0.65) {
        const preferred = artistsToday.find((row) => row.id === customer.artist);
        if (preferred && preferred.id !== artist.id) {
          const altStart = slots.find((time) => fits(date, preferred.id, time, duration));
          if (altStart) {
            occupy(date, preferred.id, altStart, duration);
            let status = "completed";
            if (date < "2026-10-17") {
              const roll = rng();
              if (roll < 0.04) status = "cancelled";
              else if (roll < 0.06) status = "noshow";
            } else if (date === "2026-10-17") {
              status = toMin(altStart) < 13 * 60 ? "completed" : rng() < 0.7 ? "confirmed" : "pending";
            } else {
              status = rng() < 0.7 ? "confirmed" : "pending";
            }
            generated.push(
              makeBooking({ customer, date, time: altStart, artist: preferred, combo, product, status })
            );
            placed += 1;
            continue;
          }
        }
      }

      occupy(date, artist.id, start, duration);
      let status = "completed";
      if (date < "2026-10-17") {
        const roll = rng();
        if (roll < 0.04) status = "cancelled";
        else if (roll < 0.06) status = "noshow";
      } else if (date === "2026-10-17") {
        status = toMin(start) < 13 * 60 ? "completed" : rng() < 0.7 ? "confirmed" : "pending";
      } else {
        status = rng() < 0.7 ? "confirmed" : "pending";
      }
      generated.push(makeBooking({ customer, date, time: start, artist, combo, product, status }));
      placed += 1;
    }
  }

  const priorForCelebs = returning.filter((row) => celebrityRoster().some((c) => c.phone === row.phone));
  for (const customer of priorForCelebs) {
    const visits = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < visits; i += 1) {
      const month = i === 0 ? 8 : rng() < 0.5 ? 8 : 9;
      const last = daysInMonth(2026, month);
      let tries = 0;
      while (tries < 20) {
        tries += 1;
        const date = ymd(2026, month, 1 + Math.floor(rng() * last));
        if (dow(date) === 1) continue;
        const artist = ARTISTS.find((row) => row.id === customer.artist) ?? pick(ARTISTS);
        if (artist.off === dow(date)) continue;
        const combo = comboMeta(pick(combosFor(customer.gender)));
        const start = slotList()
          .sort(() => rng() - 0.5)
          .find((time) => fits(date, artist.id, time, combo.duration));
        if (!start) continue;
        occupy(date, artist.id, start, combo.duration);
        generated.push(
          makeBooking({
            customer,
            date,
            time: start,
            artist,
            combo,
            product: maybeProduct(combo.price),
            status: "completed"
          })
        );
        break;
      }
    }
  }

  console.log(`insert bookings ${generated.length}`);
  const inserted = await chunkInsert("bookings", generated, 70);

  await rest("/rest/v1/customer_notes?customer_phone=eq.0100000000", { method: "DELETE" });
  await rest("/rest/v1/customer_notes?on_conflict=customer_phone", {
    method: "POST",
    headers: { ...HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(notes)
  });

  const existingExpenses = await rest("/rest/v1/expenses?select=id,vendor,memo,expense_date,amount");
  const expenseKey = (row) => `${row.expense_date}|${row.vendor}|${row.memo}|${row.amount}`;
  const have = new Set(existingExpenses.map(expenseKey));
  const expenseRows = [
    ...MONTHLY_EXPENSES(2026, 8, 490000),
    ...MONTHLY_EXPENSES(2026, 9, 528000),
    ...MONTHLY_EXPENSES(2026, 10, 557000),
    ...EXTRA_EXPENSES
  ].filter((row) => !have.has(expenseKey(row)));
  const skipOctDup = new Set(
    existingExpenses
      .filter((row) => String(row.expense_date).startsWith("2026-10"))
      .map((row) => `${row.vendor}|${row.memo}`)
  );
  const filtered = expenseRows.filter((row) => {
    if (!String(row.expense_date).startsWith("2026-10")) return true;
    return !skipOctDup.has(`${row.vendor}|${row.memo}`);
  });
  console.log(`insert expenses ${filtered.length}`);
  if (filtered.length) await chunkInsert("expenses", filtered, 40);

  const allBookings = [
    ...oct16,
    ...inserted.map((row) => ({
      id: row.id,
      artist_id: row.artist_id,
      booking_date: row.booking_date,
      paid_at: row.paid_at,
      customer_name: row.customer_name,
      service_names: row.service_names,
      payment_method: row.payment_method,
      final_amount: row.final_amount,
      status: row.status
    }))
  ];

  const admins = await rest("/rest/v1/admin_users?select=user_id,role");
  const ownerId = admins.find((row) => row.role === "owner")?.user_id ?? null;

  await rest("/rest/v1/settlement_payouts?year_month=in.(2026-08,2026-09)", { method: "DELETE" });
  await rest("/rest/v1/settlement_closes?year_month=in.(2026-08,2026-09)", { method: "DELETE" });

  for (const [year, month, paidArtists, closedAt] of [
    [2026, 8, ["seoa", "kai", "yumi"], "2026-09-03T10:00:00+09:00"],
    [2026, 9, ["seoa", "kai"], "2026-10-05T11:20:00+09:00"]
  ]) {
    const snap = snapshotMonth(year, month, allBookings);
    await rest("/rest/v1/settlement_closes", {
      method: "POST",
      body: JSON.stringify({
        year_month: `${year}-${pad(month)}`,
        closed_at: closedAt,
        closed_by: ownerId,
        notify_requested: false,
        snapshot: snap
      })
    });
    for (const artistId of paidArtists) {
      const artist = snap.artists.find((row) => row.artistId === artistId);
      if (!artist || artist.netPay == null || artist.netPay <= 0) continue;
      await rest("/rest/v1/settlement_payouts", {
        method: "POST",
        body: JSON.stringify({
          year_month: `${year}-${pad(month)}`,
          artist_id: artistId,
          paid_at: month === 8 ? "2026-09-05T15:00:00+09:00" : "2026-10-08T16:10:00+09:00",
          paid_by: ownerId
        })
      });
    }
    console.log(
      `${year}-${pad(month)} 정산`,
      `매출 ${snap.summary.totalRevenue.toLocaleString("ko-KR")}`,
      `실지급 ${snap.summary.totalNetPay.toLocaleString("ko-KR")}`,
      snap.artists.map((row) => `${row.artistName} ${row.netPay ?? 0}`).join(" / ")
    );
  }

  const completed = allBookings.filter((row) => row.status === "completed");
  const phones = new Set(completed.map((row) => row.customer_phone));
  const firstDates = new Map();
  for (const row of completed) {
    const prev = firstDates.get(row.customer_phone);
    if (!prev || row.booking_date < prev) firstDates.set(row.customer_phone, row.booking_date);
  }
  const octCompleted = completed.filter((row) => row.booking_date >= "2026-10-01" && row.booking_date <= "2026-10-17");
  const octNew = octCompleted.filter((row) => firstDates.get(row.customer_phone) === row.booking_date).length;
  console.log({
    inserted: inserted.length,
    uniqueCustomers: phones.size,
    octNewRatio: octCompleted.length ? Math.round((octNew / octCompleted.length) * 100) : 0
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
