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
 * 메시지를 Gemini contents 형식으로 변환
 * 이전 대화 히스토리의 tool call은 이미 완료된 상태이므로 그대로 전달
 */
function toGeminiContents(
  messages: Array<{
    role: string;
    content: string;
    toolCalls?: Array<{
      name: string;
      args: Record<string, unknown>;
      result?: unknown;
      error?: string;
      status?: string;
      // Gemini에 전달할 때 사용한 safe function name
      _functionName?: string;
    }>;
  }>
) {
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
      // assistant 메시지에 tool call이 있었다면 functionCall part 추가
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

      // completed tool call의 결과를 functionResponse로 추가
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

  return contents;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, mcpServerIds } = (await req.json()) as {
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
      const toolsResults = await Promise.all(
        mcpServerIds.map(async (id) => {
          const tools = await connectionManager.listTools(id);
          return tools.map((t) => ({ ...t, serverId: id, serverName: id }));
        })
      );
      serverTools = toolsResults.flat();
    }

    // Gemini config 구성
    const config: Record<string, unknown> = {
      systemInstruction:
        "You are a helpful AI assistant.\n" +
        "When calling image-generation tools (e.g. generate-image, create_image, generate_image), " +
        "ALWAYS translate the prompt/description argument into English before passing it to the tool, " +
        "even if the user wrote it in another language.",
    };
    if (serverTools.length > 0) {
      const { declarations, mapping } = toFunctionDeclarations(serverTools);
      toolMapping = mapping;
      config.tools = [{ functionDeclarations: declarations }];
    }

    // messages -> Gemini contents 변환
    const contents = toGeminiContents(messages);

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
            // functionCalls 체크
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

            // 텍스트 체크
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
          console.error("Chat stream error:", error);
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
    console.error("Error in chat API:", error);
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
