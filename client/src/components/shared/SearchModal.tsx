import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMessages } from '../../services/searchService';
import { formatTimestamp } from '../../utils/formatters';
import type { SearchResult } from '../../types';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
}

export function SearchModal({ open, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchMessages(query.trim());
        setResults(data);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const confirm = useCallback(
    (result: SearchResult) => {
      onSelect(result);
      onClose();
    },
    [onSelect, onClose]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      confirm(results[selectedIndex]);
    }
  }

  function highlight(text: string, q: string) {
    if (!q.trim()) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase().trim());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-indigo-500/30 text-white rounded px-0.5">
          {text.slice(idx, idx + q.trim().length)}
        </mark>
        {text.slice(idx + q.trim().length)}
      </>
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          {loading && (
            <svg className="animate-spin w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-500 bg-gray-800 rounded border border-gray-700">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            results.map((result, i) => (
              <button
                key={result.id}
                data-index={i}
                onClick={() => confirm(result)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-800/50 last:border-0 ${
                  i === selectedIndex ? 'bg-indigo-600/20' : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-indigo-400"># {result.room_name}</span>
                  <span className="text-xs text-gray-500">·</span>
                  <span className="text-xs text-gray-400">{result.username}</span>
                  <span className="ml-auto text-xs text-gray-600">{formatTimestamp(result.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
                  {highlight(result.content, query)}
                </p>
              </button>
            ))
          ) : query.trim().length >= 2 && !loading ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-500">No results for <span className="text-gray-300">"{query}"</span></p>
            </div>
          ) : query.trim().length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-600">Type at least 2 characters to search</p>
            </div>
          ) : null}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-800 bg-gray-950/50">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-500 border border-gray-700">↑↓</kbd> navigate
            </span>
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-500 border border-gray-700">↵</kbd> open
            </span>
            <span className="ml-auto text-xs text-gray-600">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
