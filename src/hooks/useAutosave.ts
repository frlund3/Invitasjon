import { useState, useEffect, useRef, useCallback } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutosave<T>({ data, onSave, delay = 1000, enabled = true }: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const latestData = useRef(data);
  const latestOnSave = useRef(onSave);

  latestData.current = data;
  latestOnSave.current = onSave;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!enabled) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('saving');

    timerRef.current = setTimeout(async () => {
      try {
        await latestOnSave.current(latestData.current);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, delay, enabled]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('saving');
    try {
      await latestOnSave.current(latestData.current);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }, []);

  return { status, saveNow };
}
