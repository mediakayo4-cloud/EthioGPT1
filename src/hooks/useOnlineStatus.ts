import { useCallback, useEffect, useState } from 'react';

export type ConnectionState = 'online' | 'offline' | 'api_error';

export function useOnlineStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [apiErrorStatus, setApiErrorStatus] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/health', {
        cache: 'no-store',
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!res.ok) {
        setConnectionState('api_error');
        setApiErrorStatus(res.status);
        return false;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setConnectionState('api_error');
        setApiErrorStatus(res.status);
        return false;
      }

      const data = (await res.json()) as { ok?: boolean };
      if (!data?.ok) {
        setConnectionState('api_error');
        setApiErrorStatus(res.status);
        return false;
      }

      setConnectionState('online');
      setApiErrorStatus(null);
      return true;
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setConnectionState('offline');
      } else {
        setConnectionState('api_error');
      }
      setApiErrorStatus(null);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkConnection();

    const handleOnline = () => {
      void checkConnection();
    };
    const handleOffline = () => {
      setConnectionState('offline');
      setApiErrorStatus(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return {
    isOnline: connectionState === 'online',
    connectionState,
    apiErrorStatus,
    isChecking,
    checkConnection,
  };
}
