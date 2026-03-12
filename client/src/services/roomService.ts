import apiClient from '../api/client';
import type { Room } from '../types';

export async function getRooms(): Promise<Room[]> {
  const res = await apiClient.get<Room[]>('/rooms');
  return res.data;
}

export async function createRoom(name: string, description?: string): Promise<Room> {
  const res = await apiClient.post<Room>('/rooms', { name, description });
  return res.data;
}
