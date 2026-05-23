/**
 * Manages a locally-optimistic numeric value that debounces writes to the DB.
 *
 * - `localValue` is updated immediately on every stepper click so the UI
 *   feels instant.
 * - `onChange` (the DB write) is only called once, `delay` ms after the
 *   last click. This collapses rapid +/− taps into a single Firestore write.
 * - When a new `serverValue` arrives (Firestore snapshot) and no write is
 *   pending, `localValue` is synced to keep the UI consistent.
 */
import { useState, useEffect, useRef } from 'react';

export function useDebouncedStepper(
  serverValue: number | null,
  onChange: (value: number) => void,
  delay = 800,
) {
  const [localValue, setLocalValue] = useState<number | null>(serverValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  // Sync from server when no local edit is pending
  useEffect(() => {
    if (!pendingRef.current) {
      setLocalValue(serverValue);
    }
  }, [serverValue]);

  // Cancel timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function update(next: number) {
    setLocalValue(next);
    pendingRef.current = true;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pendingRef.current = false;
      timerRef.current = null;
      onChange(next);
    }, delay);
  }

  return { localValue, update };
}
