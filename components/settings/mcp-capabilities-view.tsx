"use client";

import { Wrench, MessageSquare, FileText, ChevronDown } from "lucide-react";
import type { McpServerCapabilities } from "@/lib/types/mcp-server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface McpCapabilitiesViewProps {
  capabilities: McpServerCapabilities;
}

function CollapsibleSection({
  title,
  icon: Icon,
  count,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 py-2 text-left text-sm font-medium hover:text-foreground/80"
      >
        <Icon className="size-4 text-muted-foreground" />
        <span>{title}</span>
        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
          {count}
        </Badge>
        <ChevronDown
          className={cn(
            "ml-auto size-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

export function McpCapabilitiesView({
  capabilities,
}: McpCapabilitiesViewProps) {
  const { tools, prompts, resources } = capabilities;
  const isEmpty =
    tools.length === 0 && prompts.length === 0 && resources.length === 0;

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            이 서버에서 제공하는 capabilities가 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Capabilities</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {/* Tools */}
        {tools.length > 0 && (
          <CollapsibleSection title="Tools" icon={Wrench} count={tools.length}>
            <div className="flex flex-col gap-1.5 pl-6">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-semibold">{tool.name}</code>
                  </div>
                  {tool.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  )}
                  {tool.inputSchema && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                        입력 스키마
                      </summary>
                      <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-[11px]">
                        {JSON.stringify(tool.inputSchema, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Prompts */}
        {prompts.length > 0 && (
          <CollapsibleSection
            title="Prompts"
            icon={MessageSquare}
            count={prompts.length}
          >
            <div className="flex flex-col gap-1.5 pl-6">
              {prompts.map((prompt) => (
                <div
                  key={prompt.name}
                  className="rounded-md border px-3 py-2"
                >
                  <code className="text-xs font-semibold">{prompt.name}</code>
                  {prompt.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {prompt.description}
                    </p>
                  )}
                  {prompt.arguments && prompt.arguments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {prompt.arguments.map((arg) => (
                        <Badge
                          key={arg.name}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {arg.name}
                          {arg.required && (
                            <span className="text-destructive">*</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Resources */}
        {resources.length > 0 && (
          <CollapsibleSection
            title="Resources"
            icon={FileText}
            count={resources.length}
          >
            <div className="flex flex-col gap-1.5 pl-6">
              {resources.map((resource) => (
                <div
                  key={resource.uri}
                  className="rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-semibold">
                      {resource.name}
                    </code>
                    {resource.mimeType && (
                      <Badge
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {resource.mimeType}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {resource.uri}
                  </p>
                  {resource.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {resource.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </CardContent>
    </Card>
  );
}
