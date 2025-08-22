'use client';
// Navegação e carregamento otimizados - v1.1

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfWeek, getWeek, getYear, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";



// Entities
import { 
  Customer, 
  Recipe, 
  WeeklyMenu, 
  Order, 
  OrderReceiving, 
  OrderWaste 
} from "@/app/api/entities";

// Sistema de Sugestões
import { AppSettings } from "@/app/api/entities";
import { OrderSuggestionManager } from '@/lib/order-suggestions';

// Componentes UI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Icons
import {
  ChefHat,
  ShoppingCart,
  Package,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  Send,
  Utensils,
  AlertTriangle,
  Loader2,
  Check,
  X,
  CheckCircle
} from "lucide-react";

// Utilitários
import { 
  parseQuantity as utilParseQuantity, 
  formattedQuantity as utilFormattedQuantity, 
  formatCurrency as utilFormatCurrency, 
  formatWeight as utilFormatWeight,
  sumCurrency as utilSumCurrency 
} from "@/components/utils/orderUtils";
import { CategoryLogic } from "@/components/utils/categoryLogic";

import { useCategoryDisplay } from "@/hooks/shared/useCategoryDisplay";
import { getRecipeUnitType } from "@/lib/unitTypeUtils";


// Utilitário para cálculos de depreciação
import { 
  calculateTotalDepreciation, 
  calculateNonReceivedDiscounts,
  calculateFinalOrderValue,
  formatCurrency as returnFormatCurrency,
  formatQuantity as returnFormatQuantity
} from "@/lib/returnCalculator";

// Tab Components
import OrdersTab from "./tabs/OrdersTab";
import ReceivingTab from "./tabs/ReceivingTab";
import WasteTab from "./tabs/WasteTab";
import HistoryTab from "./tabs/HistoryTab";

// Refresh Button
import { RefreshButton } from "@/components/ui/refresh-button";

// Sistema centralizado de preços temporário
import PortalPricingSystem from "@/lib/portal-pricing";
import { PortalDataSync } from "@/lib/portal-data-sync";
import { calculateTotalWeight } from "@/lib/weightCalculator";





const MobileOrdersPage = ({ customerId }) => {
  const { toast } = useToast();
  const { groupItemsByCategory, getOrderedCategories, generateCategoryStyles } = useCategoryDisplay();
  
  // Estados principais
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date();
  });
  const [customer, setCustomer] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [weeklyMenus, setWeeklyMenus] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [existingOrders, setExistingOrders] = useState({});
  const [hydratedOrders, setHydratedOrders] = useState({}); // Pedidos com preços atualizados
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState({ operational_cost_per_kg: 0, profit_margin: 0 });
  const [pricingReady, setPricingReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = () => setRefreshTrigger(p => p + 1);
  
  // UI States
  const [activeTab, setActiveTab] = useState("orders");
  const [mealsExpected, setMealsExpected] = useState(0);
  const [generalNotes, setGeneralNotes] = useState("");
  const [isEditMode, setIsEditMode] = useState(true);
  const [showSuccessEffect, setShowSuccessEffect] = useState(false);
  const [showReceivingSuccessEffect, setShowReceivingSuccessEffect] = useState(false);
  const [showWasteSuccessEffect, setShowWasteSuccessEffect] = useState(false);
  
  // Estados de edição para outras abas
  const [isReceivingEditMode, setIsReceivingEditMode] = useState(true);
  const [isWasteEditMode, setIsWasteEditMode] = useState(true);
  
  // Estados para Sobras
  const [wasteItems, setWasteItems] = useState([]);
  const [wasteNotes, setWasteNotes] = useState("");
  const [existingWaste, setExistingWaste] = useState(null);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [weeklyWasteData, setWeeklyWasteData] = useState({});

  // Estados para Recebimento
  const [receivingItems, setReceivingItems] = useState([]);
  const [receivingNotes, setReceivingNotes] = useState("");
  const [existingReceiving, setExistingReceiving] = useState(null);
  const [receivingLoading, setReceivingLoading] = useState(false);

  // Calculados
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekNumber = useMemo(() => getWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const year = useMemo(() => getYear(currentDate), [currentDate]);

  // Dias da semana
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = addDays(weekStart, i);
      days.push({
        date,
        dayNumber: i + 1,
        dayName: format(date, 'EEEE', { locale: ptBR }),
        dayShort: format(date, 'EEE', { locale: ptBR }),
        dayDate: format(date, 'dd/MM', { locale: ptBR })
      });
    }
    return days;
  }, [weekStart]);

  // Função para obter o dia da semana atual (1 = Segunda, 2 = Terça, etc.)
  const getCurrentWeekDay = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    
    // Converter para formato do sistema (1 = Segunda, 2 = Terça, etc.)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Domingo ou Sábado - vai para Segunda (1)
      return 1;
    }
    return dayOfWeek; // 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta
  }, []);

  const [selectedDay, setSelectedDay] = useState(1); // Será definido após carregar dados
  const [hasInitializedDay, setHasInitializedDay] = useState(false);
  

  // Carregar pedidos existentes da semana
  const loadExistingOrders = useCallback(async () => {
    //console.log('📋 [loadExistingOrders] Executando...');
    //console.log('📅 [loadExistingOrders] Semana:', weekNumber, 'Ano:', year, 'Dia selecionado:', selectedDay);
    if (!customer) {
      //console.log('❌ [loadExistingOrders] Saindo - sem customer');
      return;
    }
    
    try {
      const orders = await Order.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year }
      ]);
      //console.log('📋 [loadExistingOrders] Pedidos encontrados:', orders.length);
      
      // Organizar por dia da semana
      const ordersByDay = {};
      orders.forEach(order => {
        ordersByDay[order.day_of_week] = order;
      });
      
      setExistingOrders(ordersByDay);
      //console.log('📋 [loadExistingOrders] Pedidos organizados por dia:', Object.keys(ordersByDay));
      
      // Definir mealsExpected baseado no pedido do dia atual
      const currentDayOrder = ordersByDay[selectedDay];
      if (currentDayOrder) {
        
        setMealsExpected(currentDayOrder.total_meals_expected || 0);
        setGeneralNotes(currentDayOrder.general_notes || "");
        
        const isComplete = isCompleteOrder(currentDayOrder);
        setIsEditMode(!isComplete);
      } else {
        setMealsExpected(0);
        setGeneralNotes("");
        setIsEditMode(true);
      }
      
    } catch (error) {
    }
  }, [customer, weekNumber, year, selectedDay]);

  // Funções para Sobras
  const loadWasteData = useCallback(async () => {
    if (!customer || !weeklyMenus.length || !recipes.length) return;

    setWasteLoading(true);
    try {
      // Buscar registro de sobra existente
      const existingWastes = await OrderWaste.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year },
        { field: 'day_of_week', operator: '==', value: selectedDay }
      ]);

      const wasteRecord = existingWastes.length > 0 ? existingWastes[0] : null;
      setExistingWaste(wasteRecord);
      setWasteNotes(wasteRecord?.general_notes || "");
      
      // Definir modo de edição baseado se já existe dados salvos (apenas se estiver na aba waste)
      if (activeTab === "waste") {
        setIsWasteEditMode(!wasteRecord);
      }

      // Criar itens simples baseados no cardápio
      const menu = weeklyMenus[0];
      const menuData = menu?.menu_data?.[selectedDay];
      
      if (!menuData) {
        setWasteItems([]);
        return;
      }

      const items = [];
      let uniqueCounter = 0;
      Object.entries(menuData).forEach(([categoryId, categoryData]) => {
        // Verificar se categoryData é um array direto ou tem propriedade items
        const itemsArray = Array.isArray(categoryData) ? categoryData : categoryData.items;
        
        if (itemsArray && Array.isArray(itemsArray)) {
          itemsArray.forEach(item => {
            // Verificar se deve incluir este item baseado em locations
            const itemLocations = item.locations;
            const shouldInclude = !itemLocations || itemLocations.length === 0 || 
                                 itemLocations.includes(customer.id);

            if (shouldInclude) {
              const recipe = recipes.find(r => r.id === item.recipe_id && r.active !== false);
              if (recipe) {
                const wasteItem = {
                  unique_id: `${item.recipe_id}_${uniqueCounter++}`,
                  recipe_id: recipe.id,
                  recipe_name: recipe.name,
                  category: recipe.category || categoryId,
                  internal_waste_quantity: 0,
                  client_returned_quantity: 0,
                  notes: "",
                  ordered_quantity: 0,
                  ordered_unit_type: getRecipeUnitType(recipe),
                  unit_price: 0,
                  total_price: 0
                };
                
                // Buscar informações do pedido para este item
                const existingOrder = existingOrders[selectedDay];
                if (existingOrder?.items) {
                  // Buscar por unique_id primeiro (mais preciso)
                  let orderItem = existingOrder.items.find(oi => oi.unique_id === wasteItem.unique_id);
                  if (!orderItem) {
                    // Fallback: buscar por recipe_id (para compatibilidade com dados antigos)
                    orderItem = existingOrder.items.find(oi => oi.recipe_id === recipe.id);
                  }
                  
                  if (orderItem) {
                    wasteItem.ordered_quantity = orderItem.quantity || 0;
                    wasteItem.ordered_unit_type = orderItem.unit_type || getRecipeUnitType(recipe);
                    
                    // Usar sistema centralizado para sincronizar preços com receita atual
                    const syncedItem = PortalPricingSystem.syncItemPricing({
                      ...wasteItem,
                      quantity: wasteItem.ordered_quantity,
                      unit_type: wasteItem.ordered_unit_type
                    }, recipe);
                    
                    wasteItem.unit_price = syncedItem.unit_price;
                    wasteItem.total_price = syncedItem.total_price;
                  }
                }
                
                // Se há dados salvos, usar eles
                if (wasteRecord?.items) {
                  let saved = wasteRecord.items.find(s => s.unique_id === wasteItem.unique_id);
                  if (!saved) {
                    // Fallback: buscar por recipe_id (para compatibilidade)
                    saved = wasteRecord.items.find(s => s.recipe_id === recipe.id);
                  }
                  
                  if (saved) {
                    wasteItem.internal_waste_quantity = saved.internal_waste_quantity || 0;
                    wasteItem.client_returned_quantity = saved.client_returned_quantity || 0;
                    wasteItem.notes = saved.notes || "";
                  }
                }
                
                items.push(wasteItem);
              }
            }
          });
        }
      });

      setWasteItems(items);
    } catch (error) {
      toast({ variant: "destructive", description: "Erro ao carregar dados de sobras." });
    } finally {
      setWasteLoading(false);
    }
  }, [activeTab, customer, weeklyMenus, recipes, weekNumber, year, selectedDay, existingOrders, toast]);

  // Funções para Recebimento
  const loadReceivingData = useCallback(async () => {
    if (!customer || !weeklyMenus.length || !recipes.length) {
      return;
    }
    setReceivingLoading(true);
    try {
      // Buscar registro de recebimento existente
      const existingReceivings = await OrderReceiving.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year },
        { field: 'day_of_week', operator: '==', value: selectedDay }
      ]);

      const receivingRecord = existingReceivings.length > 0 ? existingReceivings[0] : null;
      setExistingReceiving(receivingRecord);
      setReceivingNotes(receivingRecord?.general_notes || "");
      
      // Definir modo de edição baseado se já existe dados salvos (apenas se estiver na aba receive)
      if (activeTab === "receive") {
        setIsReceivingEditMode(!receivingRecord);
      }

      // Criar itens de recebimento baseados no cardápio (como a aba de pedidos)
      const menu = weeklyMenus[0];
      const menuData = menu?.menu_data?.[selectedDay];
      
      
      if (!menuData) {
        setReceivingItems([]);
        return;
      }

      const items = [];
      let uniqueCounter = 0;
      Object.entries(menuData).forEach(([categoryId, categoryData]) => {
        // Verificar se categoryData é um array direto ou tem propriedade items
        const itemsArray = Array.isArray(categoryData) ? categoryData : categoryData.items;
        
        if (itemsArray && Array.isArray(itemsArray)) {
          itemsArray.forEach((item) => {
            // Verificar se deve incluir este item baseado em locations
            const itemLocations = item.locations;
            const shouldInclude = !itemLocations || itemLocations.length === 0 || 
                                 itemLocations.includes(customer.id);

            if (shouldInclude) {
              const recipe = recipes.find(r => r.id === item.recipe_id && r.active !== false);
              if (recipe) {
                const containerType = getRecipeUnitType(recipe);

                const receivingItem = {
                  unique_id: `${item.recipe_id}_${uniqueCounter++}`,
                  recipe_id: item.recipe_id,
                  recipe_name: recipe.name,
                  category: recipe.category || categoryId,
                  ordered_quantity: 0, // padrão
                  ordered_unit_type: containerType,
                  status: 'pending', // pending, received, partial
                  received_quantity: 0, // padrão
                  notes: ""
                };
                
                // Se há pedido existente, usar os dados do pedido
                const existingOrder = existingOrders[selectedDay];
                if (existingOrder?.items) {
                  // Buscar o item correspondente usando unique_id primeiro, depois recipe_id
                  let orderItem = existingOrder.items.find(oi => oi.unique_id === receivingItem.unique_id);
                  if (!orderItem) {
                    // Fallback: buscar por recipe_id (para compatibilidade com dados antigos)
                    orderItem = existingOrder.items.find(oi => oi.recipe_id === item.recipe_id);
                  }
                  
                  if (orderItem) {
                    receivingItem.ordered_quantity = orderItem.quantity;
                    receivingItem.ordered_unit_type = orderItem.unit_type;
                    receivingItem.received_quantity = orderItem.quantity; // default para quantidade pedida
                    
                    // Usar sistema centralizado para sincronizar preços com receita atual
                    const syncedItem = PortalPricingSystem.syncItemPricing({
                      ...receivingItem,
                      quantity: receivingItem.ordered_quantity,
                      unit_type: receivingItem.ordered_unit_type
                    }, recipe);
                    
                    receivingItem.unit_price = syncedItem.unit_price;
                    receivingItem.total_price = syncedItem.total_price;
                  }
                }
                
                // Se há dados salvos de recebimento, usar eles
                if (receivingRecord?.items) {
                  let saved = receivingRecord.items.find(s => s.unique_id === receivingItem.unique_id);
                  if (!saved) {
                    // Fallback: buscar por recipe_id (para compatibilidade)
                    saved = receivingRecord.items.find(s => s.recipe_id === item.recipe_id);
                  }
                  
                  if (saved) {
                    receivingItem.status = saved.status || 'pending';
                    receivingItem.received_quantity = saved.received_quantity || receivingItem.received_quantity;
                    receivingItem.notes = saved.notes || "";
                  }
                }
                
                items.push(receivingItem);
              }
            }
          });
        }
      });

      setReceivingItems(items);
    } catch (error) {
      toast({ variant: "destructive", description: "Erro ao carregar dados de recebimento." });
    } finally {
      setReceivingLoading(false);
    }
  }, [activeTab, customer, weeklyMenus, recipes, weekNumber, year, selectedDay, existingOrders, toast]);

  const updateReceivingItem = useCallback((index, field, value) => {
    setReceivingItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      
      if (field === 'received_quantity') {
        item.received_quantity = Math.max(0, utilParseQuantity(value) || 0);
        // Atualizar status baseado na quantidade recebida
        if (item.received_quantity === 0) {
          item.status = 'not_received';
        } else if (item.received_quantity === item.ordered_quantity) {
          item.status = 'received';
        } else {
          item.status = 'partial';
        }
      } else if (field === 'status') {
        item.status = value;
        // Ajustar quantidade baseada no status
        if (value === 'received') {
          item.received_quantity = item.ordered_quantity;
        } else if (value === 'not_received') {
          item.received_quantity = 0;
        }
        // Para partial, mantém a quantidade atual
      } else {
        item[field] = value;
      }
      
      updatedItems[index] = item;
      return updatedItems;
    });
  }, []);

  const markAllAsReceived = useCallback(() => {
    setReceivingItems(prevItems => 
      prevItems.map(item => ({
        ...item,
        status: 'received',
        received_quantity: item.ordered_quantity
      }))
    );
  }, []);

  const saveReceivingData = useCallback(async () => {
    if (!customer || receivingItems.length === 0) return;

    try {
      // Verificar se é um registro vazio (para deletar)
      const isEmpty = receivingItems.every(item => item.status === 'pending') && 
                     (!receivingNotes || receivingNotes.trim() === '');
      
      // Sempre ativar efeito de sucesso no início
      setShowReceivingSuccessEffect(true);
      setTimeout(() => {
        setShowReceivingSuccessEffect(false);
        setIsReceivingEditMode(false); // Sair do modo de edição após o sucesso
      }, 2000);

      if (existingReceiving) {
        if (isEmpty) {
          // Deletar registro vazio
          await OrderReceiving.delete(existingReceiving.id);
          toast({ 
            description: "Registro de recebimento vazio foi removido.",
            className: "border-blue-200 bg-blue-50 text-blue-800"
          });
          setExistingReceiving(null);
        } else {
          // Atualizar registro existente
          await OrderReceiving.update(existingReceiving.id, {
            items: receivingItems,
            general_notes: receivingNotes
          });
          toast({ 
            description: "Recebimento atualizado com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        }
      } else {
        if (!isEmpty) {
          // Criar novo registro
          const newReceiving = await OrderReceiving.create({
            customer_id: customer.id,
            customer_name: customer.name,
            week_number: weekNumber,
            year: year,
            day_of_week: selectedDay,
            date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"),
            items: receivingItems,
            general_notes: receivingNotes
          });
          setExistingReceiving(newReceiving);
          toast({ 
            description: "Recebimento registrado com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        } else {
          toast({ 
            description: "Nenhum recebimento para registrar.",
            className: "border-gray-200 bg-gray-50 text-gray-800"
          });
        }
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro ao Salvar Recebimento", 
        description: error.message 
      });
    }
  }, [customer, receivingItems, receivingNotes, existingReceiving, weekNumber, year, selectedDay, weekStart, toast]);

  const updateWasteItem = useCallback((index, field, value) => {
    setWasteItems(prevItems => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };
      
      if (field === 'internal_waste_quantity' || field === 'client_returned_quantity') {
        item[field] = Math.max(0, utilParseQuantity(value) || 0);
      } else {
        item[field] = value;
      }
      
      updatedItems[index] = item;
      return updatedItems;
    });
  }, []);

  const saveWasteData = useCallback(async () => {
    if (!customer || wasteItems.length === 0) return;

    try {
      // Verificar se é um registro vazio (para deletar)
      const isEmpty = wasteItems.every(item => 
        (item.internal_waste_quantity || 0) === 0 && 
        (item.client_returned_quantity || 0) === 0
      ) && (!wasteNotes || wasteNotes.trim() === '');

      // Sempre ativar efeito de sucesso no início
      setShowWasteSuccessEffect(true);
      setTimeout(() => {
        setShowWasteSuccessEffect(false);
        setIsWasteEditMode(false); // Sair do modo de edição após o sucesso
      }, 2000);

      if (existingWaste) {
        if (isEmpty) {
          // Deletar registro vazio
          await OrderWaste.delete(existingWaste.id);
          toast({ 
            description: "Registro de sobra vazio foi removido.",
            className: "border-amber-200 bg-amber-50 text-amber-800"
          });
          setExistingWaste(null);
        } else {
          // Atualizar registro existente
          await OrderWaste.update(existingWaste.id, {
            items: wasteItems,
            general_notes: wasteNotes
          });
          toast({ 
            description: "Sobras atualizadas com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        }
      } else {
        if (!isEmpty) {
          // Criar novo registro
          const newWaste = await OrderWaste.create({
            customer_id: customer.id,
            customer_name: customer.name,
            week_number: weekNumber,
            year: year,
            day_of_week: selectedDay,
            date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"),
            items: wasteItems,
            general_notes: wasteNotes
          });
          setExistingWaste(newWaste);
          toast({ 
            description: "Sobras registradas com sucesso!",
            className: "border-green-200 bg-green-50 text-green-800"
          });
        } else {
          toast({ 
            description: "Nenhuma sobra para registrar.",
            className: "border-gray-200 bg-gray-50 text-gray-800"
          });
        }
      }
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Erro ao Salvar Sobras", 
        description: error.message 
      });
    }
  }, [customer, wasteItems, wasteNotes, existingWaste, weekNumber, year, selectedDay, weekStart, toast]);

  // Carregar dados de waste da semana inteira para histórico
  const loadWeeklyWasteData = useCallback(async () => {
    if (!customer) return;
    
    try {
      // Buscar todos os registros de sobra da semana
      const weeklyWastes = await OrderWaste.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year }
      ]);
      
      // Organizar por dia da semana
      const wasteDataByDay = {};
      weeklyWastes.forEach(waste => {
        wasteDataByDay[waste.day_of_week] = waste;
      });
      
      setWeeklyWasteData(wasteDataByDay);
    } catch (error) {
    }
  }, [customer, weekNumber, year]);




  // Carregamento inicial
  useEffect(() => {
    const loadInitialData = async () => {
      if (!customerId) {
        return;
      }


      try {
        setLoading(true);
        
        // Carregar cliente
        const customerData = await Customer.getById(customerId);
        setCustomer(customerData);

        // Carregar receitas
        const recipesData = await Recipe.list();
        const activeRecipes = recipesData.filter(r => r.active !== false);
        setRecipes(recipesData);

        // Carregar AppSettings e inicializar PortalPricingSystem
        const appSettingsDoc = await AppSettings.getById('global'); // Assuming 'global' ID
        let newAppSettings = { operational_cost_per_kg: 0, profit_margin: 0 };
        if (appSettingsDoc) {
          newAppSettings = {
            operational_cost_per_kg: appSettingsDoc.operational_cost_per_kg || 0,
            profit_margin: appSettingsDoc.profit_margin || 0
          };
        }
        setAppSettings(newAppSettings);
        PortalPricingSystem.init(newAppSettings); // Initialize PortalPricingSystem
        setPricingReady(true);

      } catch (error) {
        toast({ 
          variant: "destructive", 
          title: "Erro no Carregamento", 
          description: "Falha ao carregar dados iniciais" 
        });
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      loadInitialData();
    }
  }, [customerId]); // ✅ CORRIGIDO: só executa uma vez por cliente

  // Define a função de busca de dados como um useCallback
  const fetchData = useCallback(async (dateToFetch) => { // Recebe a data como argumento
    toast({ description: "Atualizando todos os dados...", duration: 2500 });
    setLoading(true);
    try {
      const weekNumberForFetch = getWeek(dateToFetch, { weekStartsOn: 1 });
      const yearForFetch = getYear(dateToFetch);

      // 1. Recarregar Receitas
      const recipesData = await Recipe.list();
      console.log('DEBUG PREÇO: fetchData - recipesData fetched:', recipesData.length, 'recipes');
      const saladaAbobrinhaRecipe = recipesData.find(r => r.name === 'S. Abobrinha'); // Assuming 'S. Abobrinha' is the exact name
      if (saladaAbobrinhaRecipe) {
        console.log('DEBUG PREÇO: fetchData - Salada Abobrinha recipe data:', JSON.stringify(saladaAbobrinhaRecipe, null, 2));
      }
      setRecipes(recipesData);

      // 2. Recarregar Cardápios da Semana
      const allMenus = await WeeklyMenu.list();
      const weekKey = `${yearForFetch}-W${String(weekNumberForFetch).padStart(2, '0')}`;
      const menusData = allMenus.filter(menu => menu.week_key === weekKey);
      console.log('DEBUG PREÇO: fetchData - menusData fetched:', menusData.length, 'menus');
      setWeeklyMenus(menusData);

      // 3. Recarregar Pedidos Existentes
      if (customer) {
        // Chamar a lógica de loadExistingOrders diretamente aqui, passando os parâmetros
        const orders = await Order.query([
          { field: 'customer_id', operator: '==', value: customer.id },
          { field: 'week_number', operator: '==', value: weekNumberForFetch },
          { field: 'year', operator: '==', value: yearForFetch }
        ]);
        const ordersByDay = {};
        orders.forEach(order => {
          ordersByDay[order.day_of_week] = order;
        });
        console.log('DEBUG PREÇO: fetchData - existingOrders fetched:', Object.keys(ordersByDay).length, 'orders');
        setExistingOrders(ordersByDay);
      }
      
      toast({
        title: "Dados atualizados!",
        description: "As informações foram recarregadas do servidor.",
        className: "border-green-200 bg-green-50 text-green-800"
      });

    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
    } finally {
      setLoading(false);
    }
  }, [customer, toast, setRecipes, setWeeklyMenus, setLoading, setExistingOrders]); // Dependências: apenas as estáveis e o customer

  // Efeito para atualização manual de dados
  useEffect(() => {
    if (refreshTrigger === 0) return; // Não executar na montagem inicial

    fetchData(currentDate); // Passa a currentDate atual para a função
  }, [refreshTrigger, fetchData, currentDate]); // Depende de refreshTrigger, fetchData (que é estável agora) e currentDate

  // Carregamento de cardápios quando semana muda
  useEffect(() => {
    //console.log('🔄 [loadWeeklyMenus] useEffect executado');
    //console.log('📅 [NAVEGAÇÃO] Data atual:', format(currentDate, 'dd/MM/yyyy'));
    //console.log('📅 [NAVEGAÇÃO] Semana:', weekNumber, 'Ano:', year);
    //console.log('👤 [NAVEGAÇÃO] Cliente:', customer?.name || 'Não carregado');
    
    const loadWeeklyMenus = async () => {
      //console.log('🔄 [loadWeeklyMenus] Iniciando carregamento...');
      if (!customerId || !customer) {
        //console.log('❌ [loadWeeklyMenus] Saindo - sem customerId ou customer');
        return;
      }

      // Limpar estado antes de carregar novo cardápio
      // As linhas abaixo foram comentadas em 22/08/2025 para evitar que o pedido seja apagado durante a atualização manual.
      // A lógica agora preserva o estado do pedido e apenas atualiza os dados do cardápio.
      // setCurrentOrder(null);
      // setExistingOrders({});

      try {
        const allMenus = await WeeklyMenu.list();
        
        const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;
        //console.log('🔍 [loadWeeklyMenus] Buscando cardápio com chave:', weekKey);
        const menusData = allMenus.filter(menu => menu.week_key === weekKey);
        //console.log('📋 [loadWeeklyMenus] Cardápios encontrados:', menusData.length);

        if (menusData.length > 0) {
          const menu = menusData[0];
          //console.log('✅ [loadWeeklyMenus] Cardápio encontrado para semana', weekNumber, '/', year);
          setWeeklyMenus(menusData);
          
          // Analisar estrutura do cardápio
          let totalRecipes = 0;
          let daysWithMenu = 0;
          let categoriesFound = new Set();
          let customerSpecificItems = 0;
          
          if (menu.menu_data) {
            Object.keys(menu.menu_data).forEach(dayKey => {
              const dayData = menu.menu_data[dayKey];
              if (dayData && Object.keys(dayData).length > 0) {
                daysWithMenu++;
                Object.values(dayData).forEach(categoryData => {
                  const itemsArray = Array.isArray(categoryData) ? categoryData : categoryData.items;
                  if (itemsArray && Array.isArray(itemsArray)) {
                    itemsArray.forEach(item => {
                      totalRecipes++;
                      if (item.category) categoriesFound.add(item.category);
                      
                      const itemLocations = item.locations;
                      const isForThisCustomer = !itemLocations || itemLocations.length === 0 || 
                                               itemLocations.includes(customer.id);
                      if (isForThisCustomer) customerSpecificItems++;
                    });
                  }
                });
              }
            });
          }
          
        } else {
          // Nenhum cardápio encontrado - resetar tudo
          //console.log('❌ [loadWeeklyMenus] Nenhum cardápio encontrado para semana', weekNumber, '/', year);
          setWeeklyMenus([]);
          setMealsExpected(0);
          setGeneralNotes("");
          setWasteItems([]);
          setReceivingItems([]);
          setExistingWaste(null);
          setExistingReceiving(null);
          setIsEditMode(true);
          setIsReceivingEditMode(true);
          setIsWasteEditMode(true);
          
          toast({
            variant: "destructive",
            title: "Cardápio Indisponível",
            description: `Nenhum cardápio encontrado para a semana ${weekNumber}/${year}.`
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro no Carregamento",
          description: "Falha ao carregar o cardápio da semana."
        });
      }
    };

    loadWeeklyMenus();
  }, [customerId, currentDate, customer]); // ✅ Usar currentDate diretamente para garantir recarregamento

  // Função para determinar qual dia selecionar baseado na semana
  // COMENTADO: Não força mais nenhum dia específico
  // const getInitialDay = useCallback(() => {
  //   const today = new Date();
  //   const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  //   const viewingWeekStart = weekStart;
  //   
  //   const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(viewingWeekStart, 'yyyy-MM-dd');
  //   
  //   if (isCurrentWeek) {
  //     return getCurrentWeekDay();
  //   } else {
  //     return selectedDay; // Mantém o dia selecionado
  //   }
  // }, [weekStart, getCurrentWeekDay, selectedDay]);

  // Inicialização de dia - executa APENAS após dados iniciais carregarem
  useEffect(() => {
    if (!loading && customer && recipes.length > 0 && weeklyMenus.length > 0 && !hasInitializedDay) {
      // Mantém o selectedDay já definido no useState
      setHasInitializedDay(true);
    }
  }, [loading, customer, recipes, weeklyMenus, hasInitializedDay]);

  // Detectar mudança de semana e resetar para segunda-feira
  // REMOVIDO: Agora o hook useNavigationSync gerencia isso

  // Preparar itens do pedido baseado no cardápio
      const orderItems = useMemo(() => {
    //console.log('🍽️ [orderItems] useMemo executado');
    //console.log('🍽️ [orderItems] WeeklyMenus:', weeklyMenus.length, 'Recipes:', recipes.length, 'Dia selecionado:', selectedDay);
    
    // Log específico para debugging do dia 26/08
    const currentDateStr = format(currentDate, 'dd/MM');
    if (currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) { // Segunda-feira é 1, terça é 2
      //console.log('🔍 [DEBUG 26/08] Data atual:', currentDateStr, 'Dia selecionado:', selectedDay);
      //console.log('🔍 [DEBUG 26/08] Customer:', customer?.name, customer?.id);
    }

    
    if (!weeklyMenus.length || !recipes.length || !customer) {
      //console.log('❌ [orderItems] Saindo - dados insuficientes');
      return [];
    }

    const menu = weeklyMenus[0];
    const menuData = menu?.menu_data?.[selectedDay];
    
    // Debug específico para o dia 26/08
    if (currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) {
      //console.log('📅 [DEBUG 26/08] Menu completo:', menu);
      //console.log('📅 [DEBUG 26/08] MenuData para dia', selectedDay, ':', menuData);
      if (menuData) {
        //console.log('📅 [DEBUG 26/08] Categorias encontradas:', Object.keys(menuData));
        Object.keys(menuData).forEach(cat => {
          if (cat.toLowerCase().includes('acompanhamento') || cat.toLowerCase().includes('acomp')) {
            //console.log('🥗 [DEBUG 26/08] Categoria acompanhamento RAW:', cat, menuData[cat]);
          }
        });
      }
    }
    
    if (!menuData) {
    //console.log('❌ [orderItems] Nenhum menu para o dia', selectedDay);
    if (currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) {
    //console.log('❌ [DEBUG 26/08] Menu_data completo:', menu?.menu_data);
    }
    return [];
    }

    const items = [];
    let uniqueCounter = 0;
    let processedItems = 0;
    let skippedItems = 0;
    let customerSpecificItems = 0;
    let conflictsDetected = [];

    Object.entries(menuData).forEach(([categoryId, categoryData]) => {
      const itemsArray = Array.isArray(categoryData) ? categoryData : categoryData.items;
      
      // Log específico para categoria acompanhamento no dia 26/08
      if ((currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) && 
          (categoryId.toLowerCase().includes('acompanhamento') || categoryId.toLowerCase().includes('acomp'))) {
        //console.log('🥗 [DEBUG 26/08] CATEGORIA ACOMPANHAMENTO encontrada:', categoryId);
        //console.log('🥗 [DEBUG 26/08] CategoryData:', categoryData);
        //console.log('🥗 [DEBUG 26/08] ItemsArray length:', itemsArray?.length);
        //console.log('🥗 [DEBUG 26/08] ItemsArray:', itemsArray);
      }
      
      if (itemsArray && Array.isArray(itemsArray)) {
        
        itemsArray.forEach((item, itemIndex) => {
          processedItems++;
          
          // Log específico para itens de acompanhamento no dia 26/08
          if ((currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) && 
              (categoryId.toLowerCase().includes('acompanhamento') || categoryId.toLowerCase().includes('acomp'))) {
            //console.log(`🥗 [DEBUG 26/08] Item ${itemIndex + 1} da categoria acompanhamento:`);
            //console.log(`🥗 [DEBUG 26/08]   - Recipe ID: ${item.recipe_id}`);
            //console.log(`🥗 [DEBUG 26/08]   - Locations: ${JSON.stringify(item.locations)}`);
            //console.log(`🥗 [DEBUG 26/08]   - Customer ID: ${customer.id}`);
          }
          
          // Verificar localização do item
          const itemLocations = item.locations;
          const shouldInclude = !itemLocations || itemLocations.length === 0 || 
                               itemLocations.includes(customer.id);

          if (!shouldInclude) {
            skippedItems++;
            // Log para items de acompanhamento excluídos
            if ((currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) && 
                (categoryId.toLowerCase().includes('acompanhamento') || categoryId.toLowerCase().includes('acomp'))) {
              //console.log(`❌ [DEBUG 26/08] Item EXCLUÍDO (localização): Recipe ID ${item.recipe_id}`);
              //console.log(`❌ [DEBUG 26/08] Motivo: Customer ${customer.id} não está nas locations: ${JSON.stringify(item.locations)}`);
            }
            return;
          }
          
          customerSpecificItems++;
          const recipe = recipes.find(r => r.id === item.recipe_id && r.active !== false);
          
          // Log para receita encontrada/não encontrada
          if ((currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) && 
              (categoryId.toLowerCase().includes('acompanhamento') || categoryId.toLowerCase().includes('acomp'))) {
            if (recipe) {
              //console.log(`✅ [DEBUG 26/08] Receita ENCONTRADA: ${recipe.name} (ID: ${recipe.id})`);
              //console.log(`✅ [DEBUG 26/08] Categoria da receita: ${recipe.category}`);
            } else {
              //console.log(`❌ [DEBUG 26/08] Receita NÃO ENCONTRADA: Recipe ID ${item.recipe_id}`);
              //console.log(`❌ [DEBUG 26/08] Receitas disponíveis:`, recipes.map(r => ({ id: r.id, name: r.name, active: r.active })));
            }
          }
          
          if (!recipe) {
            conflictsDetected.push({
              type: 'RECIPE_NOT_FOUND',
              recipeId: item.recipe_id,
              categoryId,
              itemIndex
            });
            return;
          }
          
          // Detectar conflitos de categoria
          if (recipe.category !== categoryId && recipe.category) {
            conflictsDetected.push({
              type: 'CATEGORY_MISMATCH',
              recipeId: item.recipe_id,
              recipeName: recipe.name,
              menuCategory: categoryId,
              recipeCategory: recipe.category
            });
          }
          
          const containerType = getRecipeUnitType(recipe);
          const unitPrice = PortalPricingSystem.recalculateItemUnitPrice(item, recipe, containerType);
          const cubaWeightParsed = utilParseQuantity(recipe.cuba_weight) || 0;
          
          const baseItem = {
            unique_id: `${item.recipe_id}_${uniqueCounter++}`,
            recipe_id: item.recipe_id,
            recipe_name: recipe.name,
            category: recipe.category || categoryId,
            unit_type: containerType,
            base_quantity: 0,
            quantity: 0,
            unit_price: unitPrice,
            total_price: 0,
            notes: "",
            cuba_weight: cubaWeightParsed,
            yield_weight: utilParseQuantity(recipe.yield_weight) || 0,
            total_weight: utilParseQuantity(recipe.total_weight) || 0,
            adjustment_percentage: 0
          };
          
          const syncedItem = PortalDataSync.syncItemSafely(baseItem, recipe);
          const newItem = CategoryLogic.calculateItemValues(syncedItem, 'base_quantity', 0, mealsExpected);
          
          items.push(newItem);
        });
      }
    });
    
    // Log final para o dia 26/08
    if (currentDateStr === '26/08' || selectedDay === 1 || selectedDay === 2) {
      //console.log('📈 [DEBUG 26/08] RESUMO FINAL:');
      //console.log('📈 [DEBUG 26/08] Total de itens processados:', processedItems);
      //console.log('📈 [DEBUG 26/08] Itens incluídos no pedido:', items.length);
      //console.log('📈 [DEBUG 26/08] Itens excluídos:', skippedItems);
      //console.log('📈 [DEBUG 26/08] Itens específicos do cliente:', customerSpecificItems);
      //console.log('📈 [DEBUG 26/08] Conflitos detectados:', conflictsDetected);
      
      const acompanhamentoItems = items.filter(item => 
        item.category?.toLowerCase().includes('acompanhamento') || 
        item.category?.toLowerCase().includes('acomp')
      );
      //console.log('🥗 [DEBUG 26/08] Itens de ACOMPANHAMENTO no resultado final:', acompanhamentoItems.length);
      acompanhamentoItems.forEach((item, idx) => {
        //console.log(`🥗 [DEBUG 26/08] Acomp ${idx + 1}: ${item.recipe_name} (${item.recipe_id})`);
      });
    }
    
    //console.log('✅ [orderItems] Itens processados:', items.length);
    return items;
  }, [weeklyMenus, recipes, customer, selectedDay, weekNumber, year, mealsExpected, appSettings, pricingReady]);

  const updateOrderItem = useCallback((uniqueId, field, value) => {
    setCurrentOrder(prev => {
      if (!prev?.items) return prev;
      const newItems = prev.items.map(item => {
        if (item.unique_id === uniqueId) {
          // Usar lógica centralizada para calcular valores
          return CategoryLogic.calculateItemValues(item, field, value, mealsExpected);
        }
        return item;
      });
      
      return { ...prev, items: newItems };
    });
  }, [mealsExpected]);

  // Recalcular itens quando mealsExpected mudar
  useEffect(() => {
    if (currentOrder?.items && mealsExpected) {
      let hasChanges = false;
      const updatedItems = currentOrder.items.map(item => {
        // Recalcular apenas itens que dependem de refeições esperadas (unidade = unid)
        const unitType = (item.unit_type || '').toLowerCase();
        if (unitType === 'unid' || unitType === 'unid.' || unitType === 'unidade') {
          const recalculatedItem = CategoryLogic.calculateItemValues(item, 'base_quantity', item.base_quantity, mealsExpected);
          if (JSON.stringify(recalculatedItem) !== JSON.stringify(item)) {
            hasChanges = true;
          }
          return recalculatedItem;
        }
        return item;
      });
      
      // Só atualizar se realmente houve mudanças para evitar loop infinito
      if (hasChanges) {
        setCurrentOrder(prev => ({
          ...prev,
          items: updatedItems
        }));
      }
    }
  }, [mealsExpected]);

  // Carregar dados de sobras automaticamente para cálculo de descontos
  useEffect(() => {
    if (customer && weeklyMenus.length && recipes.length && hasInitializedDay) {
      loadWasteData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, selectedDay, weeklyMenus, recipes, existingOrders, hasInitializedDay, weekNumber, year]);

  // Carregar dados de recebimento automaticamente para cálculo de descontos
  useEffect(() => {
    if (customer && weeklyMenus.length && recipes.length && hasInitializedDay) {
      loadReceivingData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, selectedDay, weeklyMenus, recipes, existingOrders, hasInitializedDay, weekNumber, year]);

  // Carregar dados de waste da semana quando a aba history for selecionada OU semana muda
  useEffect(() => {
    if (activeTab === "history" && customer) {
      loadWeeklyWasteData();
    }
  }, [activeTab, customer, weekNumber, year, hasInitializedDay, loadWeeklyWasteData]);

  // Reset de efeitos visuais quando mudar de dia
  useEffect(() => {
    if (hasInitializedDay) {
      setShowSuccessEffect(false);
      setShowReceivingSuccessEffect(false);
      setShowWasteSuccessEffect(false);
      setIsReceivingEditMode(true);
      setIsWasteEditMode(true);
    }
  }, [hasInitializedDay, selectedDay]);

  // Inicializar pedido quando itens mudam
  useEffect(() => {
    const initKey = `${weekNumber}-${year}-${selectedDay}-${orderItems.length}`;
    //console.log('📝 [initializeOrder] useEffect executado com initKey:', initKey);
    //console.log('📝 [initializeOrder] hasInitializedDay:', hasInitializedDay);
    //console.log('📝 [initializeOrder] orderItems.length:', orderItems.length);
    
    // Só executar após inicialização do dia
    if (!hasInitializedDay) {
      //console.log('❌ [initializeOrder] Saindo - dia não inicializado');
      return;
    }
    
    // Evitar re-execuções desnecessárias

    
    // Se existe pedido salvo para este dia, usar ele
    if (existingOrders[selectedDay] && orderItems.length > 0) {
      const existingOrder = existingOrders[selectedDay];
      //console.log('📝 [initializeOrder] Usando pedido existente para dia', selectedDay);
      
      
      // SINCRONIZAR ITENS EXISTENTES com receitas atuais usando PortalDataSync
      const updatedItems = existingOrder.items.map((existingItem, index) => {
        
        // Encontrar item correspondente no menu atual (orderItems)
        const currentMenuItem = orderItems.find(oi => 
          oi.unique_id === existingItem.unique_id || 
          oi.recipe_id === existingItem.recipe_id
        );
        
        if (currentMenuItem) {
          // Usar item do menu atual como base e preservar apenas quantidade/ajustes do pedido salvo
          const mergedItem = {
            ...currentMenuItem, // Base do menu atual (observações limpas)
            quantity: existingItem.quantity || 0,
            base_quantity: existingItem.base_quantity || 0,
            adjustment_percentage: existingItem.adjustment_percentage || 0,
            unit_price: currentMenuItem.unit_price // Explicitly pass the correct unit_price
            // NÃO preservar notes - usar sempre o notes limpo do currentMenuItem
          };
          
          // Recalcular valores com as quantidades do pedido salvo
          const finalItem = CategoryLogic.calculateItemValues(mergedItem, 'quantity', mergedItem.quantity, mealsExpected);
          return finalItem;
        }
        
        // Fallback: item não existe no menu atual
        return existingItem;
      });
      
      // ADICIONAR ITENS NOVOS do cardápio que não existiam no pedido salvo
      const newItemsFromMenu = orderItems.filter(menuItem => {
        // Verificar se este item do cardápio já existe no pedido salvo
        const existsInSavedOrder = existingOrder.items.some(savedItem => 
          savedItem.unique_id === menuItem.unique_id || 
          savedItem.recipe_id === menuItem.recipe_id
        );
        return !existsInSavedOrder;
      });
      
      // Log para debug
      if (newItemsFromMenu.length > 0) {
        //console.log('🆕 [initializeOrder] Itens novos adicionados ao pedido:', newItemsFromMenu.length);
        newItemsFromMenu.forEach(item => {
          //console.log(`🆕 [initializeOrder] Novo item: ${item.recipe_name} (${item.recipe_id})`);
        });
      }
      
      // Merge: itens atualizados + novos itens do cardápio
      const allItems = [...updatedItems, ...newItemsFromMenu];
      
      const updatedOrder = {
        ...existingOrder,
        items: allItems
      };
      
      setCurrentOrder(updatedOrder);

    } else if (orderItems.length > 0 && (!currentOrder || currentOrder.day_of_week !== selectedDay)) {
      //console.log('🆕 [initializeOrder] Criando novo pedido para dia', selectedDay);
      
      // Criar novo pedido se não existe pedido salvo E (não existe currentOrder OU currentOrder é de outro dia)
      const newOrder = {
        customer_id: customer?.id,
        customer_name: customer?.name,
        day_of_week: selectedDay,
        week_number: weekNumber,
        year: year,
        date: format(addDays(weekStart, selectedDay - 1), "yyyy-MM-dd"),
        total_meals_expected: mealsExpected,
        general_notes: generalNotes,
        items: orderItems
      };
      setCurrentOrder(newOrder);

    } else {
      //console.log('🔄 [initializeOrder] Nenhuma ação necessária');
    }
  }, [hasInitializedDay, orderItems, selectedDay, weekNumber, year, existingOrders]);

  // Sincronizar wasteItems com orderItems atualizados (mesma lógica dos pedidos)
  useEffect(() => {
    if (!hasInitializedDay || wasteItems.length === 0 || orderItems.length === 0) return;
    
    const updatedWasteItems = wasteItems.map(wasteItem => {
      // Encontrar item correspondente nos orderItems atualizados (com preços novos)
      const currentOrderItem = orderItems.find(oi => 
        oi.unique_id === wasteItem.unique_id || 
        oi.recipe_id === wasteItem.recipe_id
      );
      
      if (currentOrderItem) {
        // Manter quantities e notas do waste, mas atualizar preços e unit_type
        return {
          ...wasteItem,
          unit_price: currentOrderItem.unit_price,
          ordered_unit_type: currentOrderItem.unit_type,
          total_price: (wasteItem.ordered_quantity || 0) * (currentOrderItem.unit_price || 0)
        };
      }
      return wasteItem;
    });
    
    // Usar JSON.stringify para uma comparação mais robusta e evitar loops infinitos
    if (JSON.stringify(updatedWasteItems) !== JSON.stringify(wasteItems)) {
      setWasteItems(updatedWasteItems);
    }
  }, [hasInitializedDay, wasteItems, orderItems]);

  // Sincronizar receivingItems com orderItems atualizados (mesma lógica dos pedidos)  
  useEffect(() => {
    if (!hasInitializedDay || receivingItems.length === 0 || orderItems.length === 0) return;
    
    const updatedReceivingItems = receivingItems.map(receivingItem => {
      // Encontrar item correspondente nos orderItems atualizados (com preços novos)
      const currentOrderItem = orderItems.find(oi => 
        oi.unique_id === receivingItem.unique_id || 
        oi.recipe_id === receivingItem.recipe_id
      );
      
      if (currentOrderItem) {
        // Manter quantities e status do receiving, mas atualizar preços e unit_type
        return {
          ...receivingItem,
          unit_price: currentOrderItem.unit_price,
          ordered_unit_type: currentOrderItem.unit_type,
          total_price: (receivingItem.ordered_quantity || 0) * (currentOrderItem.unit_price || 0)
        };
      }
      return receivingItem;
    });
    
    // Usar JSON.stringify para uma comparação mais robusta e evitar loops infinitos
    if (JSON.stringify(updatedReceivingItems) !== JSON.stringify(receivingItems)) {
      setReceivingItems(updatedReceivingItems);
    }
  }, [hasInitializedDay, receivingItems, orderItems]);

  // Hidratar todos os pedidos da semana com preços atualizados (para HistoryTab)
  useEffect(() => {
    if (!hasInitializedDay || !recipes || recipes.length === 0 || Object.keys(existingOrders).length === 0 || !pricingReady) {
      return;
    }
    
    const updatedOrders = {};
    
    Object.entries(existingOrders).forEach(([dayIndex, order]) => {
      if (order && order.items) {
        const hydratedItems = order.items.map(orderItem => {
          const recipe = recipes.find(r => r.id === orderItem.recipe_id);
          if (recipe) {
            const containerType = getRecipeUnitType(recipe);
            const unitPrice = PortalPricingSystem.recalculateItemUnitPrice(orderItem, recipe, containerType);
            
            return {
              ...orderItem,
              unit_price: unitPrice,
              unit_type: containerType,
              total_price: (orderItem.quantity || 0) * unitPrice
            };
          }
          return orderItem; // Manter item original se a receita não for encontrada
        });
        
        const newTotalAmount = utilSumCurrency(hydratedItems.map(item => item.total_price || 0));
        
        updatedOrders[dayIndex] = {
          ...order,
          items: hydratedItems,
          total_amount: newTotalAmount
        };
      } else {
        updatedOrders[dayIndex] = order;
      }
    });
    
    if (JSON.stringify(updatedOrders) !== JSON.stringify(hydratedOrders)) {
      setHydratedOrders(updatedOrders);
    }
  }, [hasInitializedDay, recipes, existingOrders, pricingReady, hydratedOrders]);

  // Calcular totais, depreciação por devoluções e descontos por não recebimento
  const orderTotals = useMemo(() => {
    if (!currentOrder?.items) return { 
      totalItems: 0, 
      totalAmount: 0, 
      depreciation: null,
      nonReceivedDiscounts: null,
      finalAmount: 0
    };
    
    const totalItems = currentOrder.items.reduce((sum, item) => {
      // Use quantity if available, otherwise use base_quantity as fallback
      const itemQuantity = item.quantity || item.base_quantity || 0;
      return sum + itemQuantity;
    }, 0);
    const totalAmount = utilSumCurrency(currentOrder.items.map(item => item.total_price || 0));
    
    // Debug simplificado
    if (process.env.NODE_ENV === 'development' && totalAmount > 500) {

    }
    
    // Usar calculadora centralizada de peso
    const totalWeight = calculateTotalWeight(currentOrder.items);
    
    // Calcular depreciação baseada nos itens devolvidos (wasteItems)
    const depreciationData = calculateTotalDepreciation(wasteItems || [], currentOrder.items || []);
    
    // Calcular descontos por itens não recebidos (receivingItems)
    const nonReceivedDiscountsData = calculateNonReceivedDiscounts(receivingItems || [], currentOrder.items || []);
    
    // Calcular valor final com ambos os descontos
    const finalOrderValue = calculateFinalOrderValue(
      totalAmount, 
      depreciationData.totalDepreciation,
      nonReceivedDiscountsData.totalNonReceivedDiscount
    );
    
    return { 
      totalItems, 
      totalAmount,
      totalWeight,
      depreciation: depreciationData,
      nonReceivedDiscounts: nonReceivedDiscountsData,
      finalAmount: finalOrderValue.finalTotal,
      originalAmount: totalAmount,
      depreciationAmount: depreciationData.totalDepreciation,
      nonReceivedDiscountAmount: nonReceivedDiscountsData.totalNonReceivedDiscount,
      totalDiscountAmount: finalOrderValue.totalDiscounts
    };
  }, [currentOrder, wasteItems, receivingItems]);

  const submitOrder = useCallback(async () => {
    if (!currentOrder || !customer) return;

    // Validar se refeições esperadas foi preenchido
    if (!mealsExpected || mealsExpected <= 0) {
      toast({ 
        variant: "destructive", 
        title: "Campo Obrigatório", 
        description: "Por favor, preencha o número de refeições esperadas antes de enviar o pedido." 
      });
      return;
    }

    try {
      // SINCRONIZAR UNIT_TYPES: Atualizar unit_type dos itens com dados atuais das receitas
      const syncItemsWithCurrentRecipes = (items) => {
        return items.map(item => {
          const recipe = recipes.find(r => r.id === item.recipe_id);
          if (recipe) {
            const currentUnitType = getRecipeUnitType(recipe);
            return {
              ...item,
              unit_type: currentUnitType // Sincronizar com ficha técnica atual
            };
          }
          return item;
        });
      };

      // Aplicar sincronização nos itens antes de salvar
      const syncedOrder = {
        ...currentOrder,
        items: syncItemsWithCurrentRecipes(currentOrder.items || [])
      };


      

      const orderData = {
        ...syncedOrder,
        total_meals_expected: mealsExpected,
        general_notes: generalNotes,
        total_items: orderTotals.totalItems,
        total_amount: orderTotals.totalAmount,
        final_amount: orderTotals.finalAmount,
        original_amount: orderTotals.originalAmount,
        depreciation_amount: orderTotals.depreciationAmount
      };

      if (existingOrders[selectedDay]) {
        await Order.update(existingOrders[selectedDay].id, orderData);
        toast({ description: "Pedido atualizado com sucesso!" });
      } else {
        const newOrder = await Order.create(orderData);
        setExistingOrders(prev => ({
          ...prev,
          [selectedDay]: newOrder
        }));
        toast({ description: "Pedido enviado com sucesso!" });
      }
      
      // Recarregar dados existentes para sincronizar as abas
      await loadExistingOrders();
      
      // Ativar efeito de sucesso e depois sair do modo de edição
      setShowSuccessEffect(true);
      setTimeout(() => {
        setShowSuccessEffect(false);
        setIsEditMode(false);
      }, 2000); // 2 segundos de efeito
      
    } catch (error) {
      toast({ variant: "destructive", description: "Erro ao enviar pedido. Tente novamente." });
    }
  }, [currentOrder, customer, mealsExpected, generalNotes, orderTotals, existingOrders, selectedDay, toast]);

  const enableEditMode = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const enableReceivingEditMode = useCallback(() => {
    setIsReceivingEditMode(true);
  }, []);

  const enableWasteEditMode = useCallback(() => {
    setIsWasteEditMode(true);
  }, []);

  /**
   * Determina se um pedido é considerado "completo" ou apenas parcial
   * Pedido parcial = apenas total_meals_expected preenchido, sem itens com quantidades
   * @param {Object} order - Pedido salvo original do banco (antes da população com menu)
   * @returns {boolean} true se é um pedido completo, false se apenas parcial
   */
  const isCompleteOrder = useCallback((order) => {
    if (!order) return false;
    
    // ✅ ESTRATÉGIA 1: Se não tem itens salvos, é apenas parcial
    if (!order.items || order.items.length === 0) {
      return false;
    }
    
    // ✅ ESTRATÉGIA 2: Verificar se algum item foi realmente preenchido pelo usuário
    const hasItemsWithQuantity = order.items.some(item => {
      const qty = utilParseQuantity(item.quantity) || utilParseQuantity(item.base_quantity) || 0;
      const adj = utilParseQuantity(item.adjustment_percentage) || 0;
      
      // Item é considerado preenchido se tem quantidade OU ajuste de porcionamento
      return qty > 0 || adj > 0;
    });
    
    return hasItemsWithQuantity;
  }, []);

  // ===== SISTEMA DE SUGESTÕES AUTOMÁTICAS =====
  
  // Estado para evitar execuções múltiplas
  const [isProcessingSuggestions, setIsProcessingSuggestions] = useState(false);
  
  /**
   * Aplica sugestões automaticamente quando as refeições esperadas mudam
   * Esta é a função principal que executa em background sem interface
   */
  const applyAutomaticSuggestions = useCallback(async (newMealsExpected) => {
    //console.log('🤖 [applyAutomaticSuggestions] Iniciando com:', newMealsExpected, 'Processando:', isProcessingSuggestions);
    
    // Proteção contra execuções múltiplas
    if (isProcessingSuggestions) {
      //console.log('⏹️ [applyAutomaticSuggestions] Já processando, ignorando...');
      return;
    }
    

    setIsProcessingSuggestions(true);
    
    if (!customer || !currentOrder?.items || !isEditMode) {

      setIsProcessingSuggestions(false);
      return;
    }
    
    // *** Limpar sugestões APENAS se refeições esperadas for explicitamente 0 ***
    if (newMealsExpected === 0) {
      //console.log('🗑️ [applyAutomaticSuggestions] Limpando sugestões (refeições = 0)');
      
      const clearedItems = currentOrder.items.map(item => {
        // Limpar sugestões mas manter valores existentes se usuário digitou
        const { suggestion, ...itemWithoutSuggestion } = item;
        return {
          ...itemWithoutSuggestion,
          total_meals_expected: 0
        };
      });
      
      setCurrentOrder(prevOrder => ({
        ...prevOrder,
        items: clearedItems,
        total_meals_expected: 0
      }));
      
      setIsProcessingSuggestions(false);
      return;
    }
    
    // *** Sair se valor for vazio/indefinido (aguardar usuário terminar de digitar) ***
    if (!newMealsExpected || newMealsExpected < 0) {
      //console.log('⏸️ [applyAutomaticSuggestions] Aguardando valor válido:', newMealsExpected);
      setIsProcessingSuggestions(false);
      return;
    }
    
    // *** NOVA LÓGICA: Sempre aplicar sugestões quando mudar refeições esperadas ***
    // Verificar se há itens que podem receber sugestões (vazios OU com valores existentes)
    const hasItemsForSuggestions = currentOrder.items.some(item => {
      const baseQty = utilParseQuantity(item.base_quantity) || 0;
      const adjustmentPct = utilParseQuantity(item.adjustment_percentage) || 0;
      // Aceitar tanto campos vazios quanto preenchidos para recalculo
      return baseQty >= 0 || (CategoryLogic.isCarneCategory(item.category) && adjustmentPct >= 0);
    });
    
    if (!hasItemsForSuggestions) {

      setIsProcessingSuggestions(false);
      return;
    }
    

    
    try {
      // IMPLEMENTAÇÃO CUSTOMIZADA: Gerar sugestões SEM aplicar nos inputs
      
      // 1. Carregar histórico
      //console.log('🗺 [DEBUG] Carregando histórico para cliente:', customer.id);
      const historicalOrders = await OrderSuggestionManager.loadHistoricalOrders(customer.id, 8);
      //console.log('🗺 [DEBUG] Histórico carregado:', historicalOrders.length, 'pedidos');
      
      if (historicalOrders.length === 0) {
        //console.log('⚠️ Sem histórico para gerar sugestões - CRIANDO SUGESTÕES DE TESTE');
        
        // 🧪 MODO DE TESTE: Criar sugestões artificiais para demonstrar a funcionalidade
        const testSuggestions = currentOrder.items.map(originalItem => {
          // Criar sugestões baseadas no tipo de unidade e nome da receita
          let suggestedQuantity = 0;
          
          if (originalItem.unit_type?.toLowerCase().includes('cuba')) {
            // Para cubas: simular ratio baseado no tipo de item
            if (originalItem.recipe_name?.toLowerCase().includes('arroz')) {
              suggestedQuantity = OrderSuggestionManager.roundToPracticalValue(newMealsExpected * 0.027, originalItem.unit_type); // ~4 cubas para 150
            } else if (originalItem.recipe_name?.toLowerCase().includes('feijão')) {
              suggestedQuantity = OrderSuggestionManager.roundToPracticalValue(newMealsExpected * 0.02, originalItem.unit_type); // ~3 cubas para 150
            } else if (originalItem.recipe_name?.toLowerCase().includes('salada') || originalItem.recipe_name?.toLowerCase().includes('alface')) {
              suggestedQuantity = OrderSuggestionManager.roundToPracticalValue(newMealsExpected * 0.02, originalItem.unit_type); // ~3 cubas para 150
            } else if (originalItem.recipe_name?.toLowerCase().includes('tomate')) {
              suggestedQuantity = OrderSuggestionManager.roundToPracticalValue(newMealsExpected * 0.007, originalItem.unit_type); // ~1 cuba para 150
            }
          } else if (originalItem.unit_type?.toLowerCase().includes('kg')) {
            // Para kg: simular ratios diferentes
            if (originalItem.recipe_name?.toLowerCase().includes('carne') || originalItem.recipe_name?.toLowerCase().includes('frango')) {
              suggestedQuantity = OrderSuggestionManager.roundToPracticalValue(newMealsExpected * 0.08, originalItem.unit_type); // ~12kg para 150
            } else if (originalItem.recipe_name?.toLowerCase().includes('soja')) {
              suggestedQuantity = OrderSuggestionManager.roundToPracticalValue(newMealsExpected * 0.033, originalItem.unit_type); // ~5kg para 150  
            } else {
              suggestedQuantity = OrderSuggestionManager.roundToPracticalValue(newMealsExpected * 0.02, originalItem.unit_type); // ~3kg para 150
            }
          }
          
          //console.log(`🧪 [TESTE] ${originalItem.recipe_name}: ${newMealsExpected} refeições → ${suggestedQuantity} ${originalItem.unit_type}`);
          
          return {
            ...originalItem,
            suggestion: suggestedQuantity > 0 ? {
              has_suggestion: true,
              confidence: 0.8, // Alta confiança para teste
              based_on_samples: 5, // Simular 5 amostras
              recent_samples: 3,
              suggested_base_quantity: suggestedQuantity,
              suggested_adjustment_percentage: originalItem.category?.toLowerCase().includes('carne') ? 15 : 0,
              meals_expected: newMealsExpected,
              source: 'teste_sem_historico'
            } : {
              has_suggestion: false,
              reason: 'teste_zero',
              confidence: 0
            }
          };
        });
        
        //console.log('🧪 [TESTE] Aplicando sugestões artificiais...');
        setCurrentOrder(prevOrder => ({
          ...prevOrder,
          items: testSuggestions,
          total_meals_expected: newMealsExpected
        }));
        
        setIsProcessingSuggestions(false);
        return;
      }
      
      // 2. Analisar padrões de consumo
      const consumptionPatterns = OrderSuggestionManager.analyzeConsumptionPatterns(historicalOrders);
      
      // 3. Gerar APENAS SUGESTÕES (sem aplicar valores)
      const itemsWithSuggestions = currentOrder.items.map(originalItem => {
        const recipeAnalysis = consumptionPatterns[originalItem.recipe_id];
        
        // Se não há dados históricos, manter item original
        if (!recipeAnalysis || recipeAnalysis.statistics.confidence < 0.25) {
          return {
            ...originalItem,
            suggestion: {
              has_suggestion: false,
              reason: recipeAnalysis ? 'baixa_confianca' : 'sem_historico',
              confidence: recipeAnalysis?.statistics?.confidence || 0
            }
          };
        }
        
        const stats = recipeAnalysis.statistics;
        
        // ✅ CALCULAR SUGESTÃO COM ARREDONDAMENTO CORRETO
        let suggestedBaseQuantity = stats.avg_ratio_per_meal * newMealsExpected;
        
        // Fallback para média direta se ratio é muito baixo
        if (suggestedBaseQuantity < 0.1 && stats.avg_base_quantity > 0) {
          suggestedBaseQuantity = stats.avg_base_quantity;
        }
        
        // 🔢 APLICAR ARREDONDAMENTO CORRETO
        suggestedBaseQuantity = OrderSuggestionManager.roundToPracticalValue(suggestedBaseQuantity, originalItem.unit_type);
        
        const suggestedAdjustmentPercentage = originalItem.category && 
          originalItem.category.toLowerCase().includes('carne') ? 
          Math.round(stats.avg_adjustment_percentage) : 0;
        
        // Retornar item original + dados de sugestão
        return {
          ...originalItem, // 📋 PRESERVAR valores originais dos inputs
          suggestion: {
            has_suggestion: true,
            confidence: stats.confidence,
            based_on_samples: stats.total_samples,
            recent_samples: stats.recent_samples,
            suggested_base_quantity: suggestedBaseQuantity,
            suggested_adjustment_percentage: suggestedAdjustmentPercentage,
            meals_expected: newMealsExpected,
            source: suggestedBaseQuantity > 0 ? 'customizado' : 'sem_sugestao'
          }
        };
      });
      
      const result = {
        success: true,
        items: itemsWithSuggestions,
        metadata: {
          historical_orders: historicalOrders.length,
          suggestions_applied: itemsWithSuggestions.filter(item => item.suggestion?.has_suggestion).length,
          message: 'Sugestões geradas com arredondamento correto'
        }
      };
      
      
      
      if (result.success) {
        // Os itens já vêm com sugestões anexadas e valores originais preservados
        //console.log('🎆 Sugestões geradas com arredondamento correto!');
        //console.log('📊 Total de sugestões:', result.metadata.suggestions_applied);
        
        // Debug: Mostrar TODAS as sugestões geradas
        //console.log('📋 [DEBUG-SUGGESTIONS] Lista completa de sugestões:');
        result.items.forEach((item, index) => {
          if (item.suggestion?.has_suggestion) {
            //console.log(`✅ [${index}] ${item.recipe_name}: ${item.suggestion.suggested_base_quantity} ${item.unit_type} (confiança: ${Math.round(item.suggestion.confidence * 100)}%)`);
          } else {
            //console.log(`❌ [${index}] ${item.recipe_name}: Sem sugestão (${item.suggestion?.reason || 'motivo desconhecido'})`);
          }
        });
        
        // Aplicar sugestões PRESERVANDO valores originais dos inputs
                setCurrentOrder(prevOrder => {
                    const newItems = prevOrder.items.map((item, index) => {
                        const suggestedItem = result.items[index];
                        return {
                            ...item, // Keep the current item state (with user input)
                            suggestion: suggestedItem.suggestion // Only update the suggestion
                        };
                    });

                    return {
                        ...prevOrder,
                        items: newItems,
                        total_meals_expected: newMealsExpected
                    };
                });
      } else {
        //console.log('⚠️ Erro ao gerar sugestões:', result.error);
        // Apenas atualizar refeições esperadas
        setCurrentOrder(prevOrder => ({
          ...prevOrder,
          total_meals_expected: newMealsExpected
        }));
      }
      
      // Finalizar processamento
      setIsProcessingSuggestions(false);
      
    } catch (error) {
      // Erro silencioso - não interromper a experiência do usuário
      setIsProcessingSuggestions(false);
    }
  }, [customer, currentOrder, isEditMode, toast, isProcessingSuggestions]);
  
  /**
   * Hook para aplicar sugestões quando as refeições esperadas mudam
   * Executa automaticamente em background
   */
  useEffect(() => {
    
    // *** NOVA LÓGICA: Executar tanto para aplicar (>0) quanto para limpar (=0) sugestões ***
    // Condições:
    // 1. Estamos em modo de edição 
    // 2. Há um pedido atual com itens
    // 3. O sistema foi inicializado
    // 4. mealsExpected mudou (pode ser 0 para limpar ou >0 para sugerir)
    if (isEditMode && currentOrder?.items?.length > 0 && hasInitializedDay) {
      // Debounce: esperar 300ms para resposta mais rápida
      const timeoutId = setTimeout(() => {
        applyAutomaticSuggestions(mealsExpected);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [mealsExpected, isEditMode, hasInitializedDay, applyAutomaticSuggestions]); // Incluído applyAutomaticSuggestions para reagir a mudanças
  
  // Carregar pedidos existentes quando customer muda OU semana muda OU dia muda
  useEffect(() => {
    //console.log('🔄 [loadExistingOrders-useEffect] Executando...');
    //console.log('🔄 [loadExistingOrders-useEffect] Customer:', customer?.name, 'HasInitialized:', hasInitializedDay);
    if (customer && hasInitializedDay) {
      loadExistingOrders();
    } else {
      //console.log('❌ [loadExistingOrders-useEffect] Condições não atendidas');
    }
  }, [customer, hasInitializedDay, weekNumber, year, selectedDay, loadExistingOrders]);

  if (!customerId) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">ID do Cliente Requerido</h3>
        <p className="text-gray-500">Por favor, forneça um ID de cliente válido.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChefHat className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Portal do Cliente</h1>
                <p className="text-sm text-gray-600">{customer?.name}</p>
              </div>
            </div>
            <RefreshButton 
              text="Atualizar"
              size="sm"
              className="shrink-0"
              onClick={handleRefresh}
            />
          </div>

          {/* Week Navigation */}
          <div className="space-y-3 mb-4">
            {/* Navigation Buttons Row */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                      //console.log('◀️ [NAVEGAÇÃO] Botão Semana Anterior clicado');
                      setCurrentDate(addDays(currentDate, -7));
                    }}
                className="flex items-center gap-1 text-xs px-2 py-1 h-8 flex-shrink-0"
              >
                <ChevronLeft className="w-3 h-3" />
                <span className="hidden sm:inline">Semana Anterior</span>
                <span className="sm:hidden">Anterior</span>
              </Button>
              
              <div className="text-center flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  Semana {weekNumber}/{year}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 6), "dd/MM")}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                      //console.log('▶️ [NAVEGAÇÃO] Botão Próxima Semana clicado');
                      setCurrentDate(addDays(currentDate, 7));
                    }}
                className="flex items-center gap-1 text-xs px-2 py-1 h-8 flex-shrink-0"
              >
                <span className="hidden sm:inline">Próxima Semana</span>
                <span className="sm:hidden">Próxima</span>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Days Selector Row */}
            <div className="flex gap-1 justify-center overflow-x-auto pb-1">
              {weekDays.map((day) => {
                // Verificar se é realmente o dia atual (data exata, não apenas número do dia)
                const today = new Date();
                const isCurrentDay = format(today, 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd');
                const isSelected = selectedDay === day.dayNumber;
                
                return (
                  <Button
                    key={day.dayNumber}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                        //console.log('🗓️ [NAVEGAÇÃO] Dia selecionado:', day.dayNumber, '(' + day.dayName + ')');
                        setSelectedDay(day.dayNumber);
                      }}
                    className={cn(
                      "flex flex-col h-14 w-14 p-1 text-xs relative flex-shrink-0",
                      isSelected && "bg-blue-600 text-white",
                      isCurrentDay && !isSelected && "border-blue-400 border-2"
                    )}
                  >
                    <span className="font-medium text-[10px]">{day.dayShort}</span>
                    <span className="text-[9px] opacity-80">{day.dayDate}</span>
                    {isCurrentDay && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="orders" className="flex items-center gap-1 text-xs p-1">
                <ShoppingCart className="w-4 h-4" />
                <span>Pedido</span>
              </TabsTrigger>
              <TabsTrigger value="receive" className="flex items-center gap-1 text-xs p-1">
                <Package className="w-4 h-4" />
                <span className="hidden xs:inline">Recebimento</span>
                <span className="xs:hidden">Receb.</span>
              </TabsTrigger>
              <TabsTrigger value="waste" className="flex items-center gap-1 text-xs p-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Sobras</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1 text-xs p-1">
                <CircleDollarSign className="w-4 h-4" />
                <span>Histórico</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === "orders" && (
          <OrdersTab
            key={`orders-${weekNumber}-${year}-${selectedDay}-${currentOrder?.total_amount || 0}`} // ✅ Força re-render quando semana/dia/pedido muda
            currentOrder={currentOrder}
            orderItems={orderItems}
            orderTotals={orderTotals}
            mealsExpected={mealsExpected}
            setMealsExpected={setMealsExpected}
            generalNotes={generalNotes}
            setGeneralNotes={setGeneralNotes}
            updateOrderItem={updateOrderItem}
            submitOrder={submitOrder}
            enableEditMode={enableEditMode}
            isEditMode={isEditMode}
            showSuccessEffect={showSuccessEffect}
            existingOrder={existingOrders[selectedDay]}
            wasteItems={wasteItems}
            existingWaste={existingWaste}
            groupItemsByCategory={groupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
          />
        )}

        {activeTab === "receive" && (
          <ReceivingTab
            key={`receive-${weekNumber}-${year}-${selectedDay}`} // ✅ Força re-render
            receivingLoading={receivingLoading}
            existingOrders={existingOrders}
            selectedDay={selectedDay}
            receivingItems={receivingItems}
            receivingNotes={receivingNotes}
            setReceivingNotes={setReceivingNotes}
            updateReceivingItem={updateReceivingItem}
            markAllAsReceived={markAllAsReceived}
            saveReceivingData={saveReceivingData}
            showSuccessEffect={showReceivingSuccessEffect}
            isEditMode={isReceivingEditMode}
            enableEditMode={enableReceivingEditMode}
            existingReceiving={existingReceiving}
            groupItemsByCategory={groupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
          />
        )}

        {activeTab === "waste" && (
          <WasteTab
            key={`waste-${weekNumber}-${year}-${selectedDay}`} // ✅ Força re-render
            wasteLoading={wasteLoading}
            wasteItems={wasteItems}
            wasteNotes={wasteNotes}
            setWasteNotes={setWasteNotes}
            updateWasteItem={updateWasteItem}
            saveWasteData={saveWasteData}
            showSuccessEffect={showWasteSuccessEffect}
            isEditMode={isWasteEditMode}
            enableEditMode={enableWasteEditMode}
            existingWaste={existingWaste}
            groupItemsByCategory={groupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            key={`history-${weekNumber}-${year}`} // ✅ Força re-render (sem selectedDay pois history é da semana toda)
            existingOrders={hydratedOrders}
            weekDays={weekDays}
            year={year}
            weekNumber={weekNumber}
            customer={customer}
            existingWasteData={weeklyWasteData}
            recipes={recipes}
            selectedDay={selectedDay}
          />
        )}
      </div>

      {/* Footer with totals and submit button */}
      {activeTab === "orders" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-600">
                {(orderTotals.depreciationAmount > 0 || orderTotals.nonReceivedDiscountAmount > 0) ? (
                  <div>
                    <div><span className="font-medium">Original:</span> {utilFormatCurrency(orderTotals.originalAmount)}</div>
                    {orderTotals.depreciationAmount > 0 && (
                      <div className="text-red-600"><span className="font-medium">Devolução (25%):</span> -{utilFormatCurrency(orderTotals.depreciationAmount)}</div>
                    )}
                    {orderTotals.nonReceivedDiscountAmount > 0 && (
                      <div className="text-orange-600"><span className="font-medium">Não recebido (100%):</span> -{utilFormatCurrency(orderTotals.nonReceivedDiscountAmount)}</div>
                    )}
                    <div className="font-bold"><span className="font-medium">Final:</span> {utilFormatCurrency(orderTotals.finalAmount)}</div>
                  </div>
                ) : (
                  <div><span className="font-medium">Total:</span> {utilFormatCurrency(orderTotals.totalAmount)}</div>
                )}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Peso:</span> {utilFormatWeight(orderTotals.totalWeight || 0)}
              </div>
            </div>
            {(isEditMode || showSuccessEffect) ? (
              <Button 
                onClick={submitOrder}
                className={`w-full text-white transition-all duration-500 ${
                  showSuccessEffect 
                    ? 'bg-green-600 hover:bg-green-700 scale-105 shadow-lg' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={orderTotals.totalAmount === 0 || showSuccessEffect || !mealsExpected || mealsExpected <= 0}
              >
                {showSuccessEffect ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
                    Pedido Enviado!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {existingOrders[selectedDay] ? 'Atualizar Pedido' : 'Enviar Pedido'}
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={enableEditMode}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={orderTotals.totalAmount === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Editar Pedido
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bottom spacing for fixed footer */}
      {activeTab === "orders" && <div className="h-24"></div>}
    </div>
  );
};

export default MobileOrdersPage;