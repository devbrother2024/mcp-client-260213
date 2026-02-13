"use client";

import { useState, useEffect } from "react";
import type {
  McpServerConfig,
  McpServerFormData,
  McpTransportType,
} from "@/lib/types/mcp-server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyValueEditor } from "@/components/settings/key-value-editor";

interface McpServerFormProps {
  /** 편집 시 기존 서버 데이터 */
  server?: McpServerConfig | null;
  onSave: (data: McpServerFormData) => string | null;
  onCancel: () => void;
}

function getDefaultFormData(): McpServerFormData {
  return {
    name: "",
    enabled: true,
    transport: "streamable-http",
    url: "",
    headers: {},
    command: "",
    args: [],
    env: {},
  };
}

function toFormData(server: McpServerConfig): McpServerFormData {
  return {
    name: server.name,
    enabled: server.enabled,
    transport: server.transport,
    url: server.url ?? "",
    headers: server.headers ?? {},
    command: server.command ?? "",
    args: server.args ?? [],
    env: server.env ?? {},
  };
}

export function McpServerForm({ server, onSave, onCancel }: McpServerFormProps) {
  const [form, setForm] = useState<McpServerFormData>(getDefaultFormData);
  const [argsText, setArgsText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!server;

  // 서버 변경 시 폼 초기화
  useEffect(() => {
    if (server) {
      setForm(toFormData(server));
      setArgsText(server.args?.join(", ") ?? "");
    } else {
      setForm(getDefaultFormData());
      setArgsText("");
    }
    setError(null);
  }, [server]);

  const updateField = <K extends keyof McpServerFormData>(
    key: K,
    value: McpServerFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleTransportChange = (value: McpTransportType) => {
    updateField("transport", value);
  };

  const handleArgsChange = (text: string) => {
    setArgsText(text);
    const args = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField("args", args);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = onSave(form);
    if (validationError) {
      setError(validationError);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isEditing ? "서버 편집" : "새 서버 추가"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 서버 이름 */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="server-name">서버 이름</Label>
            <Input
              id="server-name"
              placeholder="My MCP Server"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          {/* 전송 타입 */}
          <div className="flex flex-col gap-1.5">
            <Label>전송 타입</Label>
            <Select
              value={form.transport}
              onValueChange={handleTransportChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="streamable-http">
                  Streamable HTTP
                </SelectItem>
                <SelectItem value="stdio">stdio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* 전송 타입별 필드 */}
          {form.transport === "streamable-http" ? (
            <>
              {/* URL */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="server-url">URL</Label>
                <Input
                  id="server-url"
                  placeholder="https://example.com/mcp"
                  value={form.url ?? ""}
                  onChange={(e) => updateField("url", e.target.value)}
                />
              </div>

              {/* 커스텀 헤더 */}
              <KeyValueEditor
                label="커스텀 헤더"
                entries={form.headers ?? {}}
                onChange={(headers) => updateField("headers", headers)}
                keyPlaceholder="Header name"
                valuePlaceholder="Header value"
              />
            </>
          ) : (
            <>
              {/* Command */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="server-command">명령어 (Command)</Label>
                <Input
                  id="server-command"
                  placeholder="npx, node, python ..."
                  value={form.command ?? ""}
                  onChange={(e) => updateField("command", e.target.value)}
                />
              </div>

              {/* Args */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="server-args">인자 (Args)</Label>
                <Input
                  id="server-args"
                  placeholder="쉼표로 구분: -y, @modelcontextprotocol/server-filesystem"
                  value={argsText}
                  onChange={(e) => handleArgsChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  쉼표(,)로 구분하여 입력
                </p>
              </div>

              {/* 환경 변수 */}
              <KeyValueEditor
                label="환경 변수"
                entries={form.env ?? {}}
                onChange={(env) => updateField("env", env)}
                keyPlaceholder="변수 이름"
                valuePlaceholder="값"
              />
            </>
          )}

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit">{isEditing ? "저장" : "추가"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
