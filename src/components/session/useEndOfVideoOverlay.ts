import { useCallback, useEffect, useRef, useState } from 'react';
import { NEXT_SESSION_COUNTDOWN_SECONDS, type NextSessionInfo } from './NextSessionOverlay';

export function useEndOfVideoOverlay(nextSession: NextSessionInfo | null, onNextSession: () => void) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState(NEXT_SESSION_COUNTDOWN_SECONDS);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const openOverlay = useCallback(() => {
    setShowOverlay(true);
    setCountdown(NEXT_SESSION_COUNTDOWN_SECONDS);
  }, []);

  const handleCancel = useCallback(() => {
    setShowOverlay(false);
    setCountdown(NEXT_SESSION_COUNTDOWN_SECONDS);
    clearCountdown();
  }, [clearCountdown]);

  const handleStartNow = useCallback(() => {
    setShowOverlay(false);
    clearCountdown();
    onNextSession();
  }, [clearCountdown, onNextSession]);

  useEffect(() => {
    if (!showOverlay) {
      clearCountdown();
      return;
    }
    if (!nextSession) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          onNextSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearCountdown;
  }, [showOverlay, nextSession, onNextSession, clearCountdown]);

  return { showOverlay, countdown, openOverlay, handleCancel, handleStartNow };
}
