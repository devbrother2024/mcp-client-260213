/**
 * 클라이언트 사이드 SSE 파서
 * ReadableStream을 파싱하여 SSE 이벤트를 yield한다.
 */

export interface ParsedSSEEvent {
  event: string;
  data: unknown;
}

/**
 * SSE ReadableStream을 파싱하여 이벤트를 하나씩 yield하는 async generator
 */
export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<ParsedSSEEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 이벤트는 빈 줄(\n\n)로 구분
      const parts = buffer.split("\n\n");
      // 마지막은 아직 불완전할 수 있으므로 buffer에 남김
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = "message";
        let dataStr = "";

        for (const line of part.split("\n")) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataStr += line.slice(6);
          } else if (line.startsWith("data:")) {
            dataStr += line.slice(5);
          }
        }

        if (dataStr) {
          try {
            yield { event: eventType, data: JSON.parse(dataStr) };
          } catch {
            yield { event: eventType, data: dataStr };
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
