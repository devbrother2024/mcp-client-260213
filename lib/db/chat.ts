import { supabase } from "@/lib/supabase";
import type { ChatRoom } from "@/hooks/use-chat-store";
import type { Message, ToolCall } from "@/hooks/use-chat";
import type { Database } from "@/lib/types/database";

// ─── DB Row 타입 ───

type ChatRoomRow = Database["public"]["Tables"]["chat_rooms"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type ToolCallRow = Database["public"]["Tables"]["tool_calls"]["Row"];

// ─── Row → 앱 타입 변환 ───

function toChatRoom(row: ChatRoomRow): ChatRoom {
  return {
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function toToolCall(row: ToolCallRow): ToolCall {
  return {
    id: row.id,
    serverId: row.server_id,
    serverName: row.server_name,
    name: row.name,
    args: row.args,
    status: row.status as ToolCall["status"],
    result: row.result ?? undefined,
    error: row.error ?? undefined,
    _functionName: row.function_name ?? undefined,
  };
}

function toMessage(row: MessageRow, toolCallRows?: ToolCallRow[]): Message {
  const msg: Message = {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.timestamp),
  };
  if (toolCallRows && toolCallRows.length > 0) {
    msg.toolCalls = toolCallRows.map(toToolCall);
  }
  return msg;
}

// ─── Rooms ───

export async function fetchRooms(): Promise<ChatRoom[]> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ChatRoomRow[]).map(toChatRoom);
}

export async function createRoomInDB(room: ChatRoom): Promise<void> {
  const { error } = await supabase.from("chat_rooms").insert({
    id: room.id,
    title: room.title,
    created_at: room.createdAt.toISOString(),
    updated_at: room.updatedAt.toISOString(),
  });
  if (error) throw error;
}

export async function updateRoomInDB(
  roomId: string,
  updates: { title?: string; updated_at?: string }
): Promise<void> {
  const { error } = await supabase
    .from("chat_rooms")
    .update(updates)
    .eq("id", roomId);
  if (error) throw error;
}

export async function deleteRoomInDB(roomId: string): Promise<void> {
  const { error } = await supabase
    .from("chat_rooms")
    .delete()
    .eq("id", roomId);
  if (error) throw error;
}

// ─── Messages ───

export async function fetchMessages(roomId: string): Promise<Message[]> {
  const { data: msgRows, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .order("timestamp", { ascending: true });

  if (msgError) throw msgError;
  const rows = (msgRows ?? []) as MessageRow[];
  if (rows.length === 0) return [];

  // 해당 room의 모든 메시지 ID에 대한 tool_calls를 한 번에 조회
  const messageIds = rows.map((m) => m.id);
  const { data: tcData, error: tcError } = await supabase
    .from("tool_calls")
    .select("*")
    .in("message_id", messageIds);

  if (tcError) throw tcError;
  const tcRows = (tcData ?? []) as ToolCallRow[];

  // message_id 별로 그룹핑
  const tcByMsg = new Map<string, ToolCallRow[]>();
  for (const tc of tcRows) {
    const arr = tcByMsg.get(tc.message_id) ?? [];
    arr.push(tc);
    tcByMsg.set(tc.message_id, arr);
  }

  return rows.map((row) => toMessage(row, tcByMsg.get(row.id)));
}

export async function insertMessageInDB(
  roomId: string,
  message: Message
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    id: message.id,
    room_id: roomId,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp.toISOString(),
  });
  if (error) throw error;

  // tool_calls가 있으면 함께 저장
  if (message.toolCalls && message.toolCalls.length > 0) {
    await insertToolCallsInDB(message.id, message.toolCalls);
  }
}

export async function updateMessageInDB(
  messageId: string,
  updates: { content?: string }
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update(updates)
    .eq("id", messageId);
  if (error) throw error;
}

// ─── Tool Calls ───

export async function insertToolCallsInDB(
  messageId: string,
  toolCalls: ToolCall[]
): Promise<void> {
  const rows = toolCalls.map((tc) => ({
    id: tc.id,
    message_id: messageId,
    server_id: tc.serverId,
    server_name: tc.serverName,
    name: tc.name,
    args: tc.args,
    status: tc.status,
    result: (tc.result as Record<string, unknown>) ?? null,
    error: tc.error ?? null,
    function_name: tc._functionName ?? null,
  }));

  const { error } = await supabase.from("tool_calls").insert(rows);
  if (error) throw error;
}

export async function updateToolCallInDB(
  toolCallId: string,
  updates: {
    status?: string;
    result?: unknown;
    error?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("tool_calls")
    .update(updates)
    .eq("id", toolCallId);
  if (error) throw error;
}

// ─── Bulk: room 내 메시지 전부 삭제 (clearMessages) ───

export async function clearMessagesInDB(roomId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("room_id", roomId);
  if (error) throw error;
}
