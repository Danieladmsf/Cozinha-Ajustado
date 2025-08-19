import { useState, useCallback, useRef } from 'react';
import { addDays } from 'date-fns';

/**
 * Hook para navegação unificada entre semana e dia
 * Resolve race conditions e inconsistências entre navegações
 */
export const useNavigationSync = (currentDate, setCurrentDate, selectedDay, setSelectedDay) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigationTimeout = useRef(null);

  /**
   * Navegar por semana de forma consistente
   * Evita race conditions ao sincronizar mudança de semana e dia
   */
  const navigateWeek = useCallback((direction) => {
    if (isNavigating) return; // Previne navegações múltiplas
    
    setIsNavigating(true);
    
    console.log(`🧭 NAVEGAÇÃO UNIFICADA: direction=${direction}, currentDay=${selectedDay}`);
    
    // Calcular nova data (mantém o dia selecionado)
    const newDate = addDays(currentDate, direction === 'next' ? 7 : -7);
    
    // Atualizar data (selectedDay permanece o mesmo)
    setCurrentDate(newDate);
    
    // Finalizar navegação após um pequeno delay
    navigationTimeout.current = setTimeout(() => {
      setIsNavigating(false);
      console.log(`✅ NAVEGAÇÃO FINALIZADA: Nova semana, dia=${selectedDay}`);
    }, 50);
    
  }, [currentDate, setCurrentDate, selectedDay, isNavigating]);

  /**
   * Navegar por dia de forma consistente
   * Mantém a semana atual, só muda o dia
   */
  const navigateDay = useCallback((dayNumber) => {
    if (isNavigating) return; // Bloqueia durante navegação de semana
    
    console.log(`📅 NAVEGAÇÃO DIA: de ${selectedDay} para ${dayNumber}`);
    setSelectedDay(dayNumber);
  }, [setSelectedDay, selectedDay, isNavigating]);

  /**
   * Detectar se está em processo de navegação
   */
  const isWeekNavigation = isNavigating;

  return {
    navigateWeek,
    navigateDay, 
    isWeekNavigation
  };
};