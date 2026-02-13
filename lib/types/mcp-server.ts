export type McpTransportType = "streamable-http" | "stdio";

export interface McpServerConfig {
  id: string;
  name: string;
  enabled: boolean;
  transport: McpTransportType;
  // Streamable HTTP 전용
  url?: string;
  headers?: Record<string, string>;
  // stdio 전용
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  createdAt: string; // ISO string
  updatedAt: string;
}

export type McpServerFormData = Omit<
  McpServerConfig,
  "id" | "createdAt" | "updatedAt"
>;

// --- 연결 상태 ---

export type McpConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface McpServerStatus {
  id: string;
  status: McpConnectionStatus;
  error?: string;
}

// --- Capabilities ---

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpServerCapabilities {
  tools: McpTool[];
  prompts: McpPrompt[];
  resources: McpResource[];
}

// --- Tool 실행 ---

export interface McpToolCallRequest {
  id: string;
  serverId: string;
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface McpToolCallResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}
