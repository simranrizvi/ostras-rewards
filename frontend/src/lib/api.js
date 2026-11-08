const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:4100');

export async function api(path, options = {}) {
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(!isFormData && options.body
        ? { 'content-type': 'application/json' }
        : {}),
      ...options.headers,
    },
    cache: 'no-store',
    signal: options.signal || AbortSignal.timeout(65000),
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.error || 'Something went wrong. Please try again.',
    );
    error.status = response.status;
    error.requestId = data.requestId;
    if (response.status === 401 && typeof window !== 'undefined')
      window.dispatchEvent(new Event('ostras:unauthorized'));
    throw error;
  }
  return data;
}

export const API_URL_PUBLIC = API_URL;
