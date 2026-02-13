'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Loader2, ArrowUp } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ChatBubble } from '@/components/chat/chat-bubble'
import type { Message } from '@/hooks/use-chat'

interface ChatMessagesProps {
    messages: Message[]
    isLoading: boolean
    onApproveToolCall?: (messageId: string, toolCallId: string) => void
    onRejectToolCall?: (messageId: string, toolCallId: string) => void
}

export function ChatMessages({ messages, isLoading, onApproveToolCall, onRejectToolCall }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement>(null)
    const topSentinelRef = useRef<HTMLDivElement>(null)
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const [showScrollTop, setShowScrollTop] = useState(false)

    // IntersectionObserver로 topSentinel 가시성 추적
    useEffect(() => {
        const sentinel = topSentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            ([entry]) => setShowScrollTop(!entry.isIntersecting),
            { threshold: 0 },
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [messages])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, isLoading])

    const scrollToTop = () => {
        topSentinelRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="bg-muted rounded-full p-4">
                    <MessageSquare className="text-muted-foreground size-8" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-lg font-medium">대화를 시작하세요</h2>
                    <p className="text-muted-foreground text-sm">
                        메시지를 입력하여 AI와 대화할 수 있습니다.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollAreaRef as React.RefObject<HTMLDivElement>}>
                <div className="mx-auto max-w-3xl space-y-6 p-4">
                    <div ref={topSentinelRef} />

                    {messages.map(message => (
                        <ChatBubble
                            key={message.id}
                            message={message}
                            onApproveToolCall={(tcId) => onApproveToolCall?.(message.id, tcId)}
                            onRejectToolCall={(tcId) => onRejectToolCall?.(message.id, tcId)}
                        />
                    ))}

                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full">
                                <Loader2 className="size-4 animate-spin" />
                            </div>
                            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                    <span className="bg-foreground/30 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                                    <span className="bg-foreground/30 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                                    <span className="bg-foreground/30 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* 맨 위로 플로팅 버튼 */}
            <Button
                variant="outline"
                size="icon"
                onClick={scrollToTop}
                className={`fixed right-8 bottom-24 z-50 size-10 rounded-full border-border/60 bg-background/80 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-110 ${
                    showScrollTop
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-4 opacity-0'
                }`}
                aria-label="맨 위로 스크롤"
            >
                <ArrowUp className="size-4" />
            </Button>
        </div>
    )
}
