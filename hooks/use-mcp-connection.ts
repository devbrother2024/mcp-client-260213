"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  McpServerConfig,
  McpConnectionStatus,
  McpServerStatus,
  McpServerCapabilities,
} from "@/lib/types/mcp-server";

const POLL_INTERVAL = 3000;

export function useMcpConnection(servers: McpServerConfig[]) {
  const [statuses, setStatuses] = useState<Record<string, McpConnectionStatus>>(
    {}
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [capabilities, setCapabilities] = useState<
    Record<string, McpServerCapabilities>
  >({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(false);

  // 서버 ID 목록 (활성화된 서버만 폴링)
  const enabledIds = servers.filter((s) => s.enabled).map((s) => s.id);

  // capabilities가 이미 로드된 서버 ID 추적 (중복 fetch 방지)
  const capLoadedRef = useRef<Set<string>>(new Set());

  /** 상태 폴링 – connected 서버는 capabilities도 자동 조회 */
  const fetchStatuses = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      try {
        const res = await fetch(`/api/mcp/status?ids=${ids.join(",")}`);
        if (!res.ok) return;
        const data = (await res.json()) as { statuses: McpServerStatus[] };
        const nextStatuses: Record<string, McpConnectionStatus> = {};
        const nextErrors: Record<string, string | undefined> = {};
        const connectedIds: string[] = [];

        for (const s of data.statuses) {
          nextStatuses[s.id] = s.status;
          nextErrors[s.id] = s.error;
          if (s.status === "connected") {
            connectedIds.push(s.id);
          }
        }

        setStatuses((prev) => ({ ...prev, ...nextStatuses }));
        setErrors((prev) => ({ ...prev, ...nextErrors }));

        // connected 상태이면서 아직 capabilities가 없는 서버를 자동 조회
        for (const id of connectedIds) {
          if (capLoadedRef.current.has(id)) continue;
          capLoadedRef.current.add(id);

          fetch(`/api/mcp/capabilities?serverId=${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((cap) => {
              if (cap) {
                setCapabilities((p) => ({ ...p, [id]: cap }));
              }
            })
            .catch(() => {
              // 실패 시 다음 폴링에서 재시도 가능하도록 제거
              capLoadedRef.current.delete(id);
            });
        }
      } catch {
        // 네트워크 오류 무시
      }
    },
    []
  );

  // 마운트 즉시 + enabledIds 변경 시 상태 조회 및 폴링
  useEffect(() => {
    isMounted.current = true;

    // 즉시 조회 (enabledIds가 비어있어도 effect 등록은 필요)
    if (enabledIds.length > 0) {
      fetchStatuses(enabledIds);
    }

    pollRef.current = setInterval(() => {
      if (isMounted.current && enabledIds.length > 0) {
        fetchStatuses(enabledIds);
      }
    }, POLL_INTERVAL);

    return () => {
      isMounted.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // enabledIds를 직렬화해서 의존성 비교
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledIds.join(","), fetchStatuses]);

  /** 서버 연결 */
  const connectServer = useCallback(
    async (config: McpServerConfig) => {
      setLoadingIds((prev) => new Set(prev).add(config.id));
      setStatuses((prev) => ({ ...prev, [config.id]: "connecting" }));
      setErrors((prev) => ({ ...prev, [config.id]: undefined }));

      try {
        const res = await fetch("/api/mcp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        });
        const data = await res.json();

        setStatuses((prev) => ({ ...prev, [config.id]: data.status }));
        if (data.error) {
          setErrors((prev) => ({ ...prev, [config.id]: data.error }));
        }

        // 연결 성공 시 capabilities 자동 조회
        if (data.status === "connected") {
          await fetchCapabilities(config.id);
        }

        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "연결 요청 실패";
        setStatuses((prev) => ({ ...prev, [config.id]: "error" }));
        setErrors((prev) => ({ ...prev, [config.id]: message }));
        return { status: "error", error: message };
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(config.id);
          return next;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /** 서버 연결 해제 */
  const disconnectServer = useCallback(async (id: string) => {
    setLoadingIds((prev) => new Set(prev).add(id));

    try {
      await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: id }),
      });
      setStatuses((prev) => ({ ...prev, [id]: "disconnected" }));
      setErrors((prev) => ({ ...prev, [id]: undefined }));
      capLoadedRef.current.delete(id);
      setCapabilities((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      // 실패 무시
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  /** Capabilities 조회 */
  const fetchCapabilities = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/mcp/capabilities?serverId=${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as McpServerCapabilities;
      setCapabilities((prev) => ({ ...prev, [id]: data }));
    } catch {
      // 실패 무시
    }
  }, []);

  return {
    statuses,
    errors,
    capabilities,
    loadingIds,
    connectServer,
    disconnectServer,
    fetchCapabilities,
  };
}
