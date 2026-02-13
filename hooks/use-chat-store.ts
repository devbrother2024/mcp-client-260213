"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Message, ToolCall } from "@/hooks/use-chat";
import { parseSSEStream } from "@/lib/sse-parser";
import {
  fetchRooms,
  createRoomInDB,
  updateRoomInDB,
  deleteRoomInDB,
  fetchMessages,
  insertMessageInDB,
  updateToolCallInDB,
  clearMessagesInDB,
} from "@/lib/db/chat";

export interface ChatRoom {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 첫 유저 메시지로 채팅방 제목 생성 (최대 30자) */
function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "새 대화";
  const text = first.content.trim();
  return text.length > 30 ? text.slice(0, 30) + "..." : text;
}

// ─── SSE 스트림 → 메시지 업데이트 헬퍼 ───

interface StreamResult {
  text: string;
  toolCalls: ToolCall[];
}

async function consumeSSEStream(
  body: ReadableStream<Uint8Array>,
  onText: (accumulated: string) => void
): Promise<StreamResult> {
  let accumulated = "";
  const toolCalls: ToolCall[] = [];

  for await (const ev of parseSSEStream(body)) {
    switch (ev.event) {
      case "text": {
        const { chunk } = ev.data as { chunk: string };
        accumulated += chunk;
        onText(accumulated);
        break;
      }
      case "tool_call": {
        const tc = ev.data as {
          id: string;
          serverId: string;
          serverName: string;
          name: string;
          args: Record<string, unknown>;
          _functionName?: string;
        };
        toolCalls.push({
          id: tc.id,
          serverId: tc.serverId,
          serverName: tc.serverName,
          name: tc.name,
          args: tc.args,
          status: "pending",
          _functionName: tc._functionName,
        });
        break;
      }
      case "error": {
        const { message } = ev.data as { message: string };
        throw new Error(message);
      }
      case "done":
        break;
    }
  }

  return { text: accumulated, toolCalls };
}

// ─── Hook ───

export function useChatStore() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<
    Record<string, Message[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(false);

  // ─── Supabase에서 초기 데이터 로드 ───

  useEffect(() => {
    async function loadFromDB() {
      try {
        const dbRooms = await fetchRooms();
        setRooms(dbRooms);

        // 모든 방의 메시지를 병렬로 로드
        const entries = await Promise.all(
          dbRooms.map(async (room) => {
            const msgs = await fetchMessages(room.id);
            return [room.id, msgs] as [string, Message[]];
          })
        );
        setMessagesByRoom(Object.fromEntries(entries));

        // 가장 최근 방을 활성화
        if (dbRooms.length > 0) {
          setActiveRoomId(dbRooms[0].id);
        }
      } catch (err) {
        console.error("Failed to load from Supabase:", err);
      }
      isMounted.current = true;
    }
    loadFromDB();
  }, []);

  const activeMessages = activeRoomId
    ? messagesByRoom[activeRoomId] ?? []
    : [];

  // ─── Room management ───

  const createRoom = useCallback(() => {
    const id = generateId();
    const now = new Date();
    const room: ChatRoom = {
      id,
      title: "새 대화",
      createdAt: now,
      updatedAt: now,
    };
    setRooms((prev) => [room, ...prev]);
    setMessagesByRoom((prev) => ({ ...prev, [id]: [] }));
    setActiveRoomId(id);

    // DB 저장 (fire-and-forget)
    createRoomInDB(room).catch((err) =>
      console.error("Failed to create room in DB:", err)
    );

    return id;
  }, []);

  const selectRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
  }, []);

  const renameRoom = useCallback((roomId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = new Date();
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, title: trimmed, updatedAt: now } : r
      )
    );

    updateRoomInDB(roomId, {
      title: trimmed,
      updated_at: now.toISOString(),
    }).catch((err) => console.error("Failed to rename room in DB:", err));
  }, []);

  const deleteRoom = useCallback(
    (roomId: string) => {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setMessagesByRoom((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
      if (activeRoomId === roomId) {
        setActiveRoomId(() => {
          const remaining = rooms.filter((r) => r.id !== roomId);
          return remaining.length > 0 ? remaining[0].id : null;
        });
      }

      deleteRoomInDB(roomId).catch((err) =>
        console.error("Failed to delete room in DB:", err)
      );
    },
    [activeRoomId, rooms]
  );

  // ─── 메시지 업데이트 헬퍼 ───

  const updateMessage = useCallback(
    (roomId: string, msgId: string, updater: (msg: Message) => Message) => {
      setMessagesByRoom((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] ?? []).map((msg) =>
          msg.id === msgId ? updater(msg) : msg
        ),
      }));
    },
    []
  );

  // ─── Messaging ───

  const sendMessage = useCallback(
    async (content: string, mcpServerIds?: string[]) => {
      if (!content.trim() || isLoading) return;

      // Auto-create room if none active
      let roomId = activeRoomId;
      if (!roomId) {
        const id = generateId();
        const now = new Date();
        const room: ChatRoom = {
          id,
          title: "새 대화",
          createdAt: now,
          updatedAt: now,
        };
        setRooms((prev) => [room, ...prev]);
        setMessagesByRoom((prev) => ({ ...prev, [id]: [] }));
        setActiveRoomId(id);
        roomId = id;

        createRoomInDB(room).catch((err) =>
          console.error("Failed to create room in DB:", err)
        );
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      const currentMessages = messagesByRoom[roomId] ?? [];
      const newMessages = [...currentMessages, userMessage];

      setMessagesByRoom((prev) => ({ ...prev, [roomId]: newMessages }));

      // Update room title from first user message
      const newTitle = deriveTitle(newMessages);
      const now = new Date();
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? { ...r, title: newTitle, updatedAt: now }
            : r
        )
      );

      // DB에 유저 메시지 저장 + 방 제목 업데이트
      insertMessageInDB(roomId, userMessage).catch((err) =>
        console.error("Failed to insert user message:", err)
      );
      updateRoomInDB(roomId, {
        title: newTitle,
        updated_at: now.toISOString(),
      }).catch((err) =>
        console.error("Failed to update room title:", err)
      );

      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            mcpServerIds: mcpServerIds ?? [],
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to send message");
        }

        const assistantId = generateId();
        const assistantMessage: Message = {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };

        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: [...(prev[roomId] ?? []), assistantMessage],
        }));

        // SSE 스트림 소비
        const result = await consumeSSEStream(response.body, (text) => {
          updateMessage(roomId, assistantId, (msg) => ({
            ...msg,
            content: text,
          }));
        });

        // 최종 assistant 메시지 확정
        const finalAssistant: Message = {
          ...assistantMessage,
          content: result.text,
          toolCalls:
            result.toolCalls.length > 0 ? result.toolCalls : undefined,
        };

        // tool calls가 있으면 assistant 메시지에 추가
        if (result.toolCalls.length > 0) {
          updateMessage(roomId, assistantId, (msg) => ({
            ...msg,
            content: result.text,
            toolCalls: result.toolCalls,
          }));
        }

        // DB에 assistant 메시지 저장 (tool_calls 포함)
        insertMessageInDB(roomId, finalAssistant).catch((err) =>
          console.error("Failed to insert assistant message:", err)
        );

        // Update room updatedAt
        const updatedAt = new Date();
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, updatedAt } : r
          )
        );
        updateRoomInDB(roomId, {
          updated_at: updatedAt.toISOString(),
        }).catch((err) =>
          console.error("Failed to update room updatedAt:", err)
        );
      } catch (error) {
        console.error("Error sending message:", error);
        const errMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.",
          timestamp: new Date(),
        };
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: [...(prev[roomId] ?? []), errMessage],
        }));
        insertMessageInDB(roomId, errMessage).catch((err) =>
          console.error("Failed to insert error message:", err)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeRoomId, messagesByRoom, isLoading, updateMessage]
  );

  // ─── Tool Call 승인/거부/실행 ───

  const approveToolCall = useCallback(
    async (
      roomId: string,
      messageId: string,
      toolCallId: string,
      mcpServerIds?: string[]
    ) => {
      // 1. status -> executing
      updateMessage(roomId, messageId, (msg) => ({
        ...msg,
        toolCalls: msg.toolCalls?.map((tc) =>
          tc.id === toolCallId ? { ...tc, status: "executing" as const } : tc
        ),
      }));

      updateToolCallInDB(toolCallId, { status: "executing" }).catch((err) =>
        console.error("Failed to update tool call status:", err)
      );

      setIsLoading(true);

      try {
        // 현재 메시지에서 해당 tool call 찾기
        const currentMsgs = messagesByRoom[roomId] ?? [];
        const targetMsg = currentMsgs.find((m) => m.id === messageId);
        const toolCall = targetMsg?.toolCalls?.find(
          (tc) => tc.id === toolCallId
        );

        if (!toolCall) throw new Error("Tool call을 찾을 수 없습니다.");

        // 2. Tool 실행
        const execRes = await fetch("/api/chat/tool-execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serverId: toolCall.serverId,
            name: toolCall.name,
            args: toolCall.args,
          }),
        });

        const { result, isError } = await execRes.json();

        // 3. Tool call 결과 업데이트
        const newStatus = isError ? "error" : "completed";
        updateMessage(roomId, messageId, (msg) => ({
          ...msg,
          toolCalls: msg.toolCalls?.map((tc) =>
            tc.id === toolCallId
              ? {
                  ...tc,
                  status: newStatus as ToolCall["status"],
                  result,
                  error: isError ? String(result) : undefined,
                }
              : tc
          ),
        }));

        updateToolCallInDB(toolCallId, {
          status: newStatus,
          result: result ?? null,
          error: isError ? String(result) : null,
        }).catch((err) =>
          console.error("Failed to update tool call result:", err)
        );

        // 4. Tool 결과를 Gemini에 전달하여 후속 응답 받기
        const updatedMsgs = (messagesByRoom[roomId] ?? []).map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                toolCalls: msg.toolCalls?.map((tc) =>
                  tc.id === toolCallId
                    ? {
                        ...tc,
                        status: isError
                          ? ("error" as const)
                          : ("completed" as const),
                        result,
                      }
                    : tc
                ),
              }
            : msg
        );

        const toolResultRes = await fetch("/api/chat/tool-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMsgs,
            mcpServerIds: mcpServerIds ?? [],
            toolResults: [
              {
                serverId: toolCall.serverId,
                name: toolCall.name,
                args: toolCall.args,
                result,
                _functionName: toolCall._functionName,
              },
            ],
          }),
        });

        if (!toolResultRes.ok || !toolResultRes.body) {
          throw new Error("후속 응답 요청 실패");
        }

        // 5. 후속 응답 스트리밍
        const followUpId = generateId();
        const followUpMessage: Message = {
          id: followUpId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };

        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: [...(prev[roomId] ?? []), followUpMessage],
        }));

        const followUpResult = await consumeSSEStream(
          toolResultRes.body,
          (text) => {
            updateMessage(roomId, followUpId, (msg) => ({
              ...msg,
              content: text,
            }));
          }
        );

        // 최종 follow-up 메시지 확정
        const finalFollowUp: Message = {
          ...followUpMessage,
          content: followUpResult.text,
          toolCalls:
            followUpResult.toolCalls.length > 0
              ? followUpResult.toolCalls
              : undefined,
        };

        // 후속 응답에도 tool calls가 있을 수 있음 (compositional)
        if (followUpResult.toolCalls.length > 0) {
          updateMessage(roomId, followUpId, (msg) => ({
            ...msg,
            content: followUpResult.text,
            toolCalls: followUpResult.toolCalls,
          }));
        }

        // DB에 follow-up 메시지 저장
        insertMessageInDB(roomId, finalFollowUp).catch((err) =>
          console.error("Failed to insert follow-up message:", err)
        );
      } catch (error) {
        console.error("Tool call execution error:", error);
        updateMessage(roomId, messageId, (msg) => ({
          ...msg,
          toolCalls: msg.toolCalls?.map((tc) =>
            tc.id === toolCallId
              ? {
                  ...tc,
                  status: "error" as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : "실행 중 오류 발생",
                }
              : tc
          ),
        }));

        updateToolCallInDB(toolCallId, {
          status: "error",
          error:
            error instanceof Error ? error.message : "실행 중 오류 발생",
        }).catch((err) =>
          console.error("Failed to update tool call error:", err)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messagesByRoom, updateMessage]
  );

  const rejectToolCall = useCallback(
    (roomId: string, messageId: string, toolCallId: string) => {
      updateMessage(roomId, messageId, (msg) => ({
        ...msg,
        toolCalls: msg.toolCalls?.map((tc) =>
          tc.id === toolCallId ? { ...tc, status: "rejected" as const } : tc
        ),
      }));

      updateToolCallInDB(toolCallId, { status: "rejected" }).catch((err) =>
        console.error("Failed to update tool call rejection:", err)
      );
    },
    [updateMessage]
  );

  const clearMessages = useCallback(() => {
    if (!activeRoomId) return;
    setMessagesByRoom((prev) => ({ ...prev, [activeRoomId]: [] }));
    const now = new Date();
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? { ...r, title: "새 대화", updatedAt: now }
          : r
      )
    );

    clearMessagesInDB(activeRoomId).catch((err) =>
      console.error("Failed to clear messages in DB:", err)
    );
    updateRoomInDB(activeRoomId, {
      title: "새 대화",
      updated_at: now.toISOString(),
    }).catch((err) =>
      console.error("Failed to update room after clear:", err)
    );
  }, [activeRoomId]);

  return {
    // Room state
    rooms,
    activeRoomId,
    activeMessages,
    isLoading,
    // Room actions
    createRoom,
    selectRoom,
    renameRoom,
    deleteRoom,
    // Message actions
    sendMessage,
    clearMessages,
    // Tool call actions
    approveToolCall,
    rejectToolCall,
  };
}
