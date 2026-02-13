import { NextRequest, NextResponse } from "next/server";
import { connectionManager } from "@/lib/mcp/connection-manager";

export async function GET(req: NextRequest) {
  try {
    const serverId = req.nextUrl.searchParams.get("serverId");

    if (!serverId) {
      return NextResponse.json(
        { error: "serverId가 필요합니다." },
        { status: 400 }
      );
    }

    const status = connectionManager.getStatus(serverId);
    if (status.status !== "connected") {
      return NextResponse.json(
        { error: "서버가 연결되어 있지 않습니다.", status: status.status },
        { status: 400 }
      );
    }

    const capabilities = await connectionManager.getCapabilities(serverId);
    return NextResponse.json(capabilities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
