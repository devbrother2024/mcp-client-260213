"use client";

import { Plus, Trash2, Globe, Terminal } from "lucide-react";
import type { McpServerConfig, McpConnectionStatus } from "@/lib/types/mcp-server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface McpServerListProps {
  servers: McpServerConfig[];
  selectedId: string | null;
  statuses?: Record<string, McpConnectionStatus>;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

function statusDotClass(status?: McpConnectionStatus): string {
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

export function McpServerList({
  servers,
  selectedId,
  statuses,
  onSelect,
  onAdd,
  onDelete,
  onToggle,
}: McpServerListProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          MCP 서버 목록
        </h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          추가
        </Button>
      </div>

      {servers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <Terminal className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            등록된 MCP 서버가 없습니다.
          </p>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="size-4" />
            서버 추가
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {servers.map((server) => (
            <Card
              key={server.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-accent/50",
                selectedId === server.id && "border-primary bg-accent/30"
              )}
              onClick={() => onSelect(server.id)}
            >
              {/* 상태 도트 + 아이콘 */}
              <div className="flex shrink-0 items-center gap-1.5">
                {statuses && (
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      statusDotClass(statuses[server.id])
                    )}
                  />
                )}
                {server.transport === "streamable-http" ? (
                  <Globe className="size-4 text-muted-foreground" />
                ) : (
                  <Terminal className="size-4 text-muted-foreground" />
                )}
              </div>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {server.name}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {server.transport === "streamable-http" ? "HTTP" : "stdio"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {server.transport === "streamable-http"
                    ? server.url || "URL 미설정"
                    : server.command || "명령어 미설정"}
                </p>
              </div>

              {/* 토글 & 삭제 */}
              <div className="flex shrink-0 items-center gap-1">
                <Switch
                  checked={server.enabled}
                  onCheckedChange={() => onToggle(server.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(server.id);
                  }}
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>서버를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 MCP 서버 설정이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
