import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { cn } from "@/lib/utils";
import type { Message } from "@/hooks/use-chat";

interface ChatBubbleProps {
  message: Message;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
    >
      <Avatar size="default">
        <AvatarFallback
          className={cn(
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn("flex max-w-[75%] flex-col gap-1", isUser && "items-end")}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-sm max-w-none">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>
        <span className="text-muted-foreground px-1 text-[11px]">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
