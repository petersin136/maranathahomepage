/** 마감 시각 — 예약은 start + duration <= 20:00 인 경우만 허용 */
export const CLOSING_TIME = "20:00";
export const CLOSING_MINUTES = 20 * 60;

/** duration 컬럼이 없을 때 시술 합에서 빼는 버퍼(시술당 분) */
export const PER_SERVICE_BUFFER_MINUTES = 10;

/** 취소만 제외 — PENDING 포함 나머지는 모두 자리 차지 */
export const BLOCKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "noshow"
] as const;

export type OccupiedInterval = {
  startMinutes: number;
  endMinutes: number;
};

export function parseTimeToMinutes(time: string): number {
  const trimmed = time.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return NaN;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/**
 * 구간 겹침 판정 (반개구간 [start, end)).
 * newStart < oldEnd && oldStart < newEnd
 */
export function intervalsOverlap(
  newStart: number,
  newEnd: number,
  oldStart: number,
  oldEnd: number
): boolean {
  return newStart < oldEnd && oldStart < newEnd;
}

/**
 * 예약 점유 시간(분).
 * - storedDuration 이 있으면 그대로 사용
 * - 없으면 시술 소요시간 합 − (시술개수 × 10분)
 */
export function resolveDurationMinutes(
  storedDuration: number | null | undefined,
  serviceDurationMinutes: number[]
): number {
  if (
    storedDuration != null &&
    Number.isFinite(storedDuration) &&
    storedDuration > 0
  ) {
    return Math.round(storedDuration);
  }
  const sum = serviceDurationMinutes.reduce(
    (acc, d) => acc + (Number.isFinite(d) ? Number(d) : 0),
    0
  );
  const count = serviceDurationMinutes.length;
  return Math.max(0, sum - count * PER_SERVICE_BUFFER_MINUTES);
}

export function toOccupiedInterval(
  startTime: string,
  durationMinutes: number
): OccupiedInterval | null {
  const startMinutes = parseTimeToMinutes(startTime);
  if (!Number.isFinite(startMinutes) || !Number.isFinite(durationMinutes)) {
    return null;
  }
  if (durationMinutes < 0) return null;
  return {
    startMinutes,
    endMinutes: startMinutes + durationMinutes
  };
}

export function overlapsAny(
  candidate: OccupiedInterval,
  occupied: OccupiedInterval[]
): boolean {
  return occupied.some((old) =>
    intervalsOverlap(
      candidate.startMinutes,
      candidate.endMinutes,
      old.startMinutes,
      old.endMinutes
    )
  );
}

/** start + duration <= 20:00 */
export function endsOnOrBeforeClosing(interval: OccupiedInterval): boolean {
  return interval.endMinutes <= CLOSING_MINUTES;
}

/**
 * 후보 시작 시각이 예약 가능한지.
 * check_available_times / create_booking 공통.
 */
export function isStartTimeAvailable(
  startTime: string,
  durationMinutes: number,
  occupied: OccupiedInterval[]
): boolean {
  const candidate = toOccupiedInterval(startTime, durationMinutes);
  if (!candidate) return false;
  if (!endsOnOrBeforeClosing(candidate)) return false;
  return !overlapsAny(candidate, occupied);
}

export function filterAvailableTimes(
  candidateTimes: readonly string[],
  durationMinutes: number,
  occupied: OccupiedInterval[]
): string[] {
  return candidateTimes.filter((t) =>
    isStartTimeAvailable(t, durationMinutes, occupied)
  );
}
