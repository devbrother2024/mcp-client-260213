"use client";

import Link from "next/link";
import {
  Globe,
  Terminal,
  Server,
  Settings,
  Plug,
  Unplug,
  Loader2,
} from "lucide-react";
import type {
  McpServerConfig,
  McpConnectionStatus,
} from "@/lib/types/mcp-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface McpStatusIndicatorProps {
  servers: McpServerConfig[];
  statuses: Record<string, McpConnectionStatus>;
  errors: Record<string, string | undefined>;
  loadingIds: Set<string>;
  onConnect: (config: McpServerConfig) => void;
  onDisconnect: (id: string) => void;
}

function statusDotClass(status: McpConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500";
    case "connecting":
      return "bg-amber-400 animate-pulse";
    case "error":
      return "bg-red-500";
    default:
      return "bg-muted-foreground/30";
  }
}

function statusLabel(status: McpConnectionStatus): string {
  switch (status) {
    case "connected":
      return "연결됨";
    case "connecting":
      return "연결 중...";
    case "error":
      return "오류";
    default:
      return "미연결";
  }
}

export function McpStatusIndicator({
  servers,
  statuses,
  errors,
  loadingIds,
  onConnect,
  onDisconnect,
}: McpStatusIndicatorProps) {
  const totalCount = servers.length;
  const connectedCount = servers.filter(
    (s) => statuses[s.id] === "connected"
  ).length;

  // 전체 상태 도트 색상
  const hasError = servers.some((s) => statuses[s.id] === "error");
  const hasConnecting = servers.some((s) => statuses[s.id] === "connecting");
  const headerDotClass = connectedCount > 0
    ? "bg-emerald-500"
    : hasError
      ? "bg-red-500"
      : hasConnecting
        ? "bg-amber-400 animate-pulse"
        : "bg-muted-foreground/30";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative gap-1.5">
          <Server className="size-4" />
          {totalCount > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {connectedCount}/{totalCount}
            </span>
          )}
          {totalCount > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 size-2 rounded-full",
                headerDotClass
              )}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-medium">MCP 서버</span>
          <Button variant="ghost" size="icon-xs" asChild>
            <Link href="/settings/mcp">
              <Settings className="size-3.5" />
              <span className="sr-only">서버 관리</span>
            </Link>
          </Button>
        </div>

        {/* 서버 목록 */}
        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
            <Terminal className="size-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              등록된 서버가 없습니다.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/mcp">서버 추가</Link>
            </Button>
          </div>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {servers.map((server) => {
              const status = statuses[server.id] ?? "disconnected";
              const error = errors[server.id];
              const isLoading = loadingIds.has(server.id);
              const isConnected = status === "connected";

              return (
                <li
                  key={server.id}
                  className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
                >
                  {/* 상태 도트 */}
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      statusDotClass(status)
                    )}
                  />

                  {/* 아이콘 */}
                  {server.transport === "streamable-http" ? (
                    <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
                  )}

                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm">{server.name}</span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 px-1 py-0 text-[10px]"
                      >
                        {server.transport === "streamable-http"
                          ? "HTTP"
                          : "stdio"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {error ? (
                        <span className="text-destructive">{error}</span>
                      ) : (
                        statusLabel(status)
                      )}
                    </p>
                  </div>

                  {/* 연결/해제 버튼 */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    disabled={isLoading || !server.enabled}
                    onClick={() =>
                      isConnected
                        ? onDisconnect(server.id)
                        : onConnect(server)
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : isConnected ? (
                      <Unplug className="size-3.5 text-muted-foreground" />
                    ) : (
                      <Plug className="size-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
