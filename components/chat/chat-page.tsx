"use client";

import { useState } from "react";
import { useChatStore } from "@/hooks/use-chat-store";
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
  } = useChatStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        />
        <ChatMessages messages={activeMessages} isLoading={isLoading} />
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
