import type { LinkPreview } from '../../services/linkPreviewService';

interface LinkPreviewCardProps {
  url: string;
  preview: LinkPreview;
}

export function LinkPreviewCard({ url, preview }: LinkPreviewCardProps) {
  if (!preview.title && !preview.description && !preview.image) return null;

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex gap-3 bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors max-w-sm"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          className="w-20 h-20 object-cover flex-shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="flex flex-col justify-center py-2 pr-3 min-w-0">
        <span className="text-[11px] text-indigo-400 truncate">{hostname}</span>
        {preview.title && (
          <span className="text-xs font-semibold text-white truncate mt-0.5">{preview.title}</span>
        )}
        {preview.description && (
          <span className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{preview.description}</span>
        )}
      </div>
    </a>
  );
}
