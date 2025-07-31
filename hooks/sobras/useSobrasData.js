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
      console.log('[SobrasData] Carregando dados estáticos...');
      
      const [customersData, recipesData] = await Promise.all([
        Customer.list(),
        Recipe.list()
      ]);

      setCustomers(customersData || []);
      setRecipes(recipesData || []);

      console.log('[SobrasData] Dados estáticos carregados:', {
        customers: customersData?.length || 0,
        recipes: recipesData?.length || 0
      });

    } catch (error) {
      console.error("Erro ao carregar dados estáticos:", error);
    }
  }, []);

  const loadWeekData = useCallback(async (date) => {
    try {
      setLoading(true);
      const { weekNumber, year } = getWeekInfo(date);
      
      console.log('[SobrasData] Carregando dados da semana:', { weekNumber, year });

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

      console.log('[SobrasData] Dados da semana carregados:', {
        weeklyMenus: weeklyMenusData?.length || 0,
        orders: ordersData?.length || 0,
        wasteRecords: wasteData?.length || 0
      });

    } catch (error) {
      console.error("Erro ao carregar dados da semana:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllWasteHistory = useCallback(async () => {
    try {
      console.log('[SobrasData] Carregando histórico completo de sobras...');
      
      const allWasteData = await OrderWaste.list();
      setWasteHistory(allWasteData || []);

      console.log('[SobrasData] Histórico completo carregado:', {
        totalWasteRecords: allWasteData?.length || 0
      });

    } catch (error) {
      console.error("Erro ao carregar histórico de sobras:", error);
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      await loadStaticData();
      await loadWeekData(currentDate);
    };

    loadInitialData();
  }, [loadStaticData, loadWeekData, currentDate]);

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