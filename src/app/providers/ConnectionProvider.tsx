/**
 * ConnectionProvider — tracks online/offline state.
 * Shows status with text/icons, not colour alone.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface ConnectionContextValue {
  isOnline: boolean;
}

const ConnectionContext = createContext<ConnectionContextValue>({
  isOnline: true,
});

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ConnectionContext.Provider value={{ isOnline }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection(): ConnectionContextValue {
  return useContext(ConnectionContext);
}
