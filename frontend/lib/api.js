const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

export async function api(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...(!isFormData && options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
    cache: 'no-store',
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const API_URL_PUBLIC = API_URL;
