"use client";

import { useCallback, useState } from "react";
import type { BookingRow, BookingStatus } from "@/lib/bookings/types";

export type BookingActionTarget = {
  id: string;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  artist_name: string | null;
  status: string;
};

export type BookingAction = "cancel" | "delete";

export type BookingActionSuccess = {
  action: BookingAction | "status";
  booking: BookingRow | null;
};

type Options = {
  onSuccess?: (result: BookingActionSuccess) => void | Promise<void>;
};

async function parseJson(res: Response) {
  return res.json().catch(() => ({}));
}

export function useBookingActions(options: Options = {}) {
  const { onSuccess } = options;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    action: BookingAction;
    booking: BookingActionTarget;
  } | null>(null);

  const openCancel = useCallback((booking: BookingActionTarget) => {
    setConfirm({ action: "cancel", booking });
  }, []);

  const openDelete = useCallback((booking: BookingActionTarget) => {
    setConfirm({ action: "delete", booking });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirm((current) => (busyId ? current : null));
  }, [busyId]);

  const requestStatus = useCallback(
    async (id: string, status: BookingStatus, cancelReason?: "admin_cancel") => {
      const body: Record<string, unknown> = { status };
      if (status === "cancelled") body.cancel_reason = cancelReason ?? "admin_cancel";
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await parseJson(res);
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "상태 변경에 실패했습니다.");
      }
      return data.booking as BookingRow;
    },
    []
  );

  const updateStatus = useCallback(
    async (booking: BookingActionTarget, status: BookingStatus) => {
      if (status === booking.status) return;
      if (status === "cancelled") {
        openCancel(booking);
        return;
      }
      if (busyId) return;
      setBusyId(booking.id);
      setError(null);
      try {
        const next = await requestStatus(booking.id, status);
        await onSuccess?.({ action: "status", booking: next });
      } catch (e) {
        console.error("[booking] status", e);
        const message = e instanceof Error ? e.message : "상태 변경에 실패했습니다.";
        setError(message);
      } finally {
        setBusyId(null);
      }
    },
    [busyId, onSuccess, openCancel, requestStatus]
  );

  const runConfirm = useCallback(async () => {
    if (!confirm || busyId) return;
    const { action, booking } = confirm;
    setBusyId(booking.id);
    setError(null);
    try {
      if (action === "cancel") {
        const next = await requestStatus(booking.id, "cancelled", "admin_cancel");
        setConfirm(null);
        await onSuccess?.({ action: "cancel", booking: next });
      } else {
        const res = await fetch(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });
        const data = await parseJson(res);
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "삭제에 실패했습니다.");
        }
        setConfirm(null);
        await onSuccess?.({ action: "delete", booking: null });
      }
    } catch (e) {
      console.error(`[booking] ${action}`, e);
      setError(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }, [busyId, confirm, onSuccess, requestStatus]);

  return {
    busyId,
    error,
    setError,
    confirm,
    openCancel,
    openDelete,
    closeConfirm,
    runConfirm,
    updateStatus
  };
}
