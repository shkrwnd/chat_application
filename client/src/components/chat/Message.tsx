import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Avatar } from '../ui/avatar';
import { formatTimestamp } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { resolveBackendUrl } from '../../utils/backendUrl';
import { LinkPreviewCard } from './LinkPreviewCard';
import { extractFirstUrl, getLinkPreview, type LinkPreview } from '../../services/linkPreviewService';
import type { Message as MessageType } from '../../types';

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
  isGrouped: boolean;
  highlighted?: boolean;
  readers?: string[]; // usernames who last-read this message
}

const mdComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-400 hover:underline"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code className="bg-gray-700 text-indigo-300 rounded px-1 py-0.5 text-xs font-mono" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="bg-gray-900 rounded-lg p-3 my-1 overflow-x-auto text-xs font-mono text-gray-300" {...props}>
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-gray-600 pl-3 my-1 text-gray-400 italic" {...props}>
      {children}
    </blockquote>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside my-1 space-y-0.5" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside my-1 space-y-0.5" {...props}>{children}</ol>
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-white" {...props}>{children}</strong>
  ),
};

export function Message({ message, isOwn, isGrouped, highlighted, readers = [] }: MessageProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);

  useEffect(() => {
    if (!highlighted) return;
    setIsHighlighted(true);
    const t = setTimeout(() => setIsHighlighted(false), 2000);
    return () => clearTimeout(t);
  }, [highlighted]);

  useEffect(() => {
    const url = extractFirstUrl(message.content);
    if (!url) return;
    let cancelled = false;
    getLinkPreview(url).then((p) => {
      if (!cancelled && (p.title || p.description || p.image)) setLinkPreview(p);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [message.content]);

  const hasAttachments = (message.attachments?.length ?? 0) > 0;
  const linkUrl = extractFirstUrl(message.content);

  return (
    <div
      data-message-id={message.id}
      className={cn(
        'flex gap-3 px-4 transition-colors duration-500',
        isGrouped ? 'pt-0.5' : 'pt-4',
        isHighlighted && 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/20 rounded-lg mx-2'
      )}
    >
      <div className="w-8 flex-shrink-0 flex items-start pt-0.5">
        {!isGrouped && <Avatar username={message.username} size="md" />}
      </div>
      <div className="flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`text-sm font-semibold ${isOwn ? 'text-indigo-400' : 'text-white'}`}>
              {message.username}
            </span>
            <span className="text-xs text-gray-600">{formatTimestamp(message.created_at)}</span>
          </div>
        )}

        {/* Message content — rendered as markdown */}
        {message.content && (
          <div className="text-sm text-gray-300 leading-relaxed break-words prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={mdComponents}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments!.map((att, i) =>
              att.type.startsWith('image/') ? (
                <a key={i} href={resolveBackendUrl(att.url)} target="_blank" rel="noopener noreferrer">
                  <img
                    src={resolveBackendUrl(att.url)}
                    alt={att.filename}
                    className="max-w-xs max-h-48 rounded-lg border border-gray-700 object-cover hover:border-gray-500 transition-colors"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </a>
              ) : (
                <a
                  key={i}
                  href={resolveBackendUrl(att.url)}
                  download={att.filename}
                  className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <span className="truncate max-w-[200px]">{att.filename}</span>
                </a>
              )
            )}
          </div>
        )}

        {/* Link preview */}
        {linkPreview && linkUrl && (
          <LinkPreviewCard url={linkUrl} preview={linkPreview} />
        )}

        {/* Read receipts — show whose last-read was this message */}
        {readers.length > 0 && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-[10px] text-gray-600">Seen</span>
            <div className="flex -space-x-1">
              {readers.slice(0, 4).map((username) => (
                <Avatar
                  key={username}
                  username={username}
                  size="sm"
                  className="w-3.5 h-3.5 text-[8px] ring-1 ring-gray-900"
                />
              ))}
            </div>
            {readers.length > 4 && (
              <span className="text-[10px] text-gray-600">+{readers.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
