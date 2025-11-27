// src/hooks/usePageDetail.ts
import { useEffect, useState, useCallback } from "react";
import { useApiKey, getBackendUrl } from "./useApiKey";

export function usePageDetail(pageId?: string) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const backendUrl = getBackendUrl();
  const { apiKey } = useApiKey("Mobile app");

  const reload = useCallback(async () => {
    console.log("usePageDetail reload", { pageId, backendUrl, hasApiKey: !!apiKey });

    if (!pageId || !backendUrl || !apiKey) {
      setLoading(false);
      setPage(null);
      setError(new Error("Missing pageId/backendUrl/apiKey"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${backendUrl}/api/me/pages/${encodeURIComponent(pageId)}`;
      console.log("usePageDetail fetching", url);

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
      });

      const text = await res.text();
      console.log("usePageDetail raw response", res.status, text.slice(0, 200));

      if (!res.ok) {
        setError(new Error(`HTTP ${res.status}`));
        setPage(null);
      } else {
        const json = JSON.parse(text);
        setPage(json);
      }
    } catch (err: any) {
      console.error("usePageDetail network error", err);
      setError(err);
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [pageId, backendUrl, apiKey]);

  // auto-load whenever pageId / backendUrl / apiKey changes
  useEffect(() => {
    void reload();
  }, [reload]);

  // 👇 helper to patch the page locally
  const updatePage = useCallback(
    (patch: Partial<any>) => {
      setPage((prev: any) =>
        prev ? { ...prev, ...patch } : prev
      );
    },
    []
  );

  return { loading, page, apiKey, error, reload, updatePage };
}
