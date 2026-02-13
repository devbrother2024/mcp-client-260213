import { NextRequest, NextResponse } from "next/server";
import { connectionManager } from "@/lib/mcp/connection-manager";

/**
 * POST /api/chat/tool-execute
 * 사용자가 승인한 MCP tool을 실행한다.
 *
 * Body: { serverId, name, args }
 * Response: { result, isError }
 */
export async function POST(req: NextRequest) {
  try {
    const { serverId, name, args } = (await req.json()) as {
      serverId: string;
      name: string;
      args: Record<string, unknown>;
    };

    if (!serverId || !name) {
      return NextResponse.json(
        { error: "serverId와 name은 필수입니다." },
        { status: 400 }
      );
    }

    const { content, isError } = await connectionManager.callTool(
      serverId,
      name,
      args ?? {}
    );

    return NextResponse.json({ result: content, isError: isError ?? false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tool 실행 오류";
    return NextResponse.json({ result: message, isError: true }, { status: 500 });
  }
}
