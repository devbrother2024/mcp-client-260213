"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  McpServerConfig,
  McpServerFormData,
} from "@/lib/types/mcp-server";
import {
  fetchMcpServers,
  insertMcpServerInDB,
  updateMcpServerInDB,
  deleteMcpServerInDB,
} from "@/lib/db/mcp-servers";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** MCP 서버 폼 데이터 유효성 검증 */
export function validateServerForm(data: McpServerFormData): string | null {
  if (!data.name.trim()) return "서버 이름을 입력해 주세요.";

  if (data.transport === "streamable-http") {
    if (!data.url?.trim()) return "URL을 입력해 주세요.";
    try {
      new URL(data.url);
    } catch {
      return "올바른 URL 형식이 아닙니다.";
    }
  }

  if (data.transport === "stdio") {
    if (!data.command?.trim()) return "실행 명령어를 입력해 주세요.";
  }

  return null;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const isMounted = useRef(false);

  // ─── Supabase에서 초기 데이터 로드 ───

  useEffect(() => {
    async function loadFromDB() {
      try {
        const dbServers = await fetchMcpServers();
        if (dbServers.length > 0) {
          setServers(dbServers);
        }
      } catch (err) {
        console.error("Failed to load MCP servers from Supabase:", err);
      }
      isMounted.current = true;
    }
    loadFromDB();
  }, []);

  const addServer = useCallback((data: McpServerFormData): string | null => {
    const error = validateServerForm(data);
    if (error) return error;

    const now = new Date().toISOString();
    const server: McpServerConfig = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    setServers((prev) => [...prev, server]);

    insertMcpServerInDB(server).catch((err) =>
      console.error("Failed to insert MCP server in DB:", err)
    );

    return null;
  }, []);

  const updateServer = useCallback(
    (id: string, data: McpServerFormData): string | null => {
      const error = validateServerForm(data);
      if (error) return error;

      const now = new Date().toISOString();
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...data, updatedAt: now } : s
        )
      );

      updateMcpServerInDB(id, {
        name: data.name,
        enabled: data.enabled,
        transport: data.transport,
        url: data.url ?? null,
        headers: data.headers ?? null,
        command: data.command ?? null,
        args: data.args ?? null,
        env: data.env ?? null,
        updated_at: now,
      }).catch((err) =>
        console.error("Failed to update MCP server in DB:", err)
      );

      return null;
    },
    []
  );

  const deleteServer = useCallback((id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));

    deleteMcpServerInDB(id).catch((err) =>
      console.error("Failed to delete MCP server from DB:", err)
    );
  }, []);

  const toggleServer = useCallback((id: string) => {
    setServers((prev) => {
      const target = prev.find((s) => s.id === id);
      if (!target) return prev;

      const now = new Date().toISOString();
      const newEnabled = !target.enabled;

      updateMcpServerInDB(id, {
        enabled: newEnabled,
        updated_at: now,
      }).catch((err) =>
        console.error("Failed to toggle MCP server in DB:", err)
      );

      return prev.map((s) =>
        s.id === id ? { ...s, enabled: newEnabled, updatedAt: now } : s
      );
    });
  }, []);

  return {
    servers,
    addServer,
    updateServer,
    deleteServer,
    toggleServer,
  };
}
