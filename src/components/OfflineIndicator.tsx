import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  message: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ message }) => {
  const { isOnline, connectionState, apiErrorStatus, isChecking, checkConnection } =
    useOnlineStatus();

  if (isOnline) return null;

  const isOffline = connectionState === 'offline';
  const displayMessage = isOffline
    ? message
    : `Unable to reach the EthioGPT AI backend${
        apiErrorStatus ? ` (HTTP ${apiErrorStatus})` : ''
      }. Your internet is connected, but the server endpoint did not respond properly.`;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-2.5 border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-center gap-2 text-center">
        {isOffline ? (
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        )}
        <span>{displayMessage}</span>
      </div>
      <button
        type="button"
        onClick={() => void checkConnection()}
        disabled={isChecking}
        className="inline-flex items-center gap-1 rounded-lg border border-amber-600/30 bg-amber-600/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-amber-600/25 disabled:opacity-60 transition-colors"
      >
        <RefreshCw className={`h-3 w-3 ${isChecking ? 'animate-spin' : ''}`} />
        <span>{isChecking ? 'Checking...' : 'Try Again'}</span>
      </button>
    </div>
  );
};
