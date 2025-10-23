import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Order, Customer, Recipe } from "@/app/api/entities";
import { getWeek, getYear, startOfWeek, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useProgramacaoRealtimeData = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState({ initial: true, orders: false });
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'syncing' | 'disconnected' | 'connecting'
  const [customers, setCustomers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [orders, setOrders] = useState([]);

  // Refs para armazenar funções de unsubscribe
  const unsubscribeOrders = useRef(null);
  const unsubscribeCustomers = useRef(null);
  const unsubscribeRecipes = useRef(null);

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

  // Setup real-time listeners for customers and recipes (one time, don't change)
  useEffect(() => {
    setLoading(prev => ({ ...prev, initial: true }));
    setConnectionStatus('connecting');

    try {
      // Listen to customers in real-time
      unsubscribeCustomers.current = Customer.listen((customersData, error) => {
        if (error) {
          console.error('Erro ao ouvir customers:', error);
          setConnectionStatus('disconnected');
          return;
        }
        setCustomers(customersData);
      });

      // Listen to recipes in real-time
      unsubscribeRecipes.current = Recipe.listen((recipesData, error) => {
        if (error) {
          console.error('Erro ao ouvir recipes:', error);
          setConnectionStatus('disconnected');
          return;
        }
        setRecipes(recipesData);
      });

      setConnectionStatus('connected');
    } catch (error) {
      console.error('Erro ao configurar listeners:', error);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(prev => ({ ...prev, initial: false }));
    }

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      if (unsubscribeCustomers.current) {
        unsubscribeCustomers.current();
      }
      if (unsubscribeRecipes.current) {
        unsubscribeRecipes.current();
      }
    };
  }, []); // Empty dependency - setup once

  // Setup real-time listener for orders (changes when week/year changes)
  useEffect(() => {
    // Cleanup previous orders listener if exists
    if (unsubscribeOrders.current) {
      unsubscribeOrders.current();
    }

    setLoading(prev => ({ ...prev, orders: true }));
    setConnectionStatus('syncing');

    try {
      // Listen to orders for current week in real-time
      unsubscribeOrders.current = Order.listen(
        (ordersData, error) => {
          if (error) {
            console.error('Erro ao ouvir orders:', error);
            setConnectionStatus('disconnected');
            setOrders([]);
            setLoading(prev => ({ ...prev, orders: false }));
            return;
          }

          setOrders(ordersData);
          setConnectionStatus('connected');
          setLoading(prev => ({ ...prev, orders: false }));
        },
        [
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ]
      );
    } catch (error) {
      console.error('Erro ao configurar listener de orders:', error);
      setConnectionStatus('disconnected');
      setOrders([]);
      setLoading(prev => ({ ...prev, orders: false }));
    }

    // Cleanup function
    return () => {
      if (unsubscribeOrders.current) {
        unsubscribeOrders.current();
      }
    };
  }, [weekNumber, year]); // Re-setup listener when week or year changes

  const navigateWeek = (direction) => {
    setCurrentDate(prev => addDays(prev, direction * 7));
  };

  return {
    currentDate,
    weekDays,
    weekNumber,
    year,
    loading,
    connectionStatus,
    customers,
    recipes,
    orders,
    navigateWeek,
    // No need for refresh or loadOrdersForWeek - data updates automatically!
  };
};
