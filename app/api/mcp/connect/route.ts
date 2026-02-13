import { NextRequest, NextResponse } from "next/server";
import { connectionManager } from "@/lib/mcp/connection-manager";
import type { McpServerConfig } from "@/lib/types/mcp-server";

export async function POST(req: NextRequest) {
  try {
    const { config } = (await req.json()) as { config: McpServerConfig };

    if (!config?.id) {
      return NextResponse.json(
        { error: "서버 설정이 필요합니다." },
        { status: 400 }
      );
    }

    const result = await connectionManager.connectServer(config);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
