"use client";

import { useState } from "react";
import {
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Wrench,
  RefreshCw,
  Server,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ToolCall } from "@/hooks/use-chat";

interface ToolCallCardProps {
  toolCall: ToolCall;
  onApprove: () => void;
  onReject: () => void;
}

/** MCP image content item */
interface McpImageItem {
  type: "image";
  data: string;
  mimeType: string;
}

function isMcpImage(v: unknown): v is McpImageItem {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as Record<string, unknown>).type === "image" &&
    typeof (v as Record<string, unknown>).data === "string" &&
    typeof (v as Record<string, unknown>).mimeType === "string"
  );
}

function ImageBlock({ item }: { item: McpImageItem }) {
  return (
    <div className="mt-1.5">
      <span className="text-muted-foreground text-[11px] font-medium uppercase">
        이미지
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:${item.mimeType};base64,${item.data}`}
        alt="MCP tool result"
        className="mt-1 max-h-80 max-w-full rounded border object-contain"
      />
    </div>
  );
}

/** result 데이터를 분석하여 이미지/텍스트/JSON 을 적절히 렌더링 */
function ResultBlock({ data }: { data: unknown }) {
  // 단일 이미지 객체
  if (isMcpImage(data)) {
    return <ImageBlock item={data} />;
  }

  // 배열인 경우 각 항목을 개별 렌더링
  if (Array.isArray(data)) {
    const items = data as unknown[];
    // 모든 항목이 이미지/텍스트로 분류 가능하면 각각 렌더
    const hasSpecialItems = items.some(
      (it) => isMcpImage(it) || typeof it === "string"
    );
    if (hasSpecialItems) {
      return (
        <>
          {items.map((item, idx) => {
            if (isMcpImage(item)) {
              return <ImageBlock key={idx} item={item} />;
            }
            if (typeof item === "string") {
              return <JsonBlock key={idx} data={item} label="텍스트" />;
            }
            return <JsonBlock key={idx} data={item} label="결과" />;
          })}
        </>
      );
    }
  }

  // 기본: JSON 표시
  return <JsonBlock data={data} label="결과" />;
}

function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  const jsonStr = JSON.stringify(data, null, 2);
  const isShort = jsonStr.length < 80;

  if (isShort) {
    return (
      <div className="mt-1.5">
        <span className="text-muted-foreground text-[11px] font-medium uppercase">
          {label}
        </span>
        <pre className="bg-background/60 mt-0.5 overflow-x-auto rounded px-2 py-1 text-xs">
          {jsonStr}
        </pre>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-1.5">
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] font-medium uppercase">
        {open ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="bg-background/60 mt-0.5 max-h-48 overflow-auto rounded px-2 py-1 text-xs">
          {jsonStr}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ToolCallCard({
  toolCall,
  onApprove,
  onReject,
}: ToolCallCardProps) {
  const { status, name, serverName, args, result, error } = toolCall;

  return (
    <div
      className={cn(
        "my-2 rounded-lg border p-3 text-sm",
        status === "pending" && "border-amber-500/40 bg-amber-500/5",
        status === "executing" && "border-blue-500/40 bg-blue-500/5",
        status === "completed" && "border-green-500/40 bg-green-500/5",
        status === "error" && "border-red-500/40 bg-red-500/5",
        status === "rejected" && "border-muted bg-muted/30"
      )}
    >
      {/* 헤더: 아이콘 + tool 이름 + 서버 */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-6 items-center justify-center rounded",
            status === "pending" && "bg-amber-500/10 text-amber-600",
            status === "executing" && "bg-blue-500/10 text-blue-600",
            status === "completed" && "bg-green-500/10 text-green-600",
            status === "error" && "bg-red-500/10 text-red-600",
            status === "rejected" && "bg-muted text-muted-foreground"
          )}
        >
          {status === "executing" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : status === "completed" ? (
            <Check className="size-3.5" />
          ) : status === "error" ? (
            <AlertCircle className="size-3.5" />
          ) : status === "rejected" ? (
            <Ban className="size-3.5" />
          ) : (
            <Wrench className="size-3.5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span className="font-medium">{name}</span>
          <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Server className="size-2.5" />
            {serverName}
          </div>
        </div>

        {/* 상태 배지 */}
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            status === "pending" && "bg-amber-500/10 text-amber-600",
            status === "executing" && "bg-blue-500/10 text-blue-600",
            status === "completed" && "bg-green-500/10 text-green-600",
            status === "error" && "bg-red-500/10 text-red-600",
            status === "rejected" && "bg-muted text-muted-foreground"
          )}
        >
          {status === "pending" && "승인 대기"}
          {status === "executing" && "실행 중"}
          {status === "completed" && "완료"}
          {status === "error" && "오류"}
          {status === "rejected" && "거부됨"}
        </span>
      </div>

      {/* 인자 */}
      {args && Object.keys(args).length > 0 && (
        <JsonBlock data={args} label="입력" />
      )}

      {/* 결과 */}
      {status === "completed" && result !== undefined && (
        <ResultBlock data={result} />
      )}

      {/* 에러 */}
      {status === "error" && error && (
        <div className="mt-1.5">
          <span className="text-[11px] font-medium uppercase text-red-500">
            오류
          </span>
          <p className="mt-0.5 text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* 승인/거부 버튼 */}
      {status === "pending" && (
        <div className="mt-2.5 flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={onApprove}
            className="h-7 gap-1 text-xs"
          >
            <Check className="size-3" />
            승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="h-7 gap-1 text-xs"
          >
            <X className="size-3" />
            거부
          </Button>
        </div>
      )}
    </div>
  );
}
