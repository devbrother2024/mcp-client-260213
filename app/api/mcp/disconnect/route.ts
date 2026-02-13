import { NextRequest, NextResponse } from "next/server";
import { connectionManager } from "@/lib/mcp/connection-manager";

export async function POST(req: NextRequest) {
  try {
    const { serverId } = (await req.json()) as { serverId: string };

    if (!serverId) {
      return NextResponse.json(
        { error: "serverId가 필요합니다." },
        { status: 400 }
      );
    }

    await connectionManager.disconnectServer(serverId);
    return NextResponse.json({ status: "disconnected" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
