import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BLOCKING_STATUSES,
  resolveDurationMinutes,
  toOccupiedInterval,
  type OccupiedInterval
} from "@/lib/booking/overlap";

type BookingOccupancyRow = {
  booking_time: string;
  service_ids: string[] | null;
  duration?: number | null;
  duration_minutes?: number | null;
};

/**
 * 같은 디자이너·같은 날짜의 점유 구간 로드.
 * status = cancelled 만 제외 (pending 포함).
 */
export async function loadOccupiedIntervals(opts: {
  supabase: SupabaseClient;
  artistId: string;
  bookingDate: string;
}): Promise<{ intervals: OccupiedInterval[]; error: string | null }> {
  const { supabase, artistId, bookingDate } = opts;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("booking_time, service_ids")
    .eq("artist_id", artistId)
    .eq("booking_date", bookingDate)
    .in("status", [...BLOCKING_STATUSES]);

  if (bookingsError) {
    return { intervals: [], error: bookingsError.message };
  }

  const rows = (bookings ?? []) as BookingOccupancyRow[];
  const allServiceIds = Array.from(
    new Set(
      rows.flatMap((b) =>
        Array.isArray(b.service_ids) ? b.service_ids.map(String) : []
      )
    )
  );

  const durationByServiceId = new Map<string, number>();
  if (allServiceIds.length > 0) {
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, duration_minutes")
      .in("id", allServiceIds);

    if (servicesError) {
      return { intervals: [], error: servicesError.message };
    }

    for (const s of services ?? []) {
      durationByServiceId.set(
        String(s.id),
        Number(s.duration_minutes) || 0
      );
    }
  }

  const intervals: OccupiedInterval[] = [];
  for (const row of rows) {
    const serviceIds = Array.isArray(row.service_ids)
      ? row.service_ids.map(String)
      : [];
    const serviceDurations = serviceIds.map(
      (id) => durationByServiceId.get(id) ?? 0
    );
    const stored =
      row.duration_minutes ?? row.duration ?? null;
    const durationMinutes = resolveDurationMinutes(stored, serviceDurations);
    const interval = toOccupiedInterval(row.booking_time, durationMinutes);
    if (interval) intervals.push(interval);
  }

  return { intervals, error: null };
}

export async function resolveServiceDurations(
  supabase: SupabaseClient,
  serviceIds: string[]
): Promise<{ durations: number[]; error: string | null }> {
  if (serviceIds.length === 0) {
    return { durations: [], error: null };
  }

  const { data, error } = await supabase
    .from("services")
    .select("id, duration_minutes")
    .in("id", serviceIds);

  if (error) {
    return { durations: [], error: error.message };
  }

  const byId = new Map(
    (data ?? []).map((s) => [String(s.id), Number(s.duration_minutes) || 0])
  );
  return {
    durations: serviceIds.map((id) => byId.get(id) ?? 0),
    error: null
  };
}
