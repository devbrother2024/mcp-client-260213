/**
 * MCP Tool -> Gemini FunctionDeclaration 변환 유틸리티
 *
 * MCP tool name에 서버 인덱스 prefix를 추가하여 어떤 MCP 서버의 tool인지 식별.
 * 런타임에 serverIndex <-> serverId 매핑 테이블을 유지한다.
 *
 * 형식: mcp{index}__{toolName}
 * 예: mcp0__read_file, mcp1__search
 */

import type { McpTool } from "@/lib/types/mcp-server";

export interface ServerTool extends McpTool {
  serverId: string;
  serverName: string;
}

/** 변환 시 생성되는 매핑 테이블 */
export interface ToolMapping {
  /** Gemini safe function name -> { serverId, toolName } */
  byFunctionName: Map<string, { serverId: string; serverName: string; toolName: string }>;
}

/**
 * MCP tools를 Gemini FunctionDeclaration 배열로 변환.
 * 동시에 역매핑 테이블도 반환한다.
 */
export function toFunctionDeclarations(serverTools: ServerTool[]): {
  declarations: Array<{
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  }>;
  mapping: ToolMapping;
} {
  const mapping: ToolMapping = { byFunctionName: new Map() };

  // serverId별 인덱스 매핑
  const serverIdToIndex = new Map<string, number>();
  let nextIndex = 0;
  for (const t of serverTools) {
    if (!serverIdToIndex.has(t.serverId)) {
      serverIdToIndex.set(t.serverId, nextIndex++);
    }
  }

  const declarations = serverTools.map((t) => {
    const idx = serverIdToIndex.get(t.serverId)!;
    // tool name에서 Gemini 비허용 문자를 제거
    const safeToolName = t.name.replace(/[^a-zA-Z0-9_.\-:]/g, "_");
    // mcp{index}__{safeToolName} — 반드시 문자로 시작
    const functionName = `mcp${idx}__${safeToolName}`;

    mapping.byFunctionName.set(functionName, {
      serverId: t.serverId,
      serverName: t.serverName,
      toolName: t.name, // 원본 이름 보존
    });

    const decl: {
      name: string;
      description: string;
      parameters?: Record<string, unknown>;
    } = {
      name: functionName,
      description: t.description || `MCP tool: ${t.name}`,
    };

    if (t.inputSchema) {
      const schema = { ...t.inputSchema };
      if (!schema.type) schema.type = "object";
      decl.parameters = schema;
    }

    return decl;
  });

  return { declarations, mapping };
}

/** Gemini function name -> 원본 serverId + toolName 복원 */
export function resolveToolCall(
  functionName: string,
  mapping: ToolMapping
): { serverId: string; serverName: string; toolName: string } | null {
  return mapping.byFunctionName.get(functionName) ?? null;
}
