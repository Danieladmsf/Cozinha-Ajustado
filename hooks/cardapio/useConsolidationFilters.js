import { useMemo } from 'react';
import { FILTER_OPTIONS } from '../../components/cardapio/consolidacao/constants';

/**
 * Hook para gerenciar filtros da consolidação de pedidos
 * Centraliza a lógica de filtragem em um local
 */
export const useConsolidationFilters = (orders, selectedDay, selectedCustomer, searchTerm) => {
  // Filtrar pedidos por dia e cliente com memoization otimizada
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    
    return orders.filter(order => {
      const dayMatch = order.day_of_week === selectedDay;
      const customerMatch = selectedCustomer === FILTER_OPTIONS.ALL_CUSTOMERS || order.customer_id === selectedCustomer;
      const searchMatch = searchTerm === "" || 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return dayMatch && customerMatch && searchMatch;
    });
  }, [orders, selectedDay, selectedCustomer, searchTerm]);

  // Estatísticas dos filtros aplicados
  const filterStats = useMemo(() => {
    const totalOrders = orders?.length || 0;
    const filteredCount = filteredOrders.length;
    const filterEfficiency = totalOrders > 0 ? (filteredCount / totalOrders) * 100 : 0;

    return {
      totalOrders,
      filteredCount,
      filterEfficiency: Math.round(filterEfficiency),
      isFiltered: selectedCustomer !== FILTER_OPTIONS.ALL_CUSTOMERS || searchTerm !== ""
    };
  }, [orders, filteredOrders, selectedCustomer, searchTerm]);

  return {
    filteredOrders,
    filterStats
  };
};