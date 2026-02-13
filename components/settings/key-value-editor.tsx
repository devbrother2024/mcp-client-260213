"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyValueEditorProps {
  label: string;
  entries: Record<string, string>;
  onChange: (entries: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  label,
  entries,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: KeyValueEditorProps) {
  const pairs = Object.entries(entries);

  const handleAdd = () => {
    onChange({ ...entries, "": "" });
  };

  const handleRemove = (key: string) => {
    const next = { ...entries };
    delete next[key];
    onChange(next);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(entries)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...entries, [key]: value });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button type="button" variant="ghost" size="icon-xs" onClick={handleAdd}>
          <Plus className="size-3.5" />
        </Button>
      </div>
      {pairs.length === 0 ? (
        <p className="text-xs text-muted-foreground">항목이 없습니다.</p>
      ) : (
        pairs.map(([key, value], idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              className="h-8 flex-1 text-sm"
              placeholder={keyPlaceholder}
              value={key}
              onChange={(e) => handleKeyChange(key, e.target.value)}
            />
            <Input
              className="h-8 flex-1 text-sm"
              placeholder={valuePlaceholder}
              value={value}
              onChange={(e) => handleValueChange(key, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(key)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
