import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { connectionManager } from "@/lib/mcp/connection-manager";
import {
  toFunctionDeclarations,
  resolveToolCall,
  type ServerTool,
  type ToolMapping,
} from "@/lib/mcp/tool-converter";
import { sendSSE } from "@/lib/sse";

const MODEL = process.env.LLM_MODEL || "gemini-2.5-flash-lite";

/**
 * POST /api/chat/tool-result
 * Tool 실행 결과를 Gemini에 전달하여 후속 응답을 SSE 스트리밍으로 받는다.
 *
 * Body: {
 *   messages: [...],      // 전체 대화 히스토리
 *   mcpServerIds: [...],  // 활성 MCP 서버 ID
 *   toolResults: [{ serverId, name, args, result, _functionName }]
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { messages, mcpServerIds, toolResults } = (await req.json()) as {
      messages: Array<{
        role: string;
        content: string;
        toolCalls?: Array<{
          name: string;
          args: Record<string, unknown>;
          result?: unknown;
          error?: string;
          status?: string;
          _functionName?: string;
        }>;
      }>;
      mcpServerIds?: string[];
      toolResults: Array<{
        serverId: string;
        name: string;
        args: Record<string, unknown>;
        result: unknown;
        _functionName?: string;
      }>;
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // MCP 서버에서 tool 목록 수집
    let serverTools: ServerTool[] = [];
    let toolMapping: ToolMapping = { byFunctionName: new Map() };

    if (mcpServerIds && mcpServerIds.length > 0) {
      const results = await Promise.all(
        mcpServerIds.map(async (id) => {
          const tools = await connectionManager.listTools(id);
          return tools.map((t) => ({ ...t, serverId: id, serverName: id }));
        })
      );
      serverTools = results.flat();
    }

    // Gemini config
    const config: Record<string, unknown> = {};
    if (serverTools.length > 0) {
      const { declarations, mapping } = toFunctionDeclarations(serverTools);
      toolMapping = mapping;
      config.tools = [{ functionDeclarations: declarations }];
    }

    // 기존 대화 히스토리 -> Gemini contents
    const contents: Array<{
      role: string;
      parts: Array<Record<string, unknown>>;
    }> = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        contents.push({ role: "user", parts: [{ text: msg.content }] });
      } else if (msg.role === "assistant") {
        const parts: Array<Record<string, unknown>> = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            if (tc.status === "completed" || tc.status === "error") {
              parts.push({
                functionCall: {
                  name: tc._functionName ?? tc.name,
                  args: tc.args,
                },
              });
            }
          }
        }
        if (parts.length > 0) {
          contents.push({ role: "model", parts });
        }

        // completed tool call 결과를 functionResponse로 추가
        if (msg.toolCalls) {
          const responseParts: Array<Record<string, unknown>> = [];
          for (const tc of msg.toolCalls) {
            if (tc.status === "completed" || tc.status === "error") {
              responseParts.push({
                functionResponse: {
                  name: tc._functionName ?? tc.name,
                  response: { result: tc.result ?? tc.error ?? "no result" },
                },
              });
            }
          }
          if (responseParts.length > 0) {
            contents.push({ role: "user", parts: responseParts });
          }
        }
      }
    }

    // 현재 라운드의 tool call + result 추가
    // model turn: functionCall parts
    const modelParts: Array<Record<string, unknown>> = [];
    for (const tr of toolResults) {
      modelParts.push({
        functionCall: {
          name: tr._functionName ?? tr.name,
          args: tr.args,
        },
      });
    }
    if (modelParts.length > 0) {
      contents.push({ role: "model", parts: modelParts });
    }

    // user turn: functionResponse parts
    const frParts: Array<Record<string, unknown>> = [];
    for (const tr of toolResults) {
      frParts.push({
        functionResponse: {
          name: tr._functionName ?? tr.name,
          response: { result: tr.result },
        },
      });
    }
    if (frParts.length > 0) {
      contents.push({ role: "user", parts: frParts });
    }

    // SSE 스트림 생성
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const result = await ai.models.generateContentStream({
            model: MODEL,
            contents,
            config,
          });

          for await (const chunk of result) {
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              for (const fc of chunk.functionCalls) {
                const resolved = resolveToolCall(
                  fc.name ?? "",
                  toolMapping
                );
                sendSSE(controller, encoder, {
                  event: "tool_call",
                  data: {
                    id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    serverId: resolved?.serverId ?? "",
                    serverName: resolved?.serverName ?? "",
                    name: resolved?.toolName ?? fc.name ?? "",
                    args: (fc.args as Record<string, unknown>) ?? {},
                    _functionName: fc.name ?? "",
                  },
                });
              }
            }

            const text = chunk.text;
            if (text) {
              sendSSE(controller, encoder, {
                event: "text",
                data: { chunk: text },
              });
            }
          }

          sendSSE(controller, encoder, {
            event: "done",
            data: {} as Record<string, never>,
          });
          controller.close();
        } catch (error) {
          console.error("Tool result stream error:", error);
          const message =
            error instanceof Error ? error.message : "Internal Server Error";
          sendSSE(controller, encoder, {
            event: "error",
            data: { message },
          });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in tool-result API:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
