/**
 * SSE 스트림 헬퍼 유틸리티
 * 서버 -> 클라이언트 이벤트 스트리밍에 사용
 */

export type SSEEvent =
  | { event: "text"; data: { chunk: string } }
  | {
      event: "tool_call";
      data: {
        id: string;
        serverId: string;
        serverName: string;
        name: string;
        args: Record<string, unknown>;
        /** Gemini에 전달한 safe function name (히스토리 복원용) */
        _functionName?: string;
      };
    }
  | { event: "tool_result"; data: { id: string; result: unknown; isError?: boolean } }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { message: string } };

/** SSE 형식으로 이벤트를 인코딩 */
export function encodeSSE(event: SSEEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/** SSE WritableStream 컨트롤러에 이벤트 전송 */
export function sendSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: SSEEvent
) {
  controller.enqueue(encoder.encode(encodeSSE(event)));
}
