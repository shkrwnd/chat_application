import apiClient from '../api/client';

export interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
}

// Simple in-session cache
const previewCache = new Map<string, LinkPreview>();

export async function getLinkPreview(url: string): Promise<LinkPreview> {
  if (previewCache.has(url)) return previewCache.get(url)!;
  const res = await apiClient.get<LinkPreview>('/link-preview', { params: { url } });
  previewCache.set(url, res.data);
  return res.data;
}

// Extract the first http(s) URL from a string
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : null;
}
