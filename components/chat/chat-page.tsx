"use client";

import { useState, useCallback, useMemo } from "react";
import { useChatStore } from "@/hooks/use-chat-store";
import { useMcpServers } from "@/hooks/use-mcp-servers";
import { useMcpConnection } from "@/hooks/use-mcp-connection";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";

export function ChatPage() {
  const {
    rooms,
    activeRoomId,
    activeMessages,
    isLoading,
    createRoom,
    selectRoom,
    renameRoom,
    deleteRoom,
    sendMessage,
    clearMessages,
    approveToolCall,
    rejectToolCall,
  } = useChatStore();

  const { servers: mcpServers } = useMcpServers();

  const {
    statuses: mcpStatuses,
    errors: mcpErrors,
    loadingIds: mcpLoadingIds,
    connectServer: mcpConnect,
    disconnectServer: mcpDisconnect,
  } = useMcpConnection(mcpServers);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // connected 상태인 MCP 서버 ID 목록
  const connectedServerIds = useMemo(
    () =>
      mcpServers
        .filter((s) => s.enabled && mcpStatuses[s.id] === "connected")
        .map((s) => s.id),
    [mcpServers, mcpStatuses]
  );

  // sendMessage에 connectedServerIds를 자동 전달
  const handleSendMessage = useCallback(
    (content: string) => {
      sendMessage(content, connectedServerIds);
    },
    [sendMessage, connectedServerIds]
  );

  // tool call 승인 — roomId + mcpServerIds 자동 전달
  const handleApproveToolCall = useCallback(
    (messageId: string, toolCallId: string) => {
      if (!activeRoomId) return;
      approveToolCall(activeRoomId, messageId, toolCallId, connectedServerIds);
    },
    [activeRoomId, approveToolCall, connectedServerIds]
  );

  // tool call 거부
  const handleRejectToolCall = useCallback(
    (messageId: string, toolCallId: string) => {
      if (!activeRoomId) return;
      rejectToolCall(activeRoomId, messageId, toolCallId);
    },
    [activeRoomId, rejectToolCall]
  );

  return (
    <div className="flex h-dvh">
      {/* Sidebar */}
      {sidebarOpen && (
        <ChatSidebar
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={selectRoom}
          onCreateRoom={createRoom}
          onRenameRoom={renameRoom}
          onDeleteRoom={deleteRoom}
        />
      )}

      {/* Main chat area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatHeader
          onClear={clearMessages}
          onNewChat={createRoom}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
          hasMessages={activeMessages.length > 0}
          mcpServers={mcpServers}
          mcpStatuses={mcpStatuses}
          mcpErrors={mcpErrors}
          mcpLoadingIds={mcpLoadingIds}
          onMcpConnect={mcpConnect}
          onMcpDisconnect={mcpDisconnect}
        />
        <ChatMessages
          messages={activeMessages}
          isLoading={isLoading}
          onApproveToolCall={handleApproveToolCall}
          onRejectToolCall={handleRejectToolCall}
        />
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
