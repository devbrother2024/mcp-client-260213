"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-xl font-bold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-2 text-lg font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2 mb-1 text-base font-semibold">{children}</h3>
  ),

  // Paragraph
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

  // Lists
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,

  // Code
  code: ({ children, className }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className="bg-foreground/10 rounded px-1.5 py-0.5 text-[13px] font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="text-[13px] font-mono">{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-foreground/10 my-2 overflow-x-auto rounded-lg p-3 text-[13px] last:mb-0">
      {children}
    </pre>
  ),

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-foreground/20 my-2 border-l-2 pl-3 italic opacity-80">
      {children}
    </blockquote>
  ),

  // Table
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="border-foreground/20 min-w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-foreground/20 bg-foreground/5 border px-3 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-foreground/20 border px-3 py-1.5">{children}</td>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),

  // Horizontal rule
  hr: () => <hr className="border-foreground/20 my-3" />,

  // Strong & Emphasis
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
};

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
