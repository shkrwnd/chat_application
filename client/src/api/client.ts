import axios from 'axios';
import { getToken } from '../utils/auth.utils';

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const apiClient = axios.create({
  baseURL: backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api',
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
