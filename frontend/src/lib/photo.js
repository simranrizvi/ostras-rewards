import { API_URL_PUBLIC } from './api';
export function photoUrl(value) {
  return value?.startsWith('/api/') ? `${API_URL_PUBLIC}${value}` : value;
}
