import { useCallback } from 'react';
import { getWeek, getYear, format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const useSobrasHelpers = () => {
  
  const getWeekNumber = useCallback((date) => {
    return getWeek(date, { weekStartsOn: 1 });
  }, []);

  const getYear = useCallback((date) => {
    return getYear(date);
  }, []);

  const formatDate = useCallback((date, formatStr = 'dd/MM/yyyy') => {
    return format(date, formatStr, { locale: ptBR });
  }, []);

  const getWeekDays = useCallback((currentDate) => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = [];
    
    for (let i = 0; i < 5; i++) {
      const date = addDays(weekStart, i);
      days.push({
        date,
        dayNumber: i + 1,
        dayName: format(date, 'EEEE', { locale: ptBR }),
        shortDayName: format(date, 'EEE', { locale: ptBR }),
        formattedDate: format(date, 'dd/MM')
      });
    }
    
    return days;
  }, []);

  const filterCustomers = useCallback((customers, searchTerm) => {
    if (!searchTerm) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(term) ||
      customer.company?.toLowerCase().includes(term)
    );
  }, []);

  const calculateWasteMetrics = useCallback((wasteHistory, filters = {}) => {
    if (!wasteHistory || wasteHistory.length === 0) {
      return {
        totalWasteValue: 0,
        totalDiscountApplied: 0,
        averageWastePercentage: 0,
        itemsCount: 0
      };
    }

    let filteredWastes = wasteHistory;

    // Aplicar filtros se fornecidos
    if (filters.customerId) {
      filteredWastes = filteredWastes.filter(w => w.customer_id === filters.customerId);
    }
    if (filters.weekNumber) {
      filteredWastes = filteredWastes.filter(w => w.week_number === filters.weekNumber);
    }
    if (filters.year) {
      filteredWastes = filteredWastes.filter(w => w.year === filters.year);
    }

    const totalWasteValue = filteredWastes.reduce((sum, waste) => sum + (waste.total_original_value_of_waste || 0), 0);
    const totalDiscountApplied = filteredWastes.reduce((sum, waste) => sum + (waste.total_discount_value_applied || 0), 0);
    const itemsCount = filteredWastes.reduce((sum, waste) => sum + (waste.items?.length || 0), 0);

    const averageWastePercentage = filteredWastes.length > 0 
      ? (totalDiscountApplied / Math.max(totalWasteValue, 1)) * 100
      : 0;

    return {
      totalWasteValue,
      totalDiscountApplied,
      averageWastePercentage,
      itemsCount,
      recordsCount: filteredWastes.length
    };
  }, []);

  return {
    getWeekNumber,
    getYear,
    formatDate,
    getWeekDays,
    filterCustomers,
    calculateWasteMetrics
  };
};