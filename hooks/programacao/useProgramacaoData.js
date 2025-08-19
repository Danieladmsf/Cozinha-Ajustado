
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Order, Customer, Recipe } from "@/app/api/entities";
import { getWeek, getYear, startOfWeek, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useProgramacaoData = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState({ initial: true, orders: false });
  const [customers, setCustomers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersCache, setOrdersCache] = useState(new Map());

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekNumber = useMemo(() => getWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const year = useMemo(() => getYear(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        dayNumber: i + 1,
        dayName: format(date, 'EEEE', { locale: ptBR }),
        dayShort: format(date, 'EEE', { locale: ptBR }),
        dayDate: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR })
      };
    });
  }, [weekStart]);

  const loadInitialData = useCallback(async () => {
    setLoading(prev => ({ ...prev, initial: true }));
    try {
      const [customersData, recipesData] = await Promise.all([
        Customer.list(),
        Recipe.list()
      ]);
      setCustomers(customersData);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }
  }, []);

  const loadOrdersForWeek = useCallback(async (week, year) => {
    const cacheKey = `${week}-${year}`;
    if (ordersCache.has(cacheKey)) {
      setOrders(ordersCache.get(cacheKey));
      return;
    }

    setLoading(prev => ({ ...prev, orders: true }));
    try {
      const ordersData = await Order.query([
        { field: 'week_number', operator: '==', value: week },
        { field: 'year', operator: '==', value: year }
      ]);
      setOrders(ordersData);
      setOrdersCache(prev => new Map(prev).set(cacheKey, ordersData));
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setOrders([]);
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  }, [ordersCache]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const navigateWeek = (direction) => {
    setCurrentDate(prev => addDays(prev, direction * 7));
  };

  return {
    currentDate,
    weekDays,
    weekNumber,
    year,
    loading,
    customers,
    recipes,
    orders,
    navigateWeek,
    loadOrdersForWeek,
    refreshData: () => {
        setOrdersCache(new Map());
        loadOrdersForWeek(weekNumber, year);
    }
  };
};
