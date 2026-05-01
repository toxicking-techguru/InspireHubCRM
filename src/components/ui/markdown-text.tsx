import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownTextProps {
  content: string;
  className?: string;
}

/**
 * A lightweight Markdown-like renderer for basic CRM formatting.
 * Supports: **bold**, _italics_, and - bullets.
 */
export function MarkdownText({ content, className }: MarkdownTextProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className={cn("space-y-1", className)}>
      {lines.map((line, i) => {
        // Basic detection for bullets
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith('- ');
        const cleanLine = isBullet ? trimmed.substring(2) : line;

        // Inline formatting: **bold** and _italics_
        const parts = cleanLine.split(/(\*\*.*?\*\*|_.*?_)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('_') && part.endsWith('_')) {
            return (
              <em key={j} className="italic">
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex gap-2 pl-1 items-start">
              <span className="text-primary mt-1">•</span>
              <div className="flex-1">{parts}</div>
            </div>
          );
        }

        // Return empty line spacer if line is empty
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }

        return <div key={i} className="min-h-[1.2em]">{parts}</div>;
      })}
    </div>
  );
}
