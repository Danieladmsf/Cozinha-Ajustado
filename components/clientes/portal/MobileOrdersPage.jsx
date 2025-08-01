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
  formatWeight as utilFormatWeight 
} from "@/components/utils/orderUtils";

import { useCategoryDisplay } from "@/hooks/shared/useCategoryDisplay";

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

const MobileOrdersPage = ({ customerId }) => {
  const { toast } = useToast();
  const { groupItemsByCategory, getOrderedCategories, generateCategoryStyles } = useCategoryDisplay();
  
  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customer, setCustomer] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [weeklyMenus, setWeeklyMenus] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [existingOrders, setExistingOrders] = useState({});
  const [loading, setLoading] = useState(true);
  
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
    if (!customer) return;
    
    try {
      const orders = await Order.query([
        { field: 'customer_id', operator: '==', value: customer.id },
        { field: 'week_number', operator: '==', value: weekNumber },
        { field: 'year', operator: '==', value: year }
      ]);
      
      // Organizar por dia da semana
      const ordersByDay = {};
      orders.forEach(order => {
        ordersByDay[order.day_of_week] = order;
      });
      
      setExistingOrders(ordersByDay);
      
      
      // Se existe pedido para o dia atual, carregar ele
      const currentDayOrder = ordersByDay[selectedDay];
      if (currentDayOrder) {
        setCurrentOrder(currentDayOrder);
        setMealsExpected(currentDayOrder.total_meals_expected || 0);
        setGeneralNotes(currentDayOrder.general_notes || "");
        setIsEditMode(false);
      }
      
    } catch (error) {
      // Erro ao carregar pedidos existentes
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
                  ordered_unit_type: "kg"
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
                    wasteItem.ordered_unit_type = orderItem.unit_type || "kg";
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
                // Buscar container_type na estrutura correta
                console.log(`🔍 [DEBUG-RECEIVING] Buscando container_type para receita: ${recipe.name}`);
                console.log(`🔍 [DEBUG-RECEIVING] Recipe completa:`, recipe);
                
                let containerType = null;
                if (recipe.preparations && recipe.preparations.length > 0) {
                  const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                  console.log(`🔍 [DEBUG-RECEIVING] Última preparation:`, lastPrep);
                  if (lastPrep.assembly_config?.container_type) {
                    containerType = lastPrep.assembly_config.container_type.toLowerCase();
                    console.log(`🔍 [DEBUG-RECEIVING] Container_type encontrado em assembly_config: ${containerType}`);
                  }
                }
                
                // Se não encontrou, verificar se tem direto na receita
                if (!containerType) {
                  if (recipe.container_type) {
                    containerType = recipe.container_type.toLowerCase();
                    console.log(`🔍 [DEBUG-RECEIVING] Container_type encontrado direto na receita: ${containerType}`);
                  }
                }
                
                // Default final se nada for encontrado
                if (!containerType) {
                  containerType = "cuba";
                  console.log(`🔍 [DEBUG-RECEIVING] Usando container_type padrão: ${containerType}`);
                }
                
                console.log(`🔍 [DEBUG-RECEIVING] Container_type final: ${containerType}`);

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
      console.error('Erro ao carregar dados de sobra da semana:', error);
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
        setRecipes(recipesData);

        // Carregar cardápios da semana
        const allMenus = await WeeklyMenu.list();
        
        // Tentar buscar por week_number primeiro, depois por week_key
        let menusData = await WeeklyMenu.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ]);
        
        if (menusData.length === 0) {
          const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
          menusData = await WeeklyMenu.query([
            { field: 'week_key', operator: '==', value: weekKey }
          ]);
        }
        
        setWeeklyMenus(menusData);

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
  }, [customerId, weekNumber, year, toast]);

  // Função para determinar qual dia selecionar baseado na semana
  const getInitialDay = useCallback(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const viewingWeekStart = weekStart;
    
    // Verificar se estamos visualizando a semana atual
    const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(viewingWeekStart, 'yyyy-MM-dd');
    
    if (isCurrentWeek) {
      // Semana atual: ir para o dia atual
      return getCurrentWeekDay();
    } else {
      // Outras semanas: sempre ir para segunda-feira
      return 1;
    }
  }, [weekStart, getCurrentWeekDay]);

  // Auto-navegação para o dia correto - executa APENAS após dados iniciais carregarem
  useEffect(() => {
    if (!loading && customer && recipes.length > 0 && weeklyMenus.length > 0 && !hasInitializedDay) {
      const initialDay = getInitialDay();
      setSelectedDay(initialDay);
      setHasInitializedDay(true);
    }
  }, [loading, customer, recipes, weeklyMenus, hasInitializedDay, getInitialDay]);

  // Detectar mudança de semana e ajustar dia selecionado
  useEffect(() => {
    if (hasInitializedDay) {
      const correctDay = getInitialDay();
      setSelectedDay(correctDay);
    }
  }, [weekStart, hasInitializedDay, getInitialDay]); // Removido selectedDay das dependências

  // Preparar itens do pedido baseado no cardápio
  const orderItems = useMemo(() => {
    if (!weeklyMenus.length || !recipes.length || !customer) {
      return [];
    }

    const menu = weeklyMenus[0];
    const menuData = menu?.menu_data?.[selectedDay];
    
    if (!menuData) {
      return [];
    }

    const items = [];
    let uniqueCounter = 0;

    Object.entries(menuData).forEach(([categoryId, categoryData]) => {
      // Verificar se categoryData é um array direto (estrutura do Firebase mostrada)
      const itemsArray = Array.isArray(categoryData) ? categoryData : categoryData.items;
      
      if (itemsArray && Array.isArray(itemsArray)) {
        itemsArray.forEach((item, itemIndex) => {
          // Verificar se deve incluir este item baseado em locations
          const itemLocations = item.locations;
          const shouldInclude = !itemLocations || itemLocations.length === 0 || 
                               itemLocations.includes(customer.id);

          if (shouldInclude) {
            const recipe = recipes.find(r => r.id === item.recipe_id && r.active !== false);
            
            if (recipe) {

              // Buscar container_type na estrutura correta
              console.log(`🔍 [DEBUG] Buscando container_type para receita: ${recipe.name}`);
              console.log(`🔍 [DEBUG] Recipe completa:`, recipe);
              
              let containerType = null;
              if (recipe.preparations && recipe.preparations.length > 0) {
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                console.log(`🔍 [DEBUG] Última preparation:`, lastPrep);
                if (lastPrep.assembly_config?.container_type) {
                  containerType = lastPrep.assembly_config.container_type.toLowerCase();
                  console.log(`🔍 [DEBUG] Container_type encontrado em assembly_config: ${containerType}`);
                }
              }
              
              // Se não encontrou, verificar se tem direto na receita
              if (!containerType) {
                if (recipe.container_type) {
                  containerType = recipe.container_type.toLowerCase();
                  console.log(`🔍 [DEBUG] Container_type encontrado direto na receita: ${containerType}`);
                }
              }
              
              // Default final se nada for encontrado
              if (!containerType) {
                containerType = "cuba";
                console.log(`🔍 [DEBUG] Usando container_type padrão: ${containerType}`);
              }
              
              console.log(`🔍 [DEBUG] Container_type final: ${containerType}`);
              
              // Definir preço baseado no container_type
              let unitPrice = 0;
              if (containerType === "cuba") {
                unitPrice = recipe.cuba_cost || recipe.portion_cost || recipe.cost_per_kg_yield || 0;
              } else if (containerType === "kg") {
                unitPrice = recipe.cost_per_kg_yield || recipe.portion_cost || recipe.cuba_cost || 0;
              } else {
                // Para outros tipos, tentar campo específico (ex: "unid._cost")
                const specificField = `${containerType}_cost`;
                if (recipe[specificField] && typeof recipe[specificField] === 'number') {
                  unitPrice = recipe[specificField];
                } else {
                  // Fallback para portion_cost, cuba_cost, ou cost_per_kg_yield
                  unitPrice = recipe.portion_cost || recipe.cuba_cost || recipe.cost_per_kg_yield || 0;
                }
              }
              
              const newItem = {
                unique_id: `${item.recipe_id}_${uniqueCounter++}`,
                recipe_id: item.recipe_id,
                recipe_name: recipe.name,
                category: recipe.category || categoryId,
                unit_type: containerType,
                base_quantity: 0, // Quantidade original sem %
                quantity: 0, // Quantidade total com % aplicado
                unit_price: unitPrice,
                total_price: 0,
                notes: "",
                cuba_weight: utilParseQuantity(recipe.cuba_weight) || 0,
                adjustment_percentage: 0
              };
              
              console.log(`🔍 [DEBUG] Item criado com unit_type: ${newItem.unit_type} para receita: ${recipe.name}`);
              
              items.push(newItem);
            }
          }
        });
      }
    });
    
    return items;
  }, [weeklyMenus, recipes, customer, selectedDay]);

  const updateOrderItem = useCallback((uniqueId, field, value) => {
    setCurrentOrder(prev => {
      if (!prev?.items) return prev;

      const newItems = prev.items.map(item => {
        if (item.unique_id === uniqueId) {
          const updatedItem = { ...item };
          console.log(`🔍 [DEBUG-UPDATE] Atualizando item ${item.recipe_name} - unit_type atual: ${item.unit_type}`);

          // Verificar se é categoria de carne
          const isCarneCategory = item.category && item.category.toLowerCase().includes('carne');
          
          if (field === 'base_quantity') {
            const baseQuantity = utilParseQuantity(value);
            updatedItem.base_quantity = baseQuantity;
            
            if (isCarneCategory) {
              // Lógica unificada para categoria carne
              // Quantidade base: SEMPRE usar valor informado diretamente para categoria carne
              const quantidadeBase = baseQuantity;
              
              // Total Pedido: Sempre (Quantidade * 2) * (Porcentagem/100)
              const percentage = (updatedItem.adjustment_percentage || 0) / 100;
              const newQuantity = (quantidadeBase * 2) * percentage;
              updatedItem.quantity = Math.round(newQuantity * 100) / 100;
            } else {
              // Lógica padrão para outras categorias
              const percentage = updatedItem.adjustment_percentage || 0;
              const newQuantity = baseQuantity * (1 + (percentage / 100));
              updatedItem.quantity = Math.round(newQuantity * 100) / 100;
            }
            
            updatedItem.total_price = updatedItem.quantity * (updatedItem.unit_price || 0);
          } else if (field === 'adjustment_percentage') {
            const percentage = utilParseQuantity(value);
            updatedItem.adjustment_percentage = percentage;
            
            if (isCarneCategory) {
              // Lógica unificada para categoria carne
              // Quantidade base: SEMPRE usar valor informado diretamente para categoria carne
              const quantidadeBase = updatedItem.base_quantity || 0;
              
              // Total Pedido: Sempre (Quantidade * 2) * (Porcentagem/100)
              const percentageDecimal = percentage / 100;
              const newQuantity = (quantidadeBase * 2) * percentageDecimal;
              updatedItem.quantity = Math.round(newQuantity * 100) / 100;
            } else {
              // Lógica padrão para outras categorias
              const baseQuantity = updatedItem.base_quantity || 0;
              const newQuantity = baseQuantity * (1 + (percentage / 100));
              updatedItem.quantity = Math.round(newQuantity * 100) / 100;
            }
            
            updatedItem.total_price = updatedItem.quantity * (updatedItem.unit_price || 0);
          } else {
            updatedItem[field] = value;
          }
          console.log(`🔍 [DEBUG-UPDATE] Item ${updatedItem.recipe_name} após update - unit_type: ${updatedItem.unit_type}`);
          return updatedItem;
        }
        return item;
      });

      return { ...prev, items: newItems };
    });
  }, [mealsExpected]);

  // Categoria carne agora sempre usa valor informado diretamente - não precisa recalcular por mealsExpected

  // Carregar dados de sobras automaticamente para cálculo de descontos
  useEffect(() => {
    if (customer && weeklyMenus.length && recipes.length && hasInitializedDay) {
      loadWasteData();
    }
  }, [customer, selectedDay, weeklyMenus, recipes, existingOrders, hasInitializedDay, loadWasteData]);

  // Carregar dados de recebimento automaticamente para cálculo de descontos
  useEffect(() => {
    if (customer && weeklyMenus.length && recipes.length && hasInitializedDay) {
      loadReceivingData();
    }
  }, [customer, selectedDay, weeklyMenus, recipes, existingOrders, hasInitializedDay, loadReceivingData]);

  // Carregar dados de waste da semana quando a aba history for selecionada
  useEffect(() => {
    if (activeTab === "history" && customer) {
      loadWeeklyWasteData();
    }
  }, [activeTab, customer, loadWeeklyWasteData]);

  // Resetar pedido quando mudar de dia
  useEffect(() => {
    // Só executar se já temos dados carregados e dia foi inicializado
    // E NÃO estamos em modo de edição (para evitar reset durante edição)
    if (hasInitializedDay && !isEditMode && currentOrder && currentOrder.day_of_week !== selectedDay && Object.keys(existingOrders).length > 0) {
      setCurrentOrder(null);
      
      // Verificar se existe pedido salvo para este dia
      const existingOrder = existingOrders[selectedDay];
      if (existingOrder) {
        setCurrentOrder(existingOrder);
        setMealsExpected(existingOrder.total_meals_expected || 0);
        setGeneralNotes(existingOrder.general_notes || "");
        setIsEditMode(false); // Se existe pedido salvo, não está em modo de edição
      } else {
        setMealsExpected(0);
        setGeneralNotes("");
        setIsEditMode(true); // Se não existe pedido, está em modo de edição
      }
      // Reset do efeito de sucesso ao trocar de dia
      setShowSuccessEffect(false);
      setShowReceivingSuccessEffect(false);
      setShowWasteSuccessEffect(false);
      
      // Reset dos modos de edição - serão definidos quando os dados carregarem
      setIsReceivingEditMode(true);
      setIsWasteEditMode(true);
    }
  }, [hasInitializedDay, isEditMode, selectedDay, currentOrder, existingOrders]);

  // Inicializar pedido quando itens mudam
  useEffect(() => {
    // Só executar após inicialização do dia
    if (!hasInitializedDay) return;
    
    // Se existe pedido salvo para este dia, usar ele
    if (existingOrders[selectedDay] && orderItems.length > 0) {
      const existingOrder = existingOrders[selectedDay];
      console.log(`🔍 [DEBUG-EXISTING] Carregando pedido existente:`, existingOrder);
      
      // Atualizar preços dos itens existentes com valores atuais das receitas
      const updatedItems = existingOrder.items.map(existingItem => {
        console.log(`🔍 [DEBUG-EXISTING] Item existente: ${existingItem.recipe_name} - unit_type: ${existingItem.unit_type}`);
        // Encontrar item correspondente nos orderItems atualizados (com preços novos)
        const currentItem = orderItems.find(oi => oi.unique_id === existingItem.unique_id || oi.recipe_id === existingItem.recipe_id);
        if (currentItem) {
          // Manter quantidades e notas do pedido salvo, mas atualizar preços E unit_type
          const updatedItem = {
            ...existingItem,
            unit_price: currentItem.unit_price,
            unit_type: currentItem.unit_type, // ATUALIZAR unit_type com valor atual da receita
            total_price: (existingItem.quantity || 0) * (currentItem.unit_price || 0)
          };
          console.log(`🔍 [DEBUG-MIGRATION] Item ${existingItem.recipe_name}: ${existingItem.unit_type} → ${currentItem.unit_type}`);
          return updatedItem;
        }
        return existingItem;
      });
      
      const updatedOrder = {
        ...existingOrder,
        items: updatedItems
      };
      
      setCurrentOrder(updatedOrder);
      // Só resetar valores e modo de edição se NÃO estivermos editando
      if (!isEditMode) {
        setMealsExpected(existingOrder.total_meals_expected || 0);
        setGeneralNotes(existingOrder.general_notes || "");
        setIsEditMode(false);
      }
    } else if (orderItems.length > 0 && (!currentOrder || currentOrder.day_of_week !== selectedDay)) {
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
    }
  }, [hasInitializedDay, isEditMode, orderItems, customer, selectedDay, weekNumber, year, weekStart, existingOrders]);

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
    const totalAmount = currentOrder.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
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
      // Criar strings dos inputs e outputs da aba pedidos
      const createOrderStrings = () => {
        let inputString = "=== INPUTS DA ABA PEDIDOS ===\n\n";
        let outputString = "=== OUTPUTS DA ABA PEDIDOS ===\n\n";
        
        // Header das refeições esperadas
        inputString += `Refeições Esperadas: ${mealsExpected || 0}\n\n`;
        outputString += `Refeições Esperadas: ${mealsExpected || 0}\n\n`;
        
        // Agrupar itens por categoria
        const groupedItems = groupItemsByCategory(currentOrder.items || [], (item) => item.category);
        const orderedCategories = getOrderedCategories(groupedItems);
        
        // Para cada categoria
        orderedCategories.forEach(({ name: categoryName, data: categoryData }) => {
          const isCarneCategory = categoryName.toLowerCase().includes('carne');
          
          inputString += `--- CATEGORIA: ${categoryName} ---\n`;
          outputString += `--- CATEGORIA: ${categoryName} ---\n`;
          
          if (isCarneCategory) {
            inputString += "Item | Quantidade | Unidade | Porcionamento | Total Pedido | Subtotal | Observações\n";
            outputString += "Item | Quantidade | Unidade | Porcionamento | Total Pedido | Subtotal | Observações\n";
          } else {
            inputString += "Item | Quantidade | Unidade | Subtotal | Observações\n";
            outputString += "Item | Quantidade | Unidade | Subtotal | Observações\n";
          }
          
          categoryData.items.forEach(item => {
            const unitType = item.unit_type?.charAt(0).toUpperCase() + item.unit_type?.slice(1) || '';
            const unitPrice = utilFormatCurrency(item.unit_price || 0);
            const baseQty = utilFormattedQuantity(item.base_quantity || 0);
            const totalQty = utilFormattedQuantity(item.quantity || 0);
            const subtotal = utilFormatCurrency(item.total_price || 0);
            const notes = item.notes || '';
            const adjustmentPct = item.adjustment_percentage || 0;
            
            const itemHeader = `${item.recipe_name}\n${unitPrice}/${item.unit_type}`;
            
            if (isCarneCategory) {
              inputString += `${itemHeader} | ${baseQty} | ${unitType} | ${adjustmentPct}% | ${totalQty} ${item.unit_type} | ${subtotal} | ${notes}\n`;
              outputString += `${itemHeader} | ${baseQty} | ${unitType} | ${adjustmentPct}% | ${totalQty} ${item.unit_type} | ${subtotal} | ${notes}\n`;
            } else {
              inputString += `${itemHeader} | ${baseQty} | ${unitType} | ${subtotal} | ${notes}\n`;
              outputString += `${itemHeader} | ${baseQty} | ${unitType} | ${subtotal} | ${notes}\n`;
            }
          });
          
          inputString += "\n";
          outputString += "\n";
        });
        
        // Totais
        const totalItemsStr = utilFormattedQuantity(orderTotals.totalItems);
        const totalAmountStr = utilFormatCurrency(orderTotals.totalAmount);
        
        inputString += `--- RESUMO DO PEDIDO ---\n`;
        inputString += `Total de Itens: ${totalItemsStr}\n`;
        inputString += `Valor Total: ${totalAmountStr}\n`;
        inputString += `Observações Gerais: ${generalNotes || ''}\n`;
        
        outputString += `--- RESUMO DO PEDIDO ---\n`;
        outputString += `Total de Itens: ${totalItemsStr}\n`;
        outputString += `Valor Total: ${totalAmountStr}\n`;
        outputString += `Observações Gerais: ${generalNotes || ''}\n`;
        
        return { inputString, outputString };
      };
      
      const { inputString, outputString } = createOrderStrings();
      

      const orderData = {
        ...currentOrder,
        total_meals_expected: mealsExpected,
        general_notes: generalNotes,
        total_items: orderTotals.totalItems,
        total_amount: orderTotals.totalAmount,
        final_amount: orderTotals.finalAmount,
        original_amount: orderTotals.originalAmount,
        depreciation_amount: orderTotals.depreciationAmount,
        // Adicionar as strings dos inputs e outputs
        order_inputs_string: inputString,
        order_outputs_string: outputString,
        form_data_snapshot: {
          timestamp: new Date().toISOString(),
          customer_name: customer.name,
          day_of_week: selectedDay,
          week_number: weekNumber,
          year: year,
          inputs: inputString,
          outputs: outputString
        }
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

  // Carregar pedidos existentes quando customer muda
  useEffect(() => {
    if (customer && hasInitializedDay) {
      loadExistingOrders();
    }
  }, [customer, hasInitializedDay, loadExistingOrders]);

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
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                Semana {weekNumber}/{year}
              </p>
              <p className="text-xs text-gray-500">
                {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 6), "dd/MM/yyyy")}
              </p>
            </div>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Semana Anterior
            </Button>
            <div className="flex gap-1">
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
                    onClick={() => setSelectedDay(day.dayNumber)}
                    className={cn(
                      "flex flex-col h-16 w-16 p-1 text-xs relative",
                      isSelected && "bg-blue-600 text-white",
                      isCurrentDay && !isSelected && "border-blue-400 border-2"
                    )}
                  >
                    <span className="font-medium">{day.dayShort}</span>
                    <span className="text-xs opacity-80">{day.dayDate}</span>
                    {isCurrentDay && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white" />
                    )}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="flex items-center gap-2"
            >
              Próxima Semana
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Pedido
              </TabsTrigger>
              <TabsTrigger value="receive" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Recebimento
              </TabsTrigger>
              <TabsTrigger value="waste" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Sobras
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === "orders" && (
          <OrdersTab
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
            existingOrders={existingOrders}
            weekDays={weekDays}
            year={year}
            weekNumber={weekNumber}
            customer={customer}
            existingWasteData={weeklyWasteData}
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
                <span className="font-medium">Itens:</span> {utilFormattedQuantity(orderTotals.totalItems)}
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
                disabled={orderTotals.totalItems === 0 || showSuccessEffect || !mealsExpected || mealsExpected <= 0}
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
                disabled={orderTotals.totalItems === 0}
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