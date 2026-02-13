"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Message } from "@/hooks/use-chat";

export interface ChatRoom {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatStoreData {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  /** messages keyed by room id */
  messagesByRoom: Record<string, Message[]>;
}

const STORE_KEY = "chat_store";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadStore(): ChatStoreData {
  if (typeof window === "undefined") {
    return { rooms: [], activeRoomId: null, messagesByRoom: {} };
  }
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return { rooms: [], activeRoomId: null, messagesByRoom: {} };

  try {
    const parsed = JSON.parse(raw);
    return {
      rooms: (parsed.rooms ?? []).map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      })),
      activeRoomId: parsed.activeRoomId ?? null,
      messagesByRoom: Object.fromEntries(
        Object.entries(parsed.messagesByRoom ?? {}).map(
          ([roomId, msgs]: [string, any]) => [
            roomId,
            msgs.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          ]
        )
      ),
    };
  } catch {
    return { rooms: [], activeRoomId: null, messagesByRoom: {} };
  }
}

function saveStore(data: ChatStoreData) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

/** 첫 유저 메시지로 채팅방 제목 생성 (최대 30자) */
function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "새 대화";
  const text = first.content.trim();
  return text.length > 30 ? text.slice(0, 30) + "..." : text;
}

export function useChatStore() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<
    Record<string, Message[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(false);

  // Load on mount
  useEffect(() => {
    const data = loadStore();
    setRooms(data.rooms);
    setActiveRoomId(data.activeRoomId);
    setMessagesByRoom(data.messagesByRoom);
    isMounted.current = true;
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (!isMounted.current) return;
    saveStore({ rooms, activeRoomId, messagesByRoom });
  }, [rooms, activeRoomId, messagesByRoom]);

  const activeMessages = activeRoomId
    ? messagesByRoom[activeRoomId] ?? []
    : [];

  // --- Room management ---

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
    return id;
  }, []);

  const selectRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
  }, []);

  const renameRoom = useCallback((roomId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, title: trimmed, updatedAt: new Date() } : r
      )
    );
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
        setActiveRoomId((prev) => {
          const remaining = rooms.filter((r) => r.id !== roomId);
          return remaining.length > 0 ? remaining[0].id : null;
        });
      }
    },
    [activeRoomId, rooms]
  );

  // --- Messaging ---

  const sendMessage = useCallback(
    async (content: string) => {
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

      // Update room title from first user message & updatedAt
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? {
                ...r,
                title: deriveTitle(newMessages),
                updatedAt: new Date(),
              }
            : r
        )
      );

      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }),
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

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulated = "";

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          accumulated += decoder.decode(value, { stream: true });

          const snapshot = accumulated;
          setMessagesByRoom((prev) => ({
            ...prev,
            [roomId]: (prev[roomId] ?? []).map((msg) =>
              msg.id === assistantId ? { ...msg, content: snapshot } : msg
            ),
          }));
        }

        // Update room updatedAt after completion
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId ? { ...r, updatedAt: new Date() } : r
          )
        );
      } catch (error) {
        console.error("Error sending message:", error);
        setMessagesByRoom((prev) => ({
          ...prev,
          [roomId]: [
            ...(prev[roomId] ?? []),
            {
              id: generateId(),
              role: "assistant",
              content: "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.",
              timestamp: new Date(),
            },
          ],
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [activeRoomId, messagesByRoom, isLoading]
  );

  const clearMessages = useCallback(() => {
    if (!activeRoomId) return;
    setMessagesByRoom((prev) => ({ ...prev, [activeRoomId]: [] }));
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoomId
          ? { ...r, title: "새 대화", updatedAt: new Date() }
          : r
      )
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
  };
}
