import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ListToolsResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  CallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  McpServerConfig,
  McpConnectionStatus,
  McpServerStatus,
  McpServerCapabilities,
  McpTool,
  McpPrompt,
  McpResource,
} from "@/lib/types/mcp-server";

interface ManagedConnection {
  client: Client;
  transport: StreamableHTTPClientTransport | StdioClientTransport;
  status: McpConnectionStatus;
  error?: string;
}

class McpConnectionManager {
  private connections = new Map<string, ManagedConnection>();

  /** 서버에 연결 */
  async connectServer(
    config: McpServerConfig
  ): Promise<{ status: McpConnectionStatus; error?: string }> {
    // 이미 연결 중이거나 연결됨이면 기존 상태 반환
    const existing = this.connections.get(config.id);
    if (existing && existing.status === "connected") {
      return { status: "connected" };
    }

    // 기존 연결이 있으면 먼저 정리
    if (existing) {
      await this.disconnectServer(config.id);
    }

    const client = new Client(
      { name: "mcp-client-app", version: "1.0.0" },
      { capabilities: {} }
    );

    let transport: StreamableHTTPClientTransport | StdioClientTransport;

    try {
      // Transport 생성
      if (config.transport === "streamable-http") {
        if (!config.url) throw new Error("URL이 필요합니다.");
        const httpHeaders: Record<string, string> = {};
        if (config.headers) {
          for (const [k, v] of Object.entries(config.headers)) {
            if (k.trim()) httpHeaders[k] = v;
          }
        }
        transport = new StreamableHTTPClientTransport(new URL(config.url), {
          requestInit: Object.keys(httpHeaders).length > 0
            ? { headers: httpHeaders }
            : undefined,
        });
      } else {
        if (!config.command) throw new Error("명령어가 필요합니다.");
        transport = new StdioClientTransport({
          command: config.command,
          args: config.args ?? [],
          env: {
            ...process.env,
            ...(config.env ?? {}),
          } as Record<string, string>,
        });
      }

      // 상태를 connecting으로 설정
      this.connections.set(config.id, {
        client,
        transport,
        status: "connecting",
      });

      // 연결
      await client.connect(transport);

      this.connections.set(config.id, {
        client,
        transport,
        status: "connected",
      });

      return { status: "connected" };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "연결 실패";

      this.connections.set(config.id, {
        client,
        transport: transport!,
        status: "error",
        error: errorMessage,
      });

      return { status: "error", error: errorMessage };
    }
  }

  /** 서버 연결 해제 */
  async disconnectServer(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) return;

    try {
      await conn.transport.close();
    } catch {
      // close 실패 무시
    }
    this.connections.delete(id);
  }

  /** 단일 서버 상태 */
  getStatus(id: string): McpServerStatus {
    const conn = this.connections.get(id);
    if (!conn) {
      return { id, status: "disconnected" };
    }
    return { id, status: conn.status, error: conn.error };
  }

  /** 여러 서버 상태 일괄 조회 */
  getStatuses(ids?: string[]): McpServerStatus[] {
    if (ids && ids.length > 0) {
      return ids.map((id) => this.getStatus(id));
    }
    // 전체 반환
    const result: McpServerStatus[] = [];
    for (const [id, conn] of this.connections) {
      result.push({ id, status: conn.status, error: conn.error });
    }
    return result;
  }

  /** Tools 목록 */
  async listTools(id: string): Promise<McpTool[]> {
    const conn = this.connections.get(id);
    if (!conn || conn.status !== "connected") return [];

    try {
      const result = await conn.client.request(
        { method: "tools/list", params: {} },
        ListToolsResultSchema
      );
      return (result.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      }));
    } catch {
      return [];
    }
  }

  /** Prompts 목록 */
  async listPrompts(id: string): Promise<McpPrompt[]> {
    const conn = this.connections.get(id);
    if (!conn || conn.status !== "connected") return [];

    try {
      const result = await conn.client.request(
        { method: "prompts/list", params: {} },
        ListPromptsResultSchema
      );
      return (result.prompts ?? []).map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments?.map((a) => ({
          name: a.name,
          description: a.description,
          required: a.required,
        })),
      }));
    } catch {
      return [];
    }
  }

  /** Resources 목록 */
  async listResources(id: string): Promise<McpResource[]> {
    const conn = this.connections.get(id);
    if (!conn || conn.status !== "connected") return [];

    try {
      const result = await conn.client.request(
        { method: "resources/list", params: {} },
        ListResourcesResultSchema
      );
      return (result.resources ?? []).map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }));
    } catch {
      return [];
    }
  }

  /** Tool 실행 */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ content: unknown; isError?: boolean }> {
    const conn = this.connections.get(serverId);
    if (!conn || conn.status !== "connected") {
      throw new Error(`서버 ${serverId}가 연결되지 않았습니다.`);
    }

    try {
      const result = await conn.client.request(
        { method: "tools/call", params: { name: toolName, arguments: args } },
        CallToolResultSchema
      );
      // MCP 결과: { content: [...], isError?: boolean }
      const isError = result.isError ?? false;
      // content 배열을 텍스트로 축약
      const content = result.content.map((c) => {
        if (c.type === "text") return c.text;
        return c;
      });
      return { content: content.length === 1 ? content[0] : content, isError };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Tool 실행 실패";
      return { content: errorMessage, isError: true };
    }
  }

  /** 여러 서버의 tool 목록을 통합 조회 (serverId prefix 포함) */
  async listAllTools(
    serverIds: string[]
  ): Promise<Array<McpTool & { serverId: string; serverName: string }>> {
    const results: Array<McpTool & { serverId: string; serverName: string }> =
      [];
    for (const id of serverIds) {
      const conn = this.connections.get(id);
      if (!conn || conn.status !== "connected") continue;
      const tools = await this.listTools(id);
      for (const tool of tools) {
        results.push({ ...tool, serverId: id, serverName: id });
      }
    }
    return results;
  }

  /** Capabilities 통합 조회 */
  async getCapabilities(id: string): Promise<McpServerCapabilities> {
    const [tools, prompts, resources] = await Promise.all([
      this.listTools(id),
      this.listPrompts(id),
      this.listResources(id),
    ]);
    return { tools, prompts, resources };
  }
}

// Next.js hot reload 대응 싱글턴
const globalForMcp = globalThis as unknown as {
  __mcpConnectionManager?: McpConnectionManager;
};

export const connectionManager =
  globalForMcp.__mcpConnectionManager ??
  (globalForMcp.__mcpConnectionManager = new McpConnectionManager());
