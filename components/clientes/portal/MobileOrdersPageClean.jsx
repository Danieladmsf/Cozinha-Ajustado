'use client';

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

// Tab Components
import OrdersTab from "./tabs/OrdersTab";
import ReceivingTab from "./tabs/ReceivingTab";
import WasteTab from "./tabs/WasteTab";

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
  
  // Estados para Sobras
  const [wasteItems, setWasteItems] = useState([]);
  const [wasteNotes, setWasteNotes] = useState("");
  const [existingWaste, setExistingWaste] = useState(null);
  const [wasteLoading, setWasteLoading] = useState(false);

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

  const [selectedDay, setSelectedDay] = useState(1);

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
      
    } catch (error) {
      // Error handling
    }
  }, [customer, weekNumber, year]);

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

      // Criar itens simples baseados no cardápio
      const menu = weeklyMenus[0];
      const menuData = menu?.menu_data?.[selectedDay];
      
      if (!menuData) {
        setWasteItems([]);
        return;
      }

      const items = [];
      Object.entries(menuData).forEach(([categoryId, categoryData]) => {
        if (categoryData.items) {
          categoryData.items.forEach(item => {
            const recipe = recipes.find(r => r.id === item.recipe_id && r.active !== false);
            if (recipe) {
              const wasteItem = {
                recipe_id: recipe.id,
                recipe_name: recipe.name,
                category: recipe.category || categoryId,
                internal_waste_quantity: 0,
                client_returned_quantity: 0,
                notes: ""
              };
              
              // Se há dados salvos, usar eles
              if (wasteRecord?.items) {
                const saved = wasteRecord.items.find(s => s.recipe_id === recipe.id);
                if (saved) {
                  wasteItem.internal_waste_quantity = saved.internal_waste_quantity || 0;
                  wasteItem.client_returned_quantity = saved.client_returned_quantity || 0;
                  wasteItem.notes = saved.notes || "";
                }
              }
              
              items.push(wasteItem);
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
  }, [customer, weeklyMenus, recipes, weekNumber, year, selectedDay, toast]);

  // Funções para Recebimento
  const loadReceivingData = useCallback(async () => {
    if (!customer || !weeklyMenus.length || !recipes.length) return;

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

      // Buscar o pedido do dia para saber o que foi pedido
      const existingOrder = existingOrders[selectedDay];
      if (!existingOrder || !existingOrder.items) {
        setReceivingItems([]);
        return;
      }

      // Criar itens de recebimento baseados no pedido
      const items = existingOrder.items.map(orderItem => {
        const receivingItem = {
          recipe_id: orderItem.recipe_id,
          recipe_name: orderItem.recipe_name,
          category: orderItem.category,
          ordered_quantity: orderItem.quantity,
          ordered_unit_type: orderItem.unit_type,
          status: 'pending', // pending, received, partial
          received_quantity: orderItem.quantity, // default para quantidade pedida
          notes: ""
        };
        
        // Se há dados salvos, usar eles
        if (receivingRecord?.items) {
          const saved = receivingRecord.items.find(s => s.recipe_id === orderItem.recipe_id);
          if (saved) {
            receivingItem.status = saved.status || 'pending';
            receivingItem.received_quantity = saved.received_quantity || orderItem.quantity;
            receivingItem.notes = saved.notes || "";
          }
        }
        
        return receivingItem;
      });

      setReceivingItems(items);
    } catch (error) {
      toast({ variant: "destructive", description: "Erro ao carregar dados de recebimento." });
    } finally {
      setReceivingLoading(false);
    }
  }, [customer, weeklyMenus, recipes, weekNumber, year, selectedDay, existingOrders, toast]);

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
    Object.entries(menuData).forEach(([categoryId, categoryData]) => {
      if (categoryData.items && Array.isArray(categoryData.items)) {
        categoryData.items.forEach((item) => {
          // Verificar se deve incluir este item baseado em locations
          const itemLocations = item.locations;
          const shouldInclude = !itemLocations || itemLocations.length === 0 || 
                               itemLocations.includes(customer.id);

          if (shouldInclude) {
            const recipe = recipes.find(r => r.id === item.recipe_id && r.active !== false);
            if (recipe) {
              // Buscar container_type na estrutura correta
              let containerType = "cuba"; // default
              if (recipe.preparations && recipe.preparations.length > 0) {
                const lastPrep = recipe.preparations[recipe.preparations.length - 1];
                if (lastPrep.assembly_config?.container_type) {
                  containerType = lastPrep.assembly_config.container_type.toLowerCase();
                }
              }
              
              // Se não encontrou, verificar se tem direto na receita
              if (!containerType || containerType === "cuba") {
                if (recipe.container_type) {
                  containerType = recipe.container_type.toLowerCase();
                }
              }
              
              // Definir preço baseado no container_type
              let unitPrice = 0;
              if (containerType === "cuba") {
                unitPrice = recipe.cuba_cost || 0;
              } else if (containerType === "kg") {
                unitPrice = recipe.cost_per_kg_yield || 0;
              } else {
                // Para outros tipos, tentar campo específico (ex: "unid._cost")
                const specificField = `${containerType}_cost`;
                if (recipe[specificField] && typeof recipe[specificField] === 'number') {
                  unitPrice = recipe[specificField];
                } else {
                  // Fallback para cuba_cost
                  unitPrice = recipe.cuba_cost || 0;
                }
              }
              
              const newItem = {
                recipe_id: item.recipe_id,
                recipe_name: recipe.name,
                category: recipe.category || categoryId,
                unit_type: containerType,
                quantity: 0,
                unit_price: unitPrice,
                total_price: 0,
                notes: "",
                cuba_weight: utilParseQuantity(recipe.cuba_weight) || 0,
                adjustment_percentage: 0
              };
              
              items.push(newItem);
            }
          }
        });
      }
    });
    
    return items;
  }, [weeklyMenus, recipes, customer, selectedDay]);

  // Atualizar item do pedido - VERSÃO SIMPLES
  const updateOrderItem = useCallback((index, field, value) => {
    setCurrentOrder(prev => {
      if (!prev?.items) return prev;
      
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'quantity') {
        const quantity = utilParseQuantity(value);
        item.quantity = quantity;
        item.total_price = quantity * (item.unit_price || 0);
      } else if (field === 'adjustment_percentage') {
        const percentage = utilParseQuantity(value);
        item.adjustment_percentage = percentage;
        // Recalcular quantidade baseada na porcentagem
        const baseQuantity = item.base_quantity || item.quantity;
        const newQuantity = baseQuantity * (1 + (percentage / 100));
        item.quantity = Math.max(0, newQuantity);
        item.total_price = item.quantity * (item.unit_price || 0);
      } else if (field === 'unit_type') {
        item.unit_type = value;
        
        // Lógica simples: buscar preço baseado na unidade selecionada
        const recipe = recipes.find(r => r.id === item.recipe_id);
        if (recipe) {
          if (value === "cuba") {
            item.unit_price = recipe.cuba_cost || 0;
          } else if (value === "kg") {
            item.unit_price = recipe.cost_per_kg_yield || 0;
          } else {
            // Para outros tipos de unidade, tentar campo específico (ex: "unid._cost")
            const specificField = `${value}_cost`;
            if (recipe[specificField] && typeof recipe[specificField] === 'number') {
              item.unit_price = recipe[specificField];
            } else {
              // Fallback para cuba_cost
              item.unit_price = recipe.cuba_cost || 0;
            }
          }
          item.total_price = item.quantity * item.unit_price;
        }
      } else {
        item[field] = value;
      }
      
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  }, [recipes]);

  // Carregar dados de sobras quando a aba waste for selecionada
  useEffect(() => {
    if (activeTab === "waste" && customer && weeklyMenus.length && recipes.length) {
      loadWasteData();
    }
  }, [activeTab, customer, selectedDay, weeklyMenus, recipes, loadWasteData]);

  // Carregar dados de recebimento quando a aba receive for selecionada
  useEffect(() => {
    if (activeTab === "receive" && customer && existingOrders[selectedDay]) {
      loadReceivingData();
    }
  }, [activeTab, customer, selectedDay, existingOrders, loadReceivingData]);

  // Resetar pedido quando mudar de dia
  useEffect(() => {
    if (currentOrder && currentOrder.day_of_week !== selectedDay) {
      setCurrentOrder(null);
      
      // Verificar se existe pedido salvo para este dia
      const existingOrder = existingOrders[selectedDay];
      if (existingOrder) {
        setCurrentOrder(existingOrder);
        setMealsExpected(existingOrder.total_meals_expected || 0);
        setGeneralNotes(existingOrder.general_notes || "");
      } else {
        setMealsExpected(0);
        setGeneralNotes("");
      }
    }
  }, [selectedDay, currentOrder, existingOrders]);

  // Inicializar pedido quando itens mudam
  useEffect(() => {
    if (orderItems.length > 0 && !currentOrder) {
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
    } else if (currentOrder && currentOrder.day_of_week === selectedDay) {
      // currentOrder já existe para este dia
    }
  }, [orderItems, customer, selectedDay, weekNumber, year, weekStart, mealsExpected, generalNotes, currentOrder]);

  // Calcular totais
  const orderTotals = useMemo(() => {
    if (!currentOrder?.items) return { totalItems: 0, totalAmount: 0 };
    
    const totalItems = currentOrder.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmount = currentOrder.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    
    return { totalItems, totalAmount };
  }, [currentOrder]);

  const submitOrder = useCallback(async () => {
    if (!currentOrder || !customer) return;

    try {
      const orderData = {
        ...currentOrder,
        total_meals_expected: mealsExpected,
        general_notes: generalNotes,
        total_items: orderTotals.totalItems,
        total_amount: orderTotals.totalAmount
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
      
      // Reset form
      setCurrentOrder(null);
      setMealsExpected(0);
      setGeneralNotes("");
      
    } catch (error) {
      toast({ variant: "destructive", description: "Erro ao enviar pedido. Tente novamente." });
    }
  }, [currentOrder, customer, mealsExpected, generalNotes, orderTotals, existingOrders, selectedDay, toast]);

  // Carregar pedidos existentes quando customer muda
  useEffect(() => {
    if (customer) {
      loadExistingOrders();
    }
  }, [customer, loadExistingOrders]);

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
              {weekDays.map((day) => (
                <Button
                  key={day.dayNumber}
                  variant={selectedDay === day.dayNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDay(day.dayNumber)}
                  className={cn(
                    "flex flex-col h-16 w-16 p-1 text-xs",
                    selectedDay === day.dayNumber && "bg-blue-600 text-white"
                  )}
                >
                  <span className="font-medium">{day.dayShort}</span>
                  <span className="text-xs opacity-80">{day.dayDate}</span>
                </Button>
              ))}
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
            <TabsList className="grid w-full grid-cols-3">
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
            groupItemsByCategory={groupItemsByCategory}
            getOrderedCategories={getOrderedCategories}
            generateCategoryStyles={generateCategoryStyles}
          />
        )}
      </div>

      {/* Footer with totals and submit button */}
      {activeTab === "orders" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total:</span> {utilFormatCurrency(orderTotals.totalAmount)}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Itens:</span> {orderTotals.totalItems}
              </div>
            </div>
            <Button 
              onClick={submitOrder}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={orderTotals.totalItems === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              {existingOrders[selectedDay] ? 'Atualizar Pedido' : 'Enviar Pedido'}
            </Button>
          </div>
        </div>
      )}

      {/* Bottom spacing for fixed footer */}
      {activeTab === "orders" && <div className="h-24"></div>}
    </div>
  );
};

export default MobileOrdersPage;