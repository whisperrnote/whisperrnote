'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';
import NoteContentDisplay from '@/components/NoteContentDisplay';
import { LinkComponent } from '@/components/LinkRenderer';
import { preProcessMarkdown } from '@/lib/markdown';

interface NoteContentRendererProps {
  content?: string | null;
  format?: 'text' | 'doodle' | null;
  className?: string;
  textClassName?: string;
  doodleClassName?: string;
  emptyFallback?: React.ReactNode;
  preview?: boolean;
  onEditDoodle?: () => void;
}

const BASE_PROSE = 'prose prose-lg max-w-none dark:prose-invert [&>*]:leading-relaxed [&>p]:mb-6 [&>h1]:mb-8 [&>h1]:mt-8 [&>h2]:mb-6 [&>h2]:mt-7 [&>h3]:mb-4 [&>h3]:mt-6 [&>ul]:mb-6 [&>ol]:mb-6 [&>ol>li]:marker:font-bold [&>blockquote]:mb-6 [&>pre]:mb-6 [&>*:first-child]:mt-0 [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-4';

export function NoteContentRenderer({
  content,
  format = 'text',
  className = '',
  textClassName = '',
  doodleClassName = '',
  emptyFallback = <span className="italic text-muted">This note is empty.</span>,
  preview = false,
  onEditDoodle,
}: NoteContentRendererProps) {
  const noteFormat = format === 'doodle' ? 'doodle' : 'text';

  if (noteFormat === 'doodle') {
    return (
      <NoteContentDisplay
        content={content || ''}
        format="doodle"
        className={`${className} ${doodleClassName}`.trim()}
        preview={preview}
        onEditDoodle={onEditDoodle}
      />
    );
  }

  const trimmed = content?.trim();
  if (!trimmed) {
    return <div className={className}>{emptyFallback}</div>;
  }

  return (
    <div className={`${BASE_PROSE} ${className} ${textClassName}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: LinkComponent,
        }}
      >
        {preProcessMarkdown(trimmed)}
      </ReactMarkdown>
    </div>
  );
}

export default NoteContentRenderer;
