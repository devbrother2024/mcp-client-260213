"use client";

import { useState, useCallback } from "react";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { useMcpConnection } from "@/hooks/use-mcp-connection";
import { McpServerList } from "@/components/settings/mcp-server-list";
import { McpServerForm } from "@/components/settings/mcp-server-form";
import { McpCapabilitiesView } from "@/components/settings/mcp-capabilities-view";
import type { McpServerFormData } from "@/lib/types/mcp-server";
import { Server, Plug, Unplug, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function McpSettingsPage() {
  const { servers, addServer, updateServer, deleteServer, toggleServer } =
    useMcpServers();

  const {
    statuses,
    errors,
    capabilities,
    loadingIds,
    connectServer,
    disconnectServer,
    fetchCapabilities,
  } = useMcpConnection(servers);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const selectedServer = servers.find((s) => s.id === selectedId) ?? null;
  const selectedStatus = selectedId ? statuses[selectedId] : undefined;
  const selectedError = selectedId ? errors[selectedId] : undefined;
  const selectedCapabilities = selectedId ? capabilities[selectedId] : undefined;
  const selectedLoading = selectedId ? loadingIds.has(selectedId) : false;

  const handleAdd = useCallback(() => {
    setSelectedId(null);
    setIsAdding(true);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setIsAdding(false);
    setSelectedId(id);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      disconnectServer(id);
      deleteServer(id);
      if (selectedId === id) {
        setSelectedId(null);
        setIsAdding(false);
      }
    },
    [deleteServer, disconnectServer, selectedId]
  );

  const handleSave = useCallback(
    (data: McpServerFormData): string | null => {
      if (isAdding) {
        const error = addServer(data);
        if (!error) setIsAdding(false);
        return error;
      }
      if (selectedId) {
        return updateServer(selectedId, data);
      }
      return null;
    },
    [isAdding, selectedId, addServer, updateServer]
  );

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setSelectedId(null);
  }, []);

  const handleConnect = useCallback(async () => {
    if (!selectedServer) return;
    await connectServer(selectedServer);
  }, [selectedServer, connectServer]);

  const handleDisconnect = useCallback(async () => {
    if (!selectedId) return;
    await disconnectServer(selectedId);
  }, [selectedId, disconnectServer]);

  const handleRefreshCapabilities = useCallback(async () => {
    if (!selectedId) return;
    await fetchCapabilities(selectedId);
  }, [selectedId, fetchCapabilities]);

  const showForm = isAdding || selectedId;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* 페이지 타이틀 */}
      <div className="mb-6 flex items-center gap-2">
        <Server className="size-5" />
        <h2 className="text-xl font-semibold">MCP 서버 관리</h2>
      </div>

      {/* 2컬럼 레이아웃 (모바일: 스택) */}
      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        {/* 좌: 서버 목록 */}
        <McpServerList
          servers={servers}
          selectedId={selectedId}
          statuses={statuses}
          onSelect={handleSelect}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onToggle={toggleServer}
        />

        {/* 우: 폼 + 연결 + Capabilities */}
        {showForm ? (
          <div className="flex flex-col gap-4">
            <McpServerForm
              server={isAdding ? null : selectedServer}
              onSave={handleSave}
              onCancel={handleCancel}
            />

            {/* 연결 제어 (편집 모드에서만) */}
            {!isAdding && selectedServer && (
              <div className="flex flex-col gap-3">
                {/* 연결 상태 + 버튼 */}
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">연결 상태</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusDot status={selectedStatus} />
                      <span className="text-xs text-muted-foreground">
                        {statusText(selectedStatus)}
                      </span>
                      {selectedError && (
                        <Badge variant="destructive" className="text-[10px]">
                          {selectedError}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {selectedStatus === "connected" ? (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshCapabilities}
                      >
                        <RefreshCw className="size-3.5" />
                        새로고침
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={selectedLoading}
                        onClick={handleDisconnect}
                      >
                        {selectedLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Unplug className="size-3.5" />
                        )}
                        연결 해제
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      disabled={selectedLoading}
                      onClick={handleConnect}
                    >
                      {selectedLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plug className="size-3.5" />
                      )}
                      연결 테스트
                    </Button>
                  )}
                </div>

                {/* Capabilities 표시 */}
                {selectedCapabilities && (
                  <McpCapabilitiesView capabilities={selectedCapabilities} />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">
              서버를 선택하거나 새로 추가하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status?: string }) {
  const cls =
    status === "connected"
      ? "bg-emerald-500"
      : status === "connecting"
        ? "bg-amber-400 animate-pulse"
        : status === "error"
          ? "bg-red-500"
          : "bg-muted-foreground/30";

  return <span className={`inline-block size-2 rounded-full ${cls}`} />;
}

function statusText(status?: string): string {
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
