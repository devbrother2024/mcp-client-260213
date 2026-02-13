import { supabase } from "@/lib/supabase";
import type { McpServerConfig } from "@/lib/types/mcp-server";
import type { Database } from "@/lib/types/database";

// ─── DB Row 타입 ───

type McpServerRow = Database["public"]["Tables"]["mcp_servers"]["Row"];

// ─── Row → 앱 타입 변환 ───

function toMcpServerConfig(row: McpServerRow): McpServerConfig {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    transport: row.transport,
    url: row.url ?? undefined,
    headers: row.headers ?? undefined,
    command: row.command ?? undefined,
    args: row.args ?? undefined,
    env: row.env ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── CRUD ───

export async function fetchMcpServers(): Promise<McpServerConfig[]> {
  const { data, error } = await supabase
    .from("mcp_servers")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as McpServerRow[]).map(toMcpServerConfig);
}

export async function insertMcpServerInDB(
  server: McpServerConfig
): Promise<void> {
  const { error } = await supabase.from("mcp_servers").insert({
    id: server.id,
    name: server.name,
    enabled: server.enabled,
    transport: server.transport,
    url: server.url ?? null,
    headers: server.headers ?? null,
    command: server.command ?? null,
    args: server.args ?? null,
    env: server.env ?? null,
    created_at: server.createdAt,
    updated_at: server.updatedAt,
  });
  if (error) throw error;
}

export async function updateMcpServerInDB(
  id: string,
  updates: Partial<{
    name: string;
    enabled: boolean;
    transport: "streamable-http" | "stdio";
    url: string | null;
    headers: Record<string, string> | null;
    command: string | null;
    args: string[] | null;
    env: Record<string, string> | null;
    updated_at: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from("mcp_servers")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMcpServerInDB(id: string): Promise<void> {
  const { error } = await supabase
    .from("mcp_servers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
