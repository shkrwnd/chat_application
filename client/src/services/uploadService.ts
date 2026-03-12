import apiClient from '../api/client';
import type { Attachment } from '../types';

export async function uploadFile(file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<Attachment>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
