"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      {/* 설정 헤더 */}
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-2 px-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              <span className="sr-only">뒤로가기</span>
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">설정</h1>
        </div>
      </header>

      {/* 설정 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
