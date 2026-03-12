import apiClient from '../api/client';
import type { SearchResult } from '../types';

export async function searchMessages(q: string, limit = 20): Promise<SearchResult[]> {
  const res = await apiClient.get<SearchResult[]>('/rooms/search', {
    params: { q, limit },
  });
  return res.data;
}
