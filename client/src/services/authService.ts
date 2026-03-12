import apiClient from '../api/client';
import type { AuthResponse, LoginPayload } from '../types';

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', payload);
  return res.data;
}

export async function register(payload: { username: string; password: string }): Promise<void> {
  await apiClient.post('/auth/register', payload);
}
