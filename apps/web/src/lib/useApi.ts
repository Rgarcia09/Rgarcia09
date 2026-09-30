"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Loads `path` (skips when null). Re-fetches when the path changes or `reload()` is called. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const key = path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    api<T>(path)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setSettledKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading: key !== null && settledKey !== key, reload, setData };
}
