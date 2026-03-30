import { useEffect, useRef, useCallback } from 'react';

const MIN_DELAY = 3000;
const MAX_DELAY = 30000;

export function useSocket(onMessage) {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const delayRef = useRef(MIN_DELAY);
  const timerRef = useRef(null);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const wsUrl = apiUrl.replace(/^http/, 'ws');

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      delayRef.current = MIN_DELAY; // reset backoff on successful connect
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessageRef.current(data);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      timerRef.current = setTimeout(() => {
        connect();
      }, delayRef.current);
      // Exponential backoff: double delay up to MAX_DELAY
      delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);
}
