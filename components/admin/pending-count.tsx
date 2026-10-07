"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type PendingCountValue = {
  count: number | null;
  refresh: () => void;
};

const PendingCountContext = createContext<PendingCountValue>({
  count: null,
  refresh: () => undefined
});

export function PendingCountProvider({
  initialCount,
  children
}: {
  initialCount: number | null;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const refresh = useCallback(() => {
    fetch("/api/admin/bookings?status=pending&count=1")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && typeof data.count === "number") setCount(data.count);
      })
      .catch(() => undefined);
  }, []);

  return (
    <PendingCountContext.Provider value={{ count, refresh }}>
      {children}
    </PendingCountContext.Provider>
  );
}

export function usePendingCount() {
  return useContext(PendingCountContext).count;
}

export function useRefreshPendingCount() {
  return useContext(PendingCountContext).refresh;
}
