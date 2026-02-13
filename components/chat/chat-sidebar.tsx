"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { MessageSquarePlus, Trash2, Pencil, MessageSquare, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";
import type { ChatRoom } from "@/hooks/use-chat-store";

interface ChatSidebarProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  onSelectRoom: (id: string) => void;
  onCreateRoom: () => void;
  onRenameRoom: (id: string, title: string) => void;
  onDeleteRoom: (id: string) => void;
}

function formatDate(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export function ChatSidebar({
  rooms,
  activeRoomId,
  onSelectRoom,
  onCreateRoom,
  onRenameRoom,
  onDeleteRoom,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChatRoom | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingId]);

  const startEditing = (room: ChatRoom) => {
    setEditingId(room.id);
    setEditValue(room.title);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRenameRoom(editingId, editValue);
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-64 shrink-0 flex-col border-r">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        <span className="text-sm font-semibold">채팅 목록</span>
        <Button variant="ghost" size="icon-xs" onClick={onCreateRoom}>
          <MessageSquarePlus className="size-4" />
          <span className="sr-only">새 대화</span>
        </Button>
      </div>

      {/* Room list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {rooms.length === 0 && (
            <p className="text-muted-foreground px-2 py-6 text-center text-xs">
              대화가 없습니다.
            </p>
          )}
          {rooms.map((room) => (
            <div
              key={room.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm cursor-pointer transition-colors",
                room.id === activeRoomId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              )}
              onClick={() => {
                if (editingId !== room.id) onSelectRoom(room.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEditing(room);
              }}
            >
              <MessageSquare className="text-muted-foreground size-4 shrink-0" />

              <div className="min-w-0 flex-1">
                {editingId === room.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={commitEdit}
                      className="bg-background w-full rounded px-1 py-0.5 text-sm font-medium outline-none ring-1 ring-ring"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <>
                    <p className="truncate font-medium">{room.title}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDate(room.updatedAt)}
                    </p>
                  </>
                )}
              </div>

              {editingId !== room.id && (
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(room);
                    }}
                  >
                    <Pencil className="size-3" />
                    <span className="sr-only">이름 변경</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(room);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">삭제</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>대화를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; 대화가 영구적으로 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) onDeleteRoom(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
