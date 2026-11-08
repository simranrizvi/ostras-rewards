'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
export function usePagedResource(endpoint, { poll = false } = {}) {
  const [page, setPage] = useState(1);
  const [status, setStatusValue] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const result = await api(
        `${endpoint}?page=${page}&limit=10${status ? `&status=${status}` : ''}`,
      );
      if (id === request.current) {
        setData(result);
        setError('');
      }
    } catch (failure) {
      if (id === request.current) setError(failure.message);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [endpoint, page, status]);
  useEffect(() => {
    refresh();
    return () => {
      request.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (!poll) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [poll, refresh]);
  const setStatus = (value) => {
    setPage(1);
    setStatusValue(value);
  };
  return { data, error, loading, page, setPage, status, setStatus, refresh };
}
