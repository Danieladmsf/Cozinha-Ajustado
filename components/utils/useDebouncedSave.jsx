import { useCallback, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

export function useDebouncedSave({ onSave, delay = 1500, debugLog }) {
  const saveTimerRef = useRef(null);
  const isDirtyRef = useRef(false);
  const dirtyDataRef = useRef(null);

  // Limpar timer no unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Função para salvar imediatamente
  const saveNow = useCallback(async () => {
    if (!isDirtyRef.current || !dirtyDataRef.current) return;

    try {
      if (debugLog) {
        debugLog('Salvando dados', {
          isDirty: isDirtyRef.current,
          data: dirtyDataRef.current
        });
      }

      await onSave(dirtyDataRef.current);
      isDirtyRef.current = false;
      dirtyDataRef.current = null;

    } catch (error) {
      // Log do erro e mantém dirty state para retry
      console.error('Erro ao salvar dados:', error);
      
      // Notificar usuário se callback de debug disponível
      if (debugLog) {
        debugLog('Erro ao salvar dados', { error: error.message });
      }
      
      // Manter dirty state para possível retry
      // isDirtyRef.current permanece true
    }
  }, [onSave, debugLog]);

  // Função para agendar salvamento com debounce
  const debouncedSave = useCallback((data) => {
    isDirtyRef.current = true;
    dirtyDataRef.current = data;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveNow();
    }, delay);
  }, [delay, saveNow]);

  return {
    debouncedSave,
    saveNow,
    isDirty: () => isDirtyRef.current
  };
}