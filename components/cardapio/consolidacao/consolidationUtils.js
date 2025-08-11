import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WEEK_CONFIG, DAY_NAMES } from './constants';

/**
 * Utilitários específicos para consolidação de pedidos
 */

/**
 * Gera os dias da semana baseado na data de início
 * @param {Date} weekStart - Data de início da semana
 * @returns {Array} Array com informações dos dias da semana
 */
export const generateWeekDays = (weekStart) => {
  const days = [];
  
  for (let i = 0; i < WEEK_CONFIG.WORKING_DAYS; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    
    days.push({
      date,
      dayNumber: i + 1,
      dayName: format(date, 'EEEE', { locale: ptBR }),
      dayShort: format(date, 'EEE', { locale: ptBR }),
      dayDate: format(date, 'dd/MM', { locale: ptBR }),
      fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR }),
      displayName: DAY_NAMES[i + 1] || format(date, 'EEEE', { locale: ptBR })
    });
  }
  
  return days;
};

/**
 * Calcula totais de um pedido com validação
 * @param {Object} order - Objeto do pedido
 * @returns {Object} Totais validados
 */
export const calculateOrderTotals = (order) => {
  const parseValue = (value) => {
    const num = parseFloat(value);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  return {
    meals: parseValue(order.total_meals_expected),
    amount: parseValue(order.original_amount) || parseValue(order.total_amount),
    items: parseValue(order.total_items)
  };
};

/**
 * Calcula totais para múltiplos pedidos
 * @param {Array} orders - Array de pedidos
 * @returns {Object} Totais consolidados
 */
export const calculateMultipleOrderTotals = (orders) => {
  if (!Array.isArray(orders)) return { meals: 0, amount: 0, items: 0 };
  
  return orders.reduce(
    (totals, order) => {
      const orderTotals = calculateOrderTotals(order);
      return {
        meals: totals.meals + orderTotals.meals,
        amount: totals.amount + orderTotals.amount,
        items: totals.items + orderTotals.items
      };
    },
    { meals: 0, amount: 0, items: 0 }
  );
};

/**
 * Valida se um pedido tem dados essenciais
 * @param {Object} order - Objeto do pedido
 * @returns {boolean} True se válido
 */
export const validateOrder = (order) => {
  return !!(
    order &&
    order.customer_id &&
    order.customer_name &&
    typeof order.day_of_week === 'number' &&
    order.day_of_week >= 1 &&
    order.day_of_week <= WEEK_CONFIG.WORKING_DAYS
  );
};

/**
 * Valida se um item tem dados essenciais
 * @param {Object} item - Objeto do item
 * @returns {boolean} True se válido
 */
export const validateItem = (item) => {
  return !!(
    item &&
    (item.recipe_id || item.recipe_name) &&
    item.quantity !== undefined &&
    item.quantity !== null
  );
};

/**
 * Gera chave única para um item
 * @param {Object} item - Objeto do item
 * @returns {string} Chave única
 */
export const generateItemKey = (item) => {
  return item.unique_id || `${item.recipe_id || 'no-id'}_${item.recipe_name || 'no-name'}`;
};

/**
 * Formata timestamp para impressão
 * @returns {string} Data/hora formatada
 */
export const getFormattedTimestamp = () => {
  return format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};