import apiClient from '../api/client';
import type { Message } from '../types';

export async function getMessages(roomId: string, limit = 50): Promise<Message[]> {
  const res = await apiClient.get<Message[]>(`/rooms/${roomId}/messages`, {
    params: { limit },
  });
  return res.data;
}
