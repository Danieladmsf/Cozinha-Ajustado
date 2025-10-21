import { useState, useEffect, useCallback } from 'react';
import { Customer, Recipe, WeeklyMenu, Order, OrderWaste } from "@/app/api/entities";
import { getWeekInfo } from "../shared/weekUtils";

export const useSobrasData = (currentDate) => {
  const [customers, setCustomers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [weeklyMenus, setWeeklyMenus] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wasteHistory, setWasteHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStaticData = useCallback(async () => {
    try {
      const [customersData, recipesData] = await Promise.all([
        Customer.list(),
        Recipe.list()
      ]);

      setCustomers(customersData || []);
      setRecipes(recipesData || []);

    } catch (error) {
      // Erro ao carregar dados estáticos
    }
  }, []);

  const loadWeekData = useCallback(async (date) => {
    try {
      setLoading(true);
      const { weekNumber, year } = getWeekInfo(date);
      
      const [weeklyMenusData, ordersData, wasteData] = await Promise.all([
        WeeklyMenu.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ]),
        Order.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ]),
        OrderWaste.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ])
      ]);

      setWeeklyMenus(weeklyMenusData || []);
      setOrders(ordersData || []);
      setWasteHistory(wasteData || []);

    } catch (error) {
      // Erro ao carregar dados da semana
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllWasteHistory = useCallback(async () => {
    try {
      const allWasteData = await OrderWaste.list();
      setWasteHistory(allWasteData || []);

    } catch (error) {
      // Erro ao carregar histórico de sobras
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      await loadStaticData();
      await loadWeekData(currentDate);
    };

    loadInitialData();
  }, [currentDate]);

  // Função para recarregar todos os dados
  const refreshAllData = useCallback(async () => {
    await loadStaticData();
    await loadWeekData(currentDate);
  }, [loadStaticData, loadWeekData, currentDate]);

  return {
    customers,
    recipes,
    weeklyMenus,
    orders,
    wasteHistory,
    loading,
    loadWeekData,
    loadAllWasteHistory,
    refreshAllData
  };
};