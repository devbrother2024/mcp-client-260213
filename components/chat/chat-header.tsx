import { Bot, RotateCcw, PanelLeftClose, PanelLeft, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onClear: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  hasMessages: boolean;
}

export function ChatHeader({
  onClear,
  onNewChat,
  onToggleSidebar,
  sidebarOpen,
  hasMessages,
}: ChatHeaderProps) {
  return (
    <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
            <span className="sr-only">사이드바 토글</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={onNewChat}>
            <SquarePen className="size-4" />
            <span className="sr-only">새 대화</span>
          </Button>

          <div className="ml-1 flex items-center gap-2">
            <Bot className="text-primary size-5" />
            <h1 className="text-lg font-semibold">AI Chat</h1>
          </div>
        </div>

        {hasMessages && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <RotateCcw className="size-4" />
            초기화
          </Button>
        )}
      </div>
    </header>
  );
}
