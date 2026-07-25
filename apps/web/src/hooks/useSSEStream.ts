import { useState, useEffect, useCallback, useRef } from 'react';

interface SSEStreamResult<T> {
  events: T[];
  isConnected: boolean;
  error: Error | null;
  connect: (url: string) => void;
  disconnect: () => void;
}

export function useSSEStream<T>(): SSEStreamResult<T> {
  const [events, setEvents] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback((url: string) => {
    disconnect();
    setError(null);
    setEvents([]);

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data) as T;
          setEvents((prev) => [...prev, parsedData]);
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      es.onerror = (err) => {
        console.error('SSE Error:', err);
        setError(new Error('SSE connection error'));
        setIsConnected(false);
        // EventSource typically auto-reconnects, but you could handle explicit reconnect logic here
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create EventSource'));
      setIsConnected(false);
    }
  }, [disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { events, isConnected, error, connect, disconnect };
}
