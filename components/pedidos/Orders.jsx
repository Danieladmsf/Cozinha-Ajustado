'use client';


import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, startOfWeek, getWeek, getYear, addDays, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Entities
import { Customer } from "@/app/api/entities";
import { Recipe } from "@/app/api/entities";
import { WeeklyMenu } from "@/app/api/entities";
import { Order } from "@/app/api/entities";
import { OrderWaste } from "@/app/api/entities";

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Icons
import {
  Search,
  Calendar,
  ShoppingCart,
  Circle,
  Info,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText, // Adicionar FileText
  Loader2 // Para ícone de carregamento
} from "lucide-react";

// Components
import WasteRegister from "@/components/pedidos/WasteRegister";
import CustomerSelector from "@/components/pedidos/CustomerSelector";
import OrderItems from "@/components/pedidos/OrderItems";
import { Label } from "@/components/ui/label";
import PeriodReportDialog from "@/components/pedidos/PeriodReportDialog"; // Importar o novo componente

// Utilitários agora de components/utils/
import { 
  parseQuantity as utilParseQuantity, 
  formattedQuantity as utilFormattedQuantity, 
  normalizeOrderItems as utilNormalizeOrderItems, 
  formatCurrency as utilFormatCurrency, 
  formatWeight as utilFormatWeight, 
  calculateItemTotalWeight as utilCalculateItemTotalWeight 
} from "@/components/utils/orderUtils"; 
import { 
  generateDisplayOrder, 
  determineSaveAction,
  applyOrderUpdates 
} from "@/components/utils/orderCoreLogic"; 
import { generatePeriodReport } from "@/app/api/functions"; // Importar a função de backend

// Função utilitária para validar e tratar datas
const validateDate = (date, context = 'unknown') => {
  try {
    if (!date) {
      return new Date();
    }
    
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else {
      return new Date();
    }
    
    if (isNaN(dateObj.getTime())) {
      return new Date();
    }
    
    return dateObj;
  } catch (error) {
    console.error(`[validateDate] Erro ao validar data no contexto: ${context}. Usando data atual como fallback.`, { originalDate: date, error });
    return new Date();
  }
};

// Função para formatar datas de forma segura
const safeFormatDate = (date, formatStr, context = 'unknown') => {
  try {
    const validDate = validateDate(date, formatStr, context); // Pass formatStr as second arg to validateDate
    return format(validDate, formatStr, { locale: ptBR }); // Adicionar locale para format
  } catch (error) {
    console.error(`[safeFormatDate] Erro ao formatar data no contexto: ${context}`, { date, formatStr, error });
    return 'Data Inválida';
  }
};

const debugLog = (message, data, type = 'DEBUG') => {
  // Remover todos os logs de debug em produção
};

const orderValueLog = (message, data) => {
  // Manter apenas logs críticos de valor do pedido se necessário
};


// Improved helper for retry with exponential backoff and jitter
const retryWithDelay = async (fn, retries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error?.response?.status === 429 && attempt < retries - 1) {
        // Exponential backoff with jitter to avoid thundering herd
        const jitter = Math.random() * 200;
        const delay = (baseDelay * Math.pow(2, attempt)) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Maximum retry attempts exceeded');
};

// Helper function for deep comparison - pode ser melhorada se necessário
const deepCompare = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

// Helper para comparar arrays, útil para listas de entidades
const deepCompareArrays = (arr1, arr2) => {
  if (!arr1 && !arr2) return true;
  if ((!arr1 && arr2) || (arr1 && !arr2)) return false;
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (!deepCompare(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};

// Helper function to safely parse numeric input, handling commas and ensuring a number
const validateNumericInput = (value, defaultValue = 0) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

export default function Orders() {
  const { toast } = useToast();
  
  // 1. ESTADOS (useState)
  // Garantir que currentDate sempre seja uma data válida
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    debugLog('[Orders] Inicializando currentDate', { initialDate: now });
    return now;
  });
  const [currentDay, setCurrentDay] = useState(1); // 1 = Segunda, 5 = Sexta
  
  // Dados principais
  const [customers, setCustomers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [weeklyMenus, setWeeklyMenus] = useState([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [currentOrder, setCurrentOrder] = useState(null);
  
  // Estado para controle de edição atual
  const [editingItem, setEditingItem] = useState({ index: null, field: null, value: '' });

  // Estado para controlar se há alterações aguardando salvamento
  const [isDirty, setIsDirty] = useState(false);

  const [currentTab, setCurrentTab] = useState("orders"); // "orders" ou "waste"

  // Estado para registro de sobras
  const [wasteRecords, setWasteRecords] = useState({});

  // Estado para histórico de pedidos
  const [customerOrderHistory, setCustomerOrderHistory] = useState([]);

  // Estado para histórico de todos os pedidos
  const [allOrdersHistory, setAllOrdersHistory] = useState([]);

  // Estado para histórico completo de sobras
  const [allWasteHistory, setAllWasteHistory] = useState([]);

  // Estado para controlar se o salvamento está em andamento
  const [saving, setSaving] = useState(false);
  
  // Estados para o relatório
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // 2. REFS
  const dirtyOrderRef = useRef(null);
  const debouncedSave = useRef(null);
  const quantityInputRefs = useRef({});
  const portioningInputRefs = useRef({}); // Added for portioning
  const lastManualSaveTimestampRef = useRef(0);
  
  // 3. VALORES MEMORIZADOS (useMemo)
  const weekStart = useMemo(() => {
    try {
      const validCurrentDate = validateDate(currentDate, 'weekStart calculation');
      const result = startOfWeek(validCurrentDate, { weekStartsOn: 1 });
      debugLog('[Orders] weekStart calculado', { currentDate: validCurrentDate, weekStart: result });
      return result;
    } catch (error) {
      console.error('[Orders] Erro ao calcular weekStart:', error);
      return startOfWeek(new Date(), { weekStartsOn: 1 }); // Fallback para data atual
    }
  }, [currentDate]);
  
  const weekNumber = useMemo(() => {
    try {
      const validCurrentDate = validateDate(currentDate, 'weekNumber calculation');
      return getWeek(validCurrentDate, { weekStartsOn: 1 });
    } catch (error) {
      console.error('[Orders] Erro ao calcular weekNumber:', error);
      return getWeek(new Date(), { weekStartsOn: 1 });
    }
  }, [currentDate]);
  
  const year = useMemo(() => {
    try {
      const validCurrentDate = validateDate(currentDate, 'year calculation');
      return getYear(validCurrentDate);
    } catch (error) {
      console.error('[Orders] Erro ao calcular year:', error);
      return getYear(new Date());
    }
  }, [currentDate]);
  
  const currentYear = useMemo(() => {
    try {
      const validCurrentDate = validateDate(currentDate, 'currentYear calculation');
      return getYear(validCurrentDate);
    } catch (error) {
      console.error('[Orders] Erro ao calcular currentYear:', error);
      return getYear(new Date());
    }
  }, [currentDate]);
  
  // Calcular as datas dos dias úteis da semana (segunda a sexta)
  const weekDays = useMemo(() => {
    try {
      const validWeekStart = validateDate(weekStart, 'weekDays calculation');
      const days = [];
      for (let i = 0; i < 5; i++) {
        const date = addDays(validWeekStart, i);
        days.push({
          date,
          dayNumber: i + 1,
          dayName: safeFormatDate(date, 'EEEE', `weekDays day ${i} name`),
          shortDayName: safeFormatDate(date, 'EEE', `weekDays day ${i} short name`),
          formattedDate: safeFormatDate(date, 'dd/MM', `weekDays day ${i} formatted date`)
        });
      }
      return days;
    } catch (error) {
      console.error('[Orders] Erro ao calcular weekDays:', error);
      // Fallback para dias da semana atual
      const now = new Date();
      const weekStartFallback = startOfWeek(now, { weekStartsOn: 1 });
      const days = [];
      for (let i = 0; i < 5; i++) {
        const date = addDays(weekStartFallback, i);
        days.push({
          date,
          dayNumber: i + 1,
          dayName: safeFormatDate(date, 'EEEE', `weekDays fallback day ${i} name`),
          shortDayName: safeFormatDate(date, 'EEE', `weekDays fallback day ${i} short name`),
          formattedDate: safeFormatDate(date, 'dd/MM', `weekDays fallback day ${i} formatted date`)
        });
      }
      return days;
    }
  }, [weekStart]);

  // Mapa de sugestões calculado com base no histórico
  const suggestionsMap = useMemo(() => {
    if (!allOrdersHistory.length || !selectedCustomer) return {};
    
    try {
      debugLog('Recalculando mapa de sugestões', {
        dataAtual: safeFormatDate(currentDate, 'dd/MM/yyyy', 'suggestionsMap log'),
        cliente: selectedCustomer.name,
        totalHistorico: allOrdersHistory.length
      });
      
      const relevantOrders = allOrdersHistory.filter(order => {
        if (!order.date) {
          debugLog('[suggestionsMap] Pedido ignorado: data ausente', { orderId: order.id });
          return false;
        }
        
        try {
          const orderDateInstance = validateDate(order.date, `order ${order.id} date validation`);
          const validCurrentDate = validateDate(currentDate, 'suggestionsMap filter comparison');

          return (
            order.customer_id === selectedCustomer.id && 
            order.day_of_week === currentDay &&
            orderDateInstance <= validCurrentDate 
          );
        } catch (e) {
          debugLog('[suggestionsMap] Pedido ignorado: erro ao parsear data', { orderId: order.id, orderDateString: order.date, error: e });
          return false;
        }
      });

      // Ordenar por data
      relevantOrders.sort((a, b) => {
        try {
          const dateA = validateDate(a.date, `order ${a.id} sort`);
          const dateB = validateDate(b.date, `order ${b.id} sort`);
          return dateA.getTime() - dateB.getTime(); // Comparar timestamps
        } catch (error) {
          console.error('[suggestionsMap] Erro ao ordenar pedidos:', error);
          return 0;
        }
      });

      debugLog('Pedidos relevantes encontrados para suggestionsMap', {
        total: relevantOrders.length,
        periodo: `até ${safeFormatDate(currentDate, 'dd/MM/yyyy', 'suggestionsMap period log')}`
      });
      
      return relevantOrders.reduce((acc, order) => {
        if (!order.items) return acc;
        
        try {
          const orderDateForMap = validateDate(order.date, `order ${order.id} date for map`);

          order.items.forEach(item => {
            if (!item.recipe_id || !item.quantity) return;
            
            const quantity = parseFloat(String(item.quantity).replace(',', '.')) || 0;
            
            if (!acc[item.recipe_id] || orderDateForMap > validateDate(acc[item.recipe_id].lastDate, `existing suggestion ${item.recipe_id} lastDate`)) {
              acc[item.recipe_id] = {
                quantity,
                lastDate: order.date, // Manter a string original aqui, mas usar validateDate para comparações
                orderHistory: [
                  ...(acc[item.recipe_id]?.orderHistory || []).map(h => ({
                    ...h, 
                    date: validateDate(h.date, `history item ${item.recipe_id}`)
                  })),
                  { date: orderDateForMap, quantity }
                ].sort((h1, h2) => h1.date.getTime() - h2.date.getTime()) // Ordenar histórico por data
                 .map(h => ({...h, date: safeFormatDate(h.date, 'yyyy-MM-dd', `history format ${item.recipe_id}`)}))
              };
            }
          });
        } catch (error) {
          console.error(`[suggestionsMap] Erro ao processar itens do pedido ${order.id}:`, error);
        }
        
        return acc;
      }, {});
    } catch (error) {
      console.error('[suggestionsMap] Erro geral ao calcular sugestões:', error);
      return {};
    }
  }, [allOrdersHistory, selectedCustomer, currentDay, currentDate]);

  // 1. STABLE CALLBACKS FOR API CALLS - minimal dependencies
  // Update load functions to only set state if data has actually changed
  const loadCustomers = useCallback(async () => {
    try {
      const customersData = await retryWithDelay(() => Customer.list());
      setCustomers(prevCustomers => {
        if (!deepCompareArrays(prevCustomers, customersData)) {
          return customersData;
        }
        debugLog('[loadCustomers] Dados não alterados, evitando setState');
        return prevCustomers;
      });
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast({ variant: "destructive", description: "Erro ao carregar lista de clientes." });
    }
  }, [toast]);
    
  const loadRecipes = useCallback(async () => {
    try {
      const recipesData = await retryWithDelay(() => Recipe.list());
      setRecipes(prevRecipes => {
        if (!deepCompareArrays(prevRecipes, recipesData)) {
          return recipesData;
        }
        debugLog('[loadRecipes] Dados não alterados, evitando setState');
        return prevRecipes;
      });
    } catch (error) {
      console.error("Erro ao carregar receitas:", error);
      toast({ variant: "destructive", description: "Erro ao carregar receitas." });
    }
  }, [toast]);
  
  const loadOrdersForWeek = useCallback(async () => {
    try {
      debugLog('[loadOrdersForWeek] Iniciando carregamento', { weekNumber, year });
      const weekOrdersData = await retryWithDelay(() => 
        Order.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ])
      );
      setOrders(prevOrders => {
        if (!deepCompareArrays(prevOrders, weekOrdersData)) {
          debugLog('[loadOrdersForWeek] Dados carregados e alterados', { count: weekOrdersData.length });
          return weekOrdersData;
        }
        debugLog('[loadOrdersForWeek] Dados não alterados, evitando setState');
        return prevOrders;
      });
      return weekOrdersData;
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast({ variant: "destructive", description: "Erro ao carregar pedidos da semana." });
      return [];
    }
  }, [weekNumber, year, toast]);
  
  const loadMenusForWeek = useCallback(async () => {
    try {
      debugLog('[loadMenusForWeek] Iniciando carregamento', { weekNumber, year });
      const weekMenusData = await retryWithDelay(() => 
        WeeklyMenu.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ])
      );
      setWeeklyMenus(prevMenus => {
        if (!deepCompareArrays(prevMenus, weekMenusData)) {
          debugLog('[loadMenusForWeek] Dados carregados e alterados', { count: weekMenusData.length });
          return weekMenusData;
        }
        debugLog('[loadMenusForWeek] Dados não alterados, evitando setState');
        return prevMenus;
      });
      return weekMenusData;
    } catch (error) {
      console.error("Erro ao carregar cardápios:", error);
      toast({ variant: "destructive", description: "Erro ao carregar cardápios da semana." });
      return [];
    }
  }, [weekNumber, year, toast]);
  
  // Aplicar deepCompareArrays em setAllOrdersHistory e setAllWasteHistory
  const loadAllOrdersHistory = useCallback(async () => {
    try {
      debugLog('[loadAllOrdersHistory] Iniciando carregamento');
      const allOrdersData = await retryWithDelay(() => Order.list());
      setAllOrdersHistory(prevHistory => {
        if (!deepCompareArrays(prevHistory, allOrdersData)) {
          debugLog('[loadAllOrdersHistory] Histórico carregado e alterado', { count: allOrdersData.length });
          return allOrdersData || []; // Garantir que seja sempre um array
        }
        debugLog('[loadAllOrdersHistory] Histórico não alterado, evitando setState');
        return prevHistory;
      });
      return allOrdersData || []; // Garantir que seja sempre um array
    } catch (error) {
      console.error("Erro ao carregar histórico de pedidos:", error);
      // Não mostrar toast aqui para não poluir UI em atualizações de background
      return [];
    }
  }, []); 

  const loadAllWasteHistory = useCallback(async () => {
    try {
      debugLog('[loadAllWasteHistory] Iniciando carregamento');
      const wasteHistoryData = await retryWithDelay(() => OrderWaste.list());
      setAllWasteHistory(prevWasteHistory => {
        if (!deepCompareArrays(prevWasteHistory, wasteHistoryData)) {
          debugLog('[loadAllWasteHistory] Histórico de sobras carregado e alterado', { count: wasteHistoryData.length });
          return wasteHistoryData;
        }
        debugLog('[loadAllWasteHistory] Histórico de sobras não alterado, evitando setState');
        return prevWasteHistory;
      });
      return wasteHistoryData;
    } catch (error) {
      console.error("Erro ao carregar histórico de sobras:", error);
      // Não mostrar toast aqui
      return [];
    }
  }, []);

  // Helpers que agora vêm de orderUtils.js (ou podem ser chamados diretamente)
  // parseQuantity, formattedQuantity, formatCurrency, formatWeight já são de lá.
  // normalizeOrderItems também.

  // Funções de lógica de cardápio/sugestão que são passadas para orderCoreLogic
  const getMenuForDay = useCallback((day, menus) => { // menus agora é parâmetro
    if (!menus || menus.length === 0) return null;
    const menu = menus[0]; // Assume que weeklyMenus filtrado por semana/ano só terá um ou nenhum
    if (!menu?.menu_data || !menu.menu_data[day]) return null;
    return menu;
  }, []);

  const calculateSuggestion = useCallback((recipeId, recipeName, mealsExpected = 0, history, customer, day, dateForCalc) => {
    if (mealsExpected === 0) return null;
    if (!history.length || !customer) return null;
    
    try {
      const relevantOrders = history.filter(order => {
        const orderDate = validateDate(order.date, `calculateSuggestion order ${order.id}`);
        return (
          order.customer_id === customer.id && 
          order.day_of_week === day &&
          orderDate <= dateForCalc &&
          order.items?.some(item => item.recipe_id === recipeId)
        );
      }).sort((a, b) => validateDate(b.date, `calculateSuggestion sort B ${b.id}`).getTime() - validateDate(a.date, `calculateSuggestion sort A ${a.id}`).getTime());

      if (!relevantOrders.length) return null;
      let avgQuantityPerMeal = 0;
      let totalValidOrdersForAvg = 0;

      relevantOrders.forEach(order => {
        const orderItem = order.items.find(item => item.recipe_id === recipeId);
        const quantity = orderItem ? utilParseQuantity(orderItem.quantity) : 0;
        const meals = order.total_meals_expected || 0;

        if (quantity > 0 && meals > 0) {
          avgQuantityPerMeal += quantity / meals;
          totalValidOrdersForAvg++;
        }
      });
      avgQuantityPerMeal = totalValidOrdersForAvg > 0 ? avgQuantityPerMeal / totalValidOrdersForAvg : 0;
      let baseSuggestion = 0;
      if (avgQuantityPerMeal > 0 && mealsExpected > 0) {
        baseSuggestion = avgQuantityPerMeal * mealsExpected;
      }
      if (baseSuggestion === 0 && mealsExpected > 0) {
        const lastOrder = relevantOrders[0];
        const lastOrderItem = lastOrder?.items.find(item => item.recipe_id === recipeId);
        baseSuggestion = lastOrderItem ? utilParseQuantity(lastOrderItem.quantity) : 0;
      }
      if (baseSuggestion === 0) return null;
      const suggestedQuantity = Math.max(0.5, baseSuggestion);
      return Math.round(suggestedQuantity * 2) / 2;

    } catch (error) {
      console.error(`Erro ao calcular sugestão para ${recipeName}:`, error);
      return null;
    }
  }, []); 

  // Atualizar getMenuItemsForDay para definir unit_price inicial corretamente
  const getMenuItemsForDay = useCallback((day, customer, menu, currentRecipes, localCalculateSuggestion) => {
    if (!menu || !customer) return [];
    const items = [];
    const menuData = menu.menu_data[day];
    if (!menuData) return [];

    const mealsForSuggestion = 0; 

    Object.entries(menuData || {}).forEach(([categoryId, categoryItems]) => {
      if (!Array.isArray(categoryItems)) return;
      categoryItems.forEach(item => {
        if (!item.recipe_id) return;
        const itemLocations = item.locations;
        const shouldInclude = !itemLocations || itemLocations.length === 0 || (Array.isArray(itemLocations) && itemLocations.includes(customer.id));
        
        if (shouldInclude) {
          const recipe = currentRecipes.find(r => r.id === item.recipe_id && r.active !== false);
          if (!recipe) return;

          const suggestedQuantity = localCalculateSuggestion(item.recipe_id, item.name, mealsForSuggestion);
          const defaultUnitType = recipe.cuba_weight && recipe.cuba_weight > 0 ? "cuba" : "kg";
          let unitPrice;

          if (defaultUnitType === "cuba") {
            unitPrice = (recipe.cost_per_kg_yield || 0) * (utilParseQuantity(recipe.cuba_weight) || 0);
          } else {
            unitPrice = recipe.cost_per_kg_yield || 0;
          }
          
          items.push({
            recipe_id: item.recipe_id,
            recipe_name: recipe.name, 
            category: recipe.category || categoryId,
            unit_type: defaultUnitType,
            quantity: 0,
            suggested_quantity: suggestedQuantity,
            unit_price: unitPrice,
            total_price: 0,
            notes: "",
            cuba_weight: utilParseQuantity(recipe.cuba_weight) || 0,
            // Added fields for portioning
            base_quantity_for_portioning: 0, 
            portioning_percentage: 0, 
          });
        }
      });
    });
    return items;
  }, []);

  // NOVA `prepareOrder` que usa `generateDisplayOrder`
  const prepareOrder = useCallback(async () => {
    debugLog('[prepareOrder] INÍCIO (nova)', { selectedCustomerId: selectedCustomer?.id, currentDay, isDirty });
    if (!selectedCustomer) { // currentDate is guaranteed to be valid due to useState init
      setCurrentOrder(null);
      setIsDirty(false);
      dirtyOrderRef.current = null;
      return;
    }

    // Se o usuário está editando (isDirty = true), não sobrescrever os dados
    if (isDirty) {
      debugLog('[prepareOrder] SKIP: Usuário está editando, não sobrescrever dados');
      return;
    }

    setIsLoadingOrder(true);
    try {
      const orderData = generateDisplayOrder({
        selectedCustomer, currentDay, orders, recipes, weeklyMenus, currentDate: validateDate(currentDate, 'prepareOrder date'),
        weekNumber, year, weekStart: validateDate(weekStart, 'prepareOrder weekStart'),
        getMenuForDay, getMenuItemsForDay, calculateSuggestion, allOrdersHistory,
        debugLog
      });

      setCurrentOrder(prev => deepCompare(prev, orderData) ? prev : orderData);
      dirtyOrderRef.current = null; 
      setIsDirty(false);

    } catch (error) {
      console.error("Erro ao preparar pedido (nova):", error);
      toast({ variant: "destructive", description: "Erro ao preparar pedido." });
    } finally {
      setIsLoadingOrder(false);
    }
  }, [
    selectedCustomer, currentDay, currentDate, orders, recipes, weeklyMenus,
    weekNumber, year, weekStart, getMenuForDay, getMenuItemsForDay, calculateSuggestion, allOrdersHistory, toast, isDirty
  ]);

  // NOVA `saveOrder` que usa `determineSaveAction`
  const saveOrder = useCallback(async (orderDataToSave) => {
    if (!orderDataToSave || !orderDataToSave.customer_id) {
      debugLog('[saveOrder] ERRO: orderDataToSave inválido (nova).');
      toast({ variant: "destructive", description: "Tentativa de salvar pedido inválido." });
      return null;
    }
    
    setSaving(true);
    let savedOrderResponse = null;
    let saveDecision; 

    try {
      saveDecision = determineSaveAction({ orderDataToSave, debugLog }); 

      if (saveDecision.error) {
        toast({ variant: "destructive", description: saveDecision.error });
        setSaving(false); 
        return null;
      }

      if (saveDecision.toastProps) {
        toast(saveDecision.toastProps);
      }

      switch (saveDecision.action) {
        case 'delete':
          try {
            await Order.delete(saveDecision.orderIdToDelete);
            setCurrentOrder(prev => prev?.id === saveDecision.orderIdToDelete ? null : prev);
            setOrders(prevOrders => prevOrders.filter(o => o.id !== saveDecision.orderIdToDelete));
            await loadAllOrdersHistory(); 
          } catch (delError) {
             if (delError.response?.status === 404 || delError.message?.toLowerCase().includes("entity not found")) {
                debugLog('[saveOrder] Pedido para deletar já não existia.', { id: saveDecision.orderIdToDelete });
                setOrders(prevOrders => prevOrders.filter(o => o.id !== saveDecision.orderIdToDelete));
             } else {
                console.error("Erro ao deletar pedido:", delError);
                toast({ variant: "destructive", title: "Erro ao Remover Pedido", description: delError.message });
             }
          }
          break;
        case 'ignore_empty_new':
          if (currentOrder && !currentOrder.id &&
              currentOrder.customer_id === orderDataToSave.customer_id &&
              currentOrder.day_of_week === orderDataToSave.day_of_week) {
            setCurrentOrder(null);
          }
          break;
        case 'update':
          savedOrderResponse = await Order.update(saveDecision.payload.id, saveDecision.payload);
          break;
        case 'create':
          savedOrderResponse = await Order.create(saveDecision.payload);
          await loadAllOrdersHistory();
          break;
        default:
          debugLog('[saveOrder] Ação de salvamento desconhecida ou não necessária.', saveDecision);
      }

      if (savedOrderResponse) {
        setCurrentOrder(prev => deepCompare(prev, savedOrderResponse) ? prev : savedOrderResponse);
        setOrders(prevOrders => {
          const index = prevOrders.findIndex(o => o.id === savedOrderResponse.id);
          if (index > -1) {
            const newOrders = [...prevOrders];
            newOrders[index] = savedOrderResponse;
            return newOrders;
          }
          return [...prevOrders, savedOrderResponse];
        });
      }
      
      setIsDirty(false);
      dirtyOrderRef.current = null;
      lastManualSaveTimestampRef.current = Date.now();
      return savedOrderResponse;

    } catch (error) {
      console.error("Erro ao processar/salvar pedido (nova):", error);
      if (error.response?.status === 404 && orderDataToSave.id && saveDecision?.action === 'update') { 
        toast({ variant: "destructive", title: "Pedido não encontrado", description: "O pedido que tentou atualizar pode ter sido excluído." });
        setCurrentOrder(prev => prev?.id === orderDataToSave.id ? null : prev);
        setOrders(prevOrders => prevOrders.filter(o => o.id !== orderDataToSave.id));
      } else {
        toast({ variant: "destructive", title: "Erro ao Salvar Pedido", description: error.message });
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [toast, currentOrder, loadAllOrdersHistory]);
  
  // FUNÇÕES ADICIONADAS/CORRIGIDAS
  const cleanupEditingState = useCallback(() => {
    setEditingItem({ index: null, field: null, value: '' });
  }, []);

  const changeWeek = useCallback((direction) => {
    try {
      if (isDirty && dirtyOrderRef.current) {
        if (window.confirm("Você tem alterações não salvas. Deseja salvar antes de mudar a semana?")) {
          saveOrder(dirtyOrderRef.current);
        }
      }
      
      const validCurrentDate = validateDate(currentDate, 'changeWeek');
      const newDate = addDays(validCurrentDate, direction * 7);
      debugLog('[changeWeek] Mudando semana:', { from: validCurrentDate, to: newDate, direction });
      
      setCurrentDate(newDate);
      setCurrentOrder(null);
      setIsDirty(false);
      dirtyOrderRef.current = null;
      cleanupEditingState();
    } catch (error) {
      console.error('[changeWeek] Erro ao mudar semana:', error);
    }
  }, [isDirty, saveOrder, cleanupEditingState, currentDate]);

  const goToPreviousWeek = useCallback(() => changeWeek(-1), [changeWeek]);
  const goToNextWeek = useCallback(() => changeWeek(1), [changeWeek]);
  
  const goToCurrentWeek = useCallback(() => {
    try {
      if (isDirty && dirtyOrderRef.current) {
        if (window.confirm("Você tem alterações não salvas. Deseja salvar antes de mudar para a semana atual?")) {
          saveOrder(dirtyOrderRef.current);
        }
      }
      
      const now = new Date();
      debugLog('[goToCurrentWeek] Indo para semana atual:', now);
      
      setCurrentDate(now);
      setCurrentOrder(null);
      setIsDirty(false);
      dirtyOrderRef.current = null;
      cleanupEditingState();
    } catch (error) {
      console.error('[goToCurrentWeek] Erro ao ir para semana atual:', error);
    }
  }, [isDirty, saveOrder, cleanupEditingState]);

  const handleCustomerChange = useCallback(async (customer) => {
    if (isDirty && dirtyOrderRef.current) {
      const confirmSave = window.confirm("Você tem alterações não salvas para o cliente anterior. Deseja salvar antes de mudar de cliente?");
      if (confirmSave) {
        await saveOrder(dirtyOrderRef.current);
      }
    }
    setSelectedCustomer(customer);
    setCurrentOrder(null); 
    setIsDirty(false);
    dirtyOrderRef.current = null;
    cleanupEditingState();
  }, [isDirty, saveOrder, cleanupEditingState]);

  const handleDayChange = useCallback(async (day) => {
    if (currentDay === day) return;
    if (isDirty && dirtyOrderRef.current) {
      const confirmSave = window.confirm("Você tem alterações não salvas para o dia anterior. Deseja salvar antes de mudar de dia?");
      if (confirmSave) {
        await saveOrder(dirtyOrderRef.current);
      }
    }
    setCurrentDay(day);
    setCurrentOrder(null); 
    setIsDirty(false);
    dirtyOrderRef.current = null;
    cleanupEditingState();
  }, [currentDay, isDirty, saveOrder, cleanupEditingState]);

  const handleWasteChange = useCallback(async (wasteDataFromRegister, dayIndexForWaste) => {
    if (!selectedCustomer) return;

    // wasteDataFromRegister já vem com os campos calculados de calculateWasteTotalsAndDiscount
    // e os items_payload já formatados.

    const existingWasteRecord = allWasteHistory.find(
      (w) =>
        w.customer_id === selectedCustomer.id &&
        w.week_number === weekNumber &&
        w.year === year &&
        w.day_of_week === dayIndexForWaste
    );
    
    const payload = {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      week_number: weekNumber,
      year: year,
      day_of_week: dayIndexForWaste,
      date: safeFormatDate(addDays(validateDate(weekStart, 'handleWasteChange weekStart'), dayIndexForWaste - 1), "yyyy-MM-dd", 'handleWasteChange date'),
      
      // Campos do wasteDataFromRegister
      items: wasteDataFromRegister.items, // que é o items_payload
      general_notes: wasteDataFromRegister.notes, // Corrigido de .general_notes para .notes
      menu_id: wasteDataFromRegister.menu_id,
      total_internal_waste_weight_kg: wasteDataFromRegister.total_internal_waste_weight_kg,
      total_client_returned_weight_kg: wasteDataFromRegister.total_client_returned_weight_kg,
      total_combined_waste_weight_kg: wasteDataFromRegister.total_combined_waste_weight_kg,
      total_original_value_of_waste: wasteDataFromRegister.total_original_value_of_waste,
      total_discount_value_applied: wasteDataFromRegister.total_discount_value_applied,
      final_value_after_discount: wasteDataFromRegister.final_value_after_discount,
    };

    try {
      let savedWaste;
      // Lógica para deletar se o payload de itens estiver vazio e não houver notas gerais
      const isEffectivelyEmpty = (
        !payload.items ||
        payload.items.every(item => 
          validateNumericInput(item.internal_waste_quantity, 0) === 0 && 
          validateNumericInput(item.client_returned_quantity, 0) === 0
        )
      ) && (!payload.general_notes || payload.general_notes.trim() === '');


      if (existingWasteRecord) {
        if (isEffectivelyEmpty) { 
            await OrderWaste.delete(existingWasteRecord.id);
            toast({ description: "Registro de sobra zerado foi removido." });
            savedWaste = null; // Para garantir que não tentará usar um objeto deletado
        } else {
            savedWaste = await OrderWaste.update(existingWasteRecord.id, payload);
            toast({ description: "Sobras atualizadas com sucesso!" });
        }
      } else {
        if (!isEffectivelyEmpty) { 
            savedWaste = await OrderWaste.create(payload);
            toast({ description: "Sobras registradas com sucesso!" });
        } else {
            toast({ description: "Nenhuma sobra para registrar." });
            return; 
        }
      }
      
      await loadAllWasteHistory(); 
      
      // Atualizar wasteRecords para o dia específico
      setWasteRecords(prev => {
        const customerRecords = { ...(prev[selectedCustomer.id] || {}) };
        if (savedWaste) {
          customerRecords[dayIndexForWaste] = savedWaste;
        } else if (existingWasteRecord && isEffectivelyEmpty) { 
          delete customerRecords[dayIndexForWaste];
        }
        return { ...prev, [selectedCustomer.id]: customerRecords };
      });

    } catch (error) {
      console.error("Erro ao salvar sobras:", error);
      let errorMsg = "Erro ao salvar sobras.";
      if (error.response?.data?.detail) {
         errorMsg = `Erro ao salvar sobras: ${JSON.stringify(error.response.data.detail)}`;
      } else if (error.message) {
         errorMsg = `Erro ao salvar sobras: ${error.message}`;
      }
      toast({ variant: "destructive", description: errorMsg });
    }
  }, [selectedCustomer, weekNumber, year, weekStart, toast, loadAllWasteHistory, allWasteHistory]);

  const handleGenerateReport = async (startDate, endDate) => {
    if (!selectedCustomer) {
      toast({ variant: "destructive", description: "Selecione um cliente para gerar o relatório." });
      return;
    }
    if (!startDate || !endDate) {
      toast({ variant: "destructive", description: "Datas de início e fim são obrigatórias." });
      return;
    }

    setIsGeneratingReport(true);
    try {
      // 1. Filtrar pedidos do cliente no período
      const customerOrdersInPeriod = (allOrdersHistory || []).filter(order => { // Adicionado fallback para allOrdersHistory
        if (order.customer_id !== selectedCustomer.id) return false;
        try {
          const orderDate = parseISO(order.date);
          return isWithinInterval(orderDate, { 
            start: startOfDay(parseISO(startDate)), 
            end: endOfDay(parseISO(endDate)) 
          });
        } catch (e) {
          console.error("Erro ao parsear data do pedido para relatório:", order.date, e);
          return false;
        }
      });

      // 2. Filtrar sobras do cliente no período
      const customerWastesInPeriod = (allWasteHistory || []).filter(waste => { // Adicionado fallback para allWasteHistory
        if (waste.customer_id !== selectedCustomer.id) return false;
        try {
          const wasteDate = parseISO(waste.date);
          return isWithinInterval(wasteDate, { 
            start: startOfDay(parseISO(startDate)), 
            end: endOfDay(parseISO(endDate)) 
          });
        } catch (e) {
          console.error("Erro ao parsear data da sobra para relatório:", waste.date, e);
          return false;
        }
      });
      
      // Adicionar detalhes da receita aos itens de sobra para cálculo de valor na função backend
      const enrichedWastes = customerWastesInPeriod.map(waste => ({
          ...waste,
          items: waste.items?.map(item => {
              const recipe = recipes.find(r => r.id === item.recipe_id);
              return {
                  ...item,
                  recipe_details: recipe ? { // Adicionando detalhes da receita
                      cost_per_kg_yield: recipe.cost_per_kg_yield,
                      cuba_weight_kg: utilParseQuantity(recipe.cuba_weight) // Certifique-se que é numérico
                  } : null
              };
          }) || []
      }));


      // 3. Chamar a função de backend
      const { data: reportHtml, error } = await generatePeriodReport({
        startDate,
        endDate,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        orders: customerOrdersInPeriod,
        wastes: enrichedWastes, // Usar sobras enriquecidas
        allRecipes: recipes, // Passar a lista completa de receitas
        allOrdersHistory: allOrdersHistory || [], // Modificado aqui e garantindo que seja um array
      });

      if (error || !reportHtml) {
        // O erro já vem como string do backend, ou pode ser um objeto de erro do Axios
        const errorMessage = typeof error === 'string' ? error : (error?.message || "Falha ao gerar o relatório HTML.");
        throw new Error(errorMessage);
      }

      // 4. Abrir HTML em nova aba
      const reportBlob = new Blob([reportHtml], { type: 'text/html' });
      const reportUrl = URL.createObjectURL(reportBlob);
      window.open(reportUrl, '_blank');
      URL.revokeObjectURL(reportUrl); // Limpar o objeto URL

      toast({ description: "Relatório gerado com sucesso!" });
      setIsReportDialogOpen(false);

    } catch (err) {
      console.error("Erro ao gerar relatório consolidado:", err);
      // err.message já deve conter a mensagem de erro tratada (seja do backend ou do throw new Error acima)
      toast({ variant: "destructive", title: "Erro ao Gerar Relatório", description: err.message });
    } finally {
      setIsGeneratingReport(false);
    }
  };


  // Efeitos:
  // 1. Carregamento de clientes e receitas (useEffect inicial)
  useEffect(() => {
    setLoading(true);
    Promise.all([loadCustomers(), loadRecipes(), loadAllOrdersHistory(), loadAllWasteHistory()])
      .finally(() => setLoading(false));
  }, [loadCustomers, loadRecipes, loadAllOrdersHistory, loadAllWasteHistory]); 
  
  // 2. Carregamento de pedidos e cardápios da semana (quando currentDate muda)
  useEffect(() => {
    if (!loading) { 
      setIsLoadingOrder(true); 
      Promise.all([loadOrdersForWeek(), loadMenusForWeek()])
        .finally(() => setIsLoadingOrder(false));
    }
  }, [currentDate, loadOrdersForWeek, loadMenusForWeek, loading]); 
  
  // 3. Preparar pedido (quando cliente, dia, ou dados relevantes mudam)
  useEffect(() => {
    debugLog('[useEffect orderPrepare]', { 
      selectedCustomerId: selectedCustomer?.id, currentDay, loading,
      ordersCount: orders.length, menusCount: weeklyMenus.length,
      currentWeekNumber: weekNumber, currentYearValue: year,
      menuWeekNumber: weeklyMenus[0]?.week_number, menuYear: weeklyMenus[0]?.year,
    });

    if (
      selectedCustomer && !loading && weeklyMenus && weeklyMenus.length > 0 &&
      weeklyMenus[0].week_number === weekNumber && weeklyMenus[0].year === year
    ) {
      prepareOrder();
    } else if (!selectedCustomer) {
      setCurrentOrder(null);
      cleanupEditingState(); 
    } else if (weeklyMenus && weeklyMenus.length > 0 && (weeklyMenus[0].week_number !== weekNumber || weeklyMenus[0].year !== year)) {
      debugLog('[useEffect orderPrepare] SKIP: Cardápio carregado não corresponde à semana/ano atual.');
    } else {
      debugLog('[useEffect orderPrepare] SKIP: Condições não atendidas.', {selectedCustomer: !!selectedCustomer, loading}); // Corrigido Log para debugLog
    }
  }, [
    selectedCustomer, currentDay, loading, orders, weeklyMenus, recipes, 
    prepareOrder, cleanupEditingState, weekNumber, year
  ]);

  // useEffect para salvar automaticamente
  useEffect(() => {
    if (isDirty && dirtyOrderRef.current) {
      if (debouncedSave.current) clearTimeout(debouncedSave.current);
      debouncedSave.current = setTimeout(() => {
        if (isDirty && dirtyOrderRef.current && !editingItem.field) {
          debugLog('[DebouncedSave] Salvando alterações após inatividade');
          saveOrder(dirtyOrderRef.current);
        } else {
          debugLog('[DebouncedSave] Inatividade, mas campo ainda em edição ou sem dirtyRef.', {editingField: editingItem.field});
        }
      }, 2000);
    }
    return () => { if (debouncedSave.current) clearTimeout(debouncedSave.current); };
  }, [isDirty, saveOrder, editingItem.field]); 

  // useEffect para carregar sobras do contexto (cliente, dia, semana)
  useEffect(() => {
    const loadWasteRecordsForContext = async () => {
      if (!selectedCustomer) {
        setWasteRecords(prevRecords => (Object.keys(prevRecords).length > 0 ? {} : prevRecords));
        return;
      }
      try {
        const validCurrentDate = validateDate(currentDate, 'waste records context');
        const weekNum = getWeek(validCurrentDate, { weekStartsOn: 1 });
        const yearNum = getYear(validCurrentDate);
        
        debugLog('[Orders.js useEffect] Carregando registros de sobras para contexto', { 
          customerId: selectedCustomer.id, weekNum, yearNum, currentDay,
          allWasteHistoryCount: allWasteHistory?.length
        });

        let recordsForDay = {};
        if (allWasteHistory && allWasteHistory.length > 0) {
          const customerDayRecords = allWasteHistory
            .filter(r => {
              if (!r.date) {
                debugLog('[loadWasteRecordsForContext] Registro de sobra ignorado: data ausente', { wasteId: r.id });
                return false;
              }
              try {
                validateDate(r.date, `waste record ${r.id} date`); // Just to validate and log if invalid
                return r.customer_id === selectedCustomer.id &&
                       r.week_number === weekNum &&
                       r.year === yearNum;
              } catch (e) { 
                console.error(`[loadWasteRecordsForContext] Erro ao validar data do registro ${r.id}:`, e);
                return false; 
              }

            })
            .reduce((acc, r) => {
              try {
                const rDate = validateDate(r.updated_date || r.created_date, `waste record ${r.id} timestamp`);
                const accDate = acc[r.day_of_week] ? 
                  validateDate(acc[r.day_of_week].updated_date || acc[r.day_of_week].created_date, `existing waste record ${r.day_of_week}`) : 
                  null;
                
                if (!acc[r.day_of_week] || (rDate && accDate && rDate.getTime() > accDate.getTime())) { // Compare timestamps
                  acc[r.day_of_week] = r;
                }
              } catch (error) {
                console.error(`[loadWasteRecordsForContext] Erro ao processar timestamp do registro ${r.id}:`, error);
              }
              return acc;
            }, {});
          recordsForDay = customerDayRecords;
        }
        
        setWasteRecords(prevRecords => {
          const updatedContextRecords = { ...(prevRecords || {}), [selectedCustomer.id]: recordsForDay };
          return !deepCompare(prevRecords, updatedContextRecords) ? updatedContextRecords : prevRecords;
        });

      } catch (error) {
        console.error("Erro ao carregar sobras da semana (useEffect context):", error);
      }
    };
    loadWasteRecordsForContext();
  }, [currentDate, selectedCustomer, currentDay, allWasteHistory]); 
  
  const calculateTotalWeightForOrderItem = useCallback((item) => {
    const recipe = recipes.find(r => r.id === item.recipe_id);
    return utilCalculateItemTotalWeight(item, recipe);
  }, [recipes]);

  // 13. GERENCIAMENTO DE ESTADO E LÓGICA DE ATUALIZAÇÃO DO PEDIDO LOCAL
  const updateOrderLocally = useCallback((updatedFieldsOrItemUpdater) => {
    setCurrentOrder(prevOrder => {
      const newOrderData = applyOrderUpdates(
        prevOrder,
        updatedFieldsOrItemUpdater,
        {
          recipes,
          allOrdersHistory,
          selectedCustomer,
          currentDay,
          currentDate: validateDate(currentDate, 'updateOrderLocally date'),
          calculateSuggestion,
          debugLog: orderValueLog 
        }
      );

      if (newOrderData) {
        dirtyOrderRef.current = newOrderData;
        setIsDirty(true);
        return newOrderData;
      }
      return prevOrder; 
    });
  }, [recipes, allOrdersHistory, selectedCustomer, currentDay, currentDate, calculateSuggestion]);
  
  // Handler para quando a quantidade principal é alterada
  const commitQuantityChange = useCallback((itemIndex) => {
    if (!currentOrder || editingItem.index !== itemIndex || editingItem.field !== 'quantity') {
      if (editingItem.index === itemIndex && editingItem.field === 'quantity') {
        setEditingItem({ index: null, field: null, value: '' });
      }
      return;
    }
    const numericValue = utilParseQuantity(editingItem.value);
    updateOrderLocally((item, index) => {
      if (index === itemIndex) {
          return {
            ...item,
            quantity: numericValue,
            base_quantity_for_portioning: numericValue, // Reseta a base
            portioning_percentage: 0, // Reseta o porcionamento
          };
        }
        return item;
    });
    setEditingItem({ index: null, field: null, value: '' });
  }, [currentOrder, editingItem, updateOrderLocally]);

  // Handler para quando o input de porcionamento é alterado
  const handlePorcionamentoInputChangeLocal = useCallback((itemIndex, rawValue) => {
    if (!currentOrder) return;
    // Permite números, vírgula e sinal negativo no início
    let sanitizedValue = rawValue.replace(/[^\-0-9,]/g, ''); 
    if (sanitizedValue.startsWith(',')) sanitizedValue = '0' + sanitizedValue;

    // Garante que o sinal negativo só apareça no início
    const negativeSign = sanitizedValue.startsWith('-') ? '-' : '';
    const numericPart = sanitizedValue.replace(/-/g, '');
    sanitizedValue = negativeSign + numericPart;
    
    setEditingItem({ index: itemIndex, field: 'portioning_percentage', value: sanitizedValue });
    setIsDirty(true); // Marca como sujo para o autosave
  }, [currentOrder]);

  // Handler para quando o input de porcionamento perde o foco ou Enter é pressionado
  const commitPorcionamentoChange = useCallback((itemIndex) => {
    if (!currentOrder || editingItem.index !== itemIndex || editingItem.field !== 'portioning_percentage') {
      if (editingItem.index === itemIndex && editingItem.field === 'portioning_percentage') {
        setEditingItem({ index: null, field: null, value: '' });
      }
      return;
    }
    const percentageValue = utilParseQuantity(editingItem.value); // Permite negativos

    updateOrderLocally((item, index) => {
      if (index === itemIndex) {
        const baseQty = utilParseQuantity(item.base_quantity_for_portioning, 0);
        const newQuantity = baseQty * (1 + (percentageValue / 100));
        return {
          ...item,
          portioning_percentage: percentageValue,
          quantity: Math.max(0, newQuantity), // Garante que a quantidade não seja negativa
        };
      }
      return item;
    });
    setEditingItem({ index: null, field: null, value: '' });
  }, [currentOrder, editingItem, updateOrderLocally]);
  
  const handleQuantityInputChangeLocal = useCallback((itemIndex, rawValue) => {
    if (!currentOrder) return;

    let sanitizedValue = rawValue.replace(/[^0-9,]/g, '');
    if (sanitizedValue.includes(',')) {
      const [whole, decimal] = sanitizedValue.split(',');
      sanitizedValue = `${whole},${decimal?.substring(0, 1) || ''}`;
    }

    setEditingItem({ index: itemIndex, field: 'quantity', value: sanitizedValue });
    setIsDirty(true);
  }, [currentOrder]);

  const handleUnitTypeChangeLocal = useCallback((itemIndex, newUnitType) => {
    updateOrderLocally((item, index) => {
      if (index === itemIndex) {
        return { ...item, unit_type: newUnitType };
      }
      return item;
    });
  }, [updateOrderLocally]);

  const handleItemNotesChangeLocal = useCallback((itemIndex, newNotes) => {
    updateOrderLocally((item, index) => {
      if (index === itemIndex) {
        return { ...item, notes: newNotes };
      }
      return item;
    });
  }, [updateOrderLocally]);

  const handleGeneralNotesChangeLocal = useCallback((newNotes) => {
    updateOrderLocally({ general_notes: newNotes });
  }, [updateOrderLocally]);

  const handleTotalMealsChangeLocal = useCallback((rawValue) => {
    const numValue = parseInt(rawValue.replace(/[^0-9]/g, '')) || 0;
    setEditingItem({ index: null, field: 'meals_expected', value: String(numValue) });
    setIsDirty(true);
  }, []);

  const commitTotalMealsChange = useCallback(() => {
    if (editingItem.field !== 'meals_expected' || editingItem.index !== null) {
      if (editingItem.field === 'meals_expected' && editingItem.index === null) {
        setEditingItem({ index: null, field: null, value: '' });
      }
      return;
    }
    const numValue = parseInt(editingItem.value) || 0;
    updateOrderLocally({ total_meals_expected: numValue });
    setEditingItem({ index: null, field: null, value: '' });
  }, [editingItem, updateOrderLocally]);


  const handleQuantityFocus = useCallback((e, index, currentQuantityValue) => {
    const initialValue = (currentQuantityValue === '0' || currentQuantityValue === '0,0' || parseFloat(String(currentQuantityValue).replace(',', '.')) === 0)
      ? ''
      : utilFormattedQuantity(currentQuantityValue); 

    setEditingItem({ index, field: 'quantity', value: initialValue });
    if (e.target.select) e.target.select();
  }, []);

  const handlePortioningFocus = useCallback((e, index, currentPortioningValue) => {
    const initialValue = (currentPortioningValue === null || currentPortioningValue === undefined || parseFloat(String(currentPortioningValue).replace(',', '.')) === 0)
      ? '' // Deixa em branco se for 0 para facilitar a digitação
      : String(currentPortioningValue).replace('.', ',');

    setEditingItem({ index, field: 'portioning_percentage', value: initialValue });
    if (e.target.select) e.target.select();
  }, []);

  const handleMealsExpectedFocus = useCallback((e) => {
    const currentValue = String(currentOrder?.total_meals_expected ?? '0');
    const initialValue = (currentValue === '0') ? '' : currentValue;
    setEditingItem({ index: null, field: 'meals_expected', value: initialValue });
    if (e.target.select) e.target.select();
  }, [currentOrder]);


  // 14. RENDERIZAÇÃO DO COMPONENTE (JSX)
  const orderTotal = useMemo(() => {
    if (!currentOrder || !currentOrder.items) return { items: 0, amount: 0 };
    
    const totalItems = currentOrder.items.reduce((sum, item) => sum + (utilParseQuantity(item.quantity) || 0), 0); 
    const totalAmount = currentOrder.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    return { items: totalItems, amount: totalAmount };
  }, [currentOrder]);

  // Calcular total de sobras para a semana atual do cliente selecionado
  const wasteTotalForWeek = useMemo(() => {
    if (!selectedCustomer || !allWasteHistory.length) return 0;
    
    const currentWeekWastes = allWasteHistory.filter(waste => 
      waste.customer_id === selectedCustomer.id &&
      waste.week_number === weekNumber &&
      waste.year === year
    );
    
    return currentWeekWastes.reduce((total, waste) => {
      return total + (waste.final_value_after_discount || 0);
    }, 0);
  }, [selectedCustomer, allWasteHistory, weekNumber, year]);

  // Calcular valor líquido (total pedidos - total sobras)
  const netValue = useMemo(() => {
    return orderTotal.amount - wasteTotalForWeek;
  }, [orderTotal.amount, wasteTotalForWeek]);

  const showSkeleton = loading || isLoadingOrder;

  const mealsInputValue = editingItem.field === 'meals_expected' && editingItem.index === null
      ? editingItem.value
      : String(currentOrder?.total_meals_expected ?? ''); 

  return (
    <div className="flex h-screen flex-col bg-gray-50"> {/* Alterado bg-gray-100 para bg-gray-50 para um fundo mais suave */}
      {/* Cabeçalho */}
      <header className="bg-white border-b p-4 md:p-6 shadow-sm sticky top-0 z-30"> {/* Adicionado shadow-sm e sticky */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-full mx-auto"> {/* Limitado max-w e centralizado */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Pedidos</h1> {/* Título um pouco maior e cor mais escura */}
                <p className="text-sm text-slate-500 mt-1">
                    Gerencie os pedidos e sobras dos seus clientes
                </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap"> {/* Adicionado flex-wrap */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReportDialogOpen(true)}
                    disabled={!selectedCustomer || isGeneratingReport}
                    className="bg-white hover:bg-green-50 text-green-600 border-green-300 hover:border-green-400 transition-colors"
                >
                    {isGeneratingReport ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <FileText className="h-4 w-4 mr-2" />
                    )}
                    Relatório
                </Button>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={goToPreviousWeek} 
                    className="bg-white hover:bg-blue-50 text-blue-600 border-blue-300 hover:border-blue-400 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                </Button>
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToCurrentWeek} 
                    className="bg-white hover:bg-blue-50 text-blue-600 border-blue-300 hover:border-blue-400 transition-colors"
                >
                    <Calendar className="h-4 w-4 mr-1" />
                    Hoje
                </Button>
                
                <div className="relative px-4 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm font-medium text-blue-700 shadow-sm">
                    Semana {weekNumber}/{year}
                    {isDirty && (
                    <div className="absolute -top-1 -right-1">
                        {saving ? (
                        <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full bg-white"></div>
                        ) : (
                        <Circle className="w-3 h-3 fill-blue-500 text-blue-500" />
                        )}
                    </div>
                    )}
                </div>
                
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={goToNextWeek} 
                    className="bg-white hover:bg-blue-50 text-blue-600 border-blue-300 hover:border-blue-400 transition-colors"
                >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="flex-1 flex overflow-hidden">
        <CustomerSelector
          customers={customers}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={handleCustomerChange} 
          filterText={searchTerm}
          setFilterText={setSearchTerm}
          hasUnsavedChanges={isDirty}
          saving={saving}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden bg-white"> {/* Área principal com fundo branco */}
          {!selectedCustomer ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 flex-col p-6">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-70" />
              <p className="text-lg">Selecione um cliente para começar</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho do cliente */}
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="font-semibold text-xl text-slate-800">{selectedCustomer.name}</h2>
                  {selectedCustomer.company && (
                    <p className="text-sm text-slate-500">{selectedCustomer.company}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={currentTab === "orders" ? "default" : "outline"}
                    onClick={() => setCurrentTab("orders")}
                    className={cn(
                        "transition-colors",
                        currentTab === "orders" 
                            ? "bg-blue-600 hover:bg-blue-700 text-white" 
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                    )}
                  >
                    Pedidos
                  </Button>
                  <Button
                    variant={currentTab === "waste" ? "default" : "outline"}
                    onClick={() => setCurrentTab("waste")}
                    className={cn(
                        "transition-colors",
                        currentTab === "waste" 
                            ? "bg-amber-500 hover:bg-amber-600 text-white" 
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                    )}
                  >
                    Sobras
                  </Button>
                </div>
              </div>

              {/* Navegação dos dias da semana */}
              <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-2 sm:px-4"> {/* Ajustado padding para telas menores */}
                  <div className="flex overflow-x-auto justify-center sm:justify-between"> {/* Centralizado em telas menores */}
                    {weekDays.map((day) => (
                      <button
                        key={day.dayNumber}
                        onClick={() => handleDayChange(day.dayNumber)} 
                        className={cn(
                          "flex flex-col items-center py-3 px-3 sm:px-4 md:px-6 border-b-2 whitespace-nowrap transition-all duration-150 ease-in-out mx-0.5 sm:mx-1",
                          currentDay === day.dayNumber
                            ? "border-blue-600 text-blue-600 font-semibold" // Dia ativo mais destacado
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <span className="text-sm">{day.shortDayName}</span>
                        <span className="text-xs mt-0.5">{day.formattedDate}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50"> {/* Fundo da área de conteúdo mais claro */}
                {currentTab === "orders" ? (
                  <div className="bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden"> {/* Sombra mais pronunciada no card principal */}
                    {showSkeleton ? (
                      <Skeleton className="h-[500px] w-full" />
                    ) : !currentOrder || !currentOrder.items || currentOrder.items.length === 0 ? (
                       <div className="p-10 text-center">
                          <div className="text-slate-500 flex flex-col items-center">
                            <Info className="h-12 w-12 mb-4 text-slate-400"/>
                            <p className="text-xl font-medium">Cardápio do Dia Vazio</p>
                            <p className="text-sm mt-2">
                                Parece que não há itens de cardápio configurados para {selectedCustomer.name} neste dia.
                            </p>
                            <p className="text-sm mt-1">
                                Você pode verificar as configurações do cardápio semanal ou os itens específicos para este cliente.
                            </p>
                          </div>
                        </div>
                    ) : (
                      <div className="divide-y divide-slate-100"> {/* Divisores mais suaves */}
                        <div className="p-4 md:p-6 border-b border-slate-200 bg-blue-50/50"> {/* Fundo da seção de refeições um pouco diferente */}
                          <div className="max-w-xs">
                            <Label htmlFor="meals-expected" className="text-blue-700 font-medium text-sm">Número de Refeições Esperadas</Label>
                            <div className="flex items-center mt-1.5">
                              <Input
                                key={`meals-expected-${currentOrder?.id || 'new'}-${currentDay}-${weekNumber}-${year}`}
                                id="meals-expected"
                                type="text"
                                inputMode="numeric"
                                value={mealsInputValue}
                                onFocus={handleMealsExpectedFocus}
                                onChange={(e) => handleTotalMealsChangeLocal(e.target.value)}
                                onBlur={commitTotalMealsChange}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTotalMealsChange(); e.target.blur(); }}}
                                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm" /* Estilo de input melhorado */
                              />
                            </div>
                          </div>
                        </div>
                        
                        <OrderItems
                          items={currentOrder?.items || []}
                          editingItem={editingItem}
                          handleQuantityInputChange={handleQuantityInputChangeLocal}
                          handleQuantityBlur={commitQuantityChange} 
                          handleQuantityFocus={handleQuantityFocus}
                          handleEnterKey={(itemIndex) => { 
                            commitQuantityChange(itemIndex);
                            const keys = Object.keys(quantityInputRefs.current || {}).map(Number).filter(idx => idx > itemIndex).sort((a, b) => a - b);
                            const nextIndex = keys[0];
                            if (nextIndex !== undefined && quantityInputRefs.current[nextIndex]) {
                              requestAnimationFrame(() => {
                                const nextInput = quantityInputRefs.current[nextIndex];
                                if (nextInput && typeof nextInput.focus === 'function') {
                                  nextInput.focus();
                                  if (typeof nextInput.select === 'function') nextInput.select();
                                }
                              });
                            }
                          }}
                          handlePorcionamentoInputChange={handlePorcionamentoInputChangeLocal}
                          handlePorcionamentoBlur={commitPorcionamentoChange}
                          handlePorcionamentoFocus={handlePortioningFocus}
                          handlePorcionamentoEnterKey={(itemIndex) => { 
                            commitPorcionamentoChange(itemIndex);
                            const portioningKeys = Object.keys(portioningInputRefs.current || {}).map(Number).filter(idx => idx > itemIndex).sort((a,b)=>a-b);
                            const nextPortioningIndex = portioningKeys[0];
                            if(nextPortioningIndex !== undefined && portioningInputRefs.current[nextPortioningIndex]){
                                requestAnimationFrame(() => {
                                    const nextInput = portioningInputRefs.current[nextPortioningIndex];
                                    if(nextInput && typeof nextInput.focus === 'function'){
                                        nextInput.focus();
                                        if(typeof nextInput.select === 'function') nextInput.select();
                                    }
                                });
                            } else { 
                                const qtyKeys = Object.keys(quantityInputRefs.current || {}).map(Number).filter(idx => idx > itemIndex).sort((a, b) => a - b);
                                const nextQtyIndex = qtyKeys[0];
                                if (nextQtyIndex !== undefined && quantityInputRefs.current[nextQtyIndex]) {
                                  requestAnimationFrame(() => {
                                    const nextInput = quantityInputRefs.current[nextQtyIndex];
                                    if (nextInput && typeof nextInput.focus === 'function') {
                                      nextInput.focus();
                                      if (typeof nextInput.select === 'function') nextInput.select();
                                    }
                                  });
                                }
                            }
                          }}
                          handleUnitTypeChange={handleUnitTypeChangeLocal}
                          handleItemNotesChange={handleItemNotesChangeLocal}
                          formatWeight={utilFormatWeight}
                          calculateTotalWeight={calculateTotalWeightForOrderItem}
                          formatCurrency={utilFormatCurrency}
                          formattedQuantity={utilFormattedQuantity}
                          parseQuantity={utilParseQuantity}
                          quantityInputRefs={quantityInputRefs}
                          portioningInputRefs={portioningInputRefs} 
                        />

                        <div className="border-t border-slate-200 bg-white">
                          <div className="p-4 md:p-6 max-w-full mx-auto"> {/* Removido max-w-5xl para ocupar mais espaço */}
                            <div className="flex flex-col lg:flex-row items-start gap-6 lg:gap-8">
                              <div className="flex-1 w-full lg:min-w-[300px]">
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações Gerais do Pedido</label>
                                <Textarea
                                  value={currentOrder?.general_notes || ""}
                                  onChange={(e) => handleGeneralNotesChangeLocal(e.target.value)}
                                  onBlur={() => { 
                                    if(dirtyOrderRef.current) saveOrder(dirtyOrderRef.current);
                                  }}
                                  placeholder="Adicione observações gerais sobre o pedido aqui..."
                                  className="min-h-[100px] resize-y border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm" /* Estilo de textarea melhorado */
                                  rows={4}
                                />
                              </div>
                              <div className="w-full lg:w-auto lg:min-w-[280px] mt-4 lg:mt-0">
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 shadow"> {/* Sombra mais sutil no card de resumo */}
                                  <h3 className="text-base font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-200">Resumo Financeiro do Pedido</h3>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">Refeições:</span>
                                        <span className="font-medium text-slate-800">{currentOrder?.total_meals_expected || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">Subtotal Pedidos:</span>
                                        <span className="font-medium text-blue-600">{utilFormatCurrency(orderTotal.amount)}</span>
                                    </div>
                                    {wasteTotalForWeek > 0 && (
                                        <div className="flex justify-between items-center">
                                        <span className="text-sm text-red-500">Abatimento Sobras (Semana):</span>
                                        <span className="font-medium text-red-600">-{utilFormatCurrency(wasteTotalForWeek)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                                        <span className="text-sm font-semibold text-slate-700">Valor Líquido (Pedido - Sobras):</span>
                                        <span className={`text-lg font-bold ${netValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {utilFormatCurrency(netValue)}
                                        </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : currentTab === "waste" ? (
                  <WasteRegister
                    customer={selectedCustomer}
                    dayIndex={currentDay}
                    currentDate={currentDate}
                    recipes={recipes}
                    menuData={getMenuForDay(currentDay, weeklyMenus)?.menu_data?.[currentDay]}
                    menu_id={getMenuForDay(currentDay, weeklyMenus)?.id}
                    existingWaste={wasteRecords[selectedCustomer?.id]?.[currentDay]}
                    onWasteChange={handleWasteChange} 
                    orders={orders}
                  />
                ) : (
                  <div className="flex h-full flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                     {/* Placeholder para futuras abas se necessário */}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <PeriodReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        onSubmit={handleGenerateReport}
        customerName={selectedCustomer?.name}
        isGenerating={isGeneratingReport} 
      />
    </div>
  );
}
