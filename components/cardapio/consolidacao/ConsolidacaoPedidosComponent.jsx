'use client';

import React, { useState, useEffect, useMemo } from "react";
import './print-styles.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  FileText, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Search,
  Download,
  Loader2
} from "lucide-react";
import { format, startOfWeek, addDays, getWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";

// Entities
import { Customer, Order, Recipe } from "@/app/api/entities";

// Utils
import { formattedQuantity, formatCurrency } from "@/components/utils/orderUtils";
import { useCategoryDisplay } from "@/hooks/shared/useCategoryDisplay";

const ConsolidacaoPedidosComponent = () => {
  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  
  // Dados
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  
  // Filtros
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Hooks
  const { groupItemsByCategory, getOrderedCategories, generateCategoryStyles } = useCategoryDisplay();
  
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
        dayDate: format(date, 'dd/MM', { locale: ptBR }),
        fullDate: format(date, 'dd/MM/yyyy', { locale: ptBR })
      });
    }
    return days;
  }, [weekStart]);

  // Carregamento inicial de dados
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        
        // Carregar clientes, receitas e pedidos em paralelo
        const [customersData, recipesData, ordersData] = await Promise.all([
          Customer.list(),
          Recipe.list(),
          Order.query([
            { field: 'week_number', operator: '==', value: weekNumber },
            { field: 'year', operator: '==', value: year }
          ])
        ]);
        
        setCustomers(customersData);
        setRecipes(recipesData);
        setOrders(ordersData);
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [weekNumber, year]);

  // Filtrar pedidos por dia e cliente
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const dayMatch = order.day_of_week === selectedDay;
      const customerMatch = selectedCustomer === "all" || order.customer_id === selectedCustomer;
      const searchMatch = searchTerm === "" || 
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return dayMatch && customerMatch && searchMatch;
    });
  }, [orders, selectedDay, selectedCustomer, searchTerm]);

  // Agrupar pedidos por cliente
  const ordersByCustomer = useMemo(() => {
    const grouped = {};
    
    filteredOrders.forEach(order => {
      if (!grouped[order.customer_id]) {
        grouped[order.customer_id] = {
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          orders: [],
          total_meals: 0,
          total_amount: 0,
          total_items: 0
        };
      }
      
      grouped[order.customer_id].orders.push(order);
      grouped[order.customer_id].total_meals += order.total_meals_expected || 0;
      // Usar original_amount se disponível, senão total_amount
      const orderAmount = order.original_amount || order.total_amount || 0;
      grouped[order.customer_id].total_amount += orderAmount;
      grouped[order.customer_id].total_items += order.total_items || 0;
      
    });
    
    return Object.values(grouped);
  }, [filteredOrders]);

  // Consolidar itens por categoria para um cliente
  const consolidateCustomerItems = (customerOrders) => {
    const consolidatedItems = {};
    const itemsMap = new Map();
    
    customerOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const key = item.unique_id || `${item.recipe_id}_${item.recipe_name}`;
          
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
            existing.quantity += item.quantity || 0;
            existing.total_price += item.total_price || 0;
          } else {
            const recipe = recipes.find(r => r.id === item.recipe_id);
            itemsMap.set(key, {
              ...item,
              category: recipe?.category || item.category || 'Outros',
              quantity: item.quantity || 0,
              total_price: item.total_price || 0
            });
          }
        });
      }
    });
    
    // Agrupar por categoria
    itemsMap.forEach(item => {
      const category = item.category;
      if (!consolidatedItems[category]) {
        consolidatedItems[category] = [];
      }
      consolidatedItems[category].push(item);
    });
    
    return consolidatedItems;
  };

  // Função de impressão
  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  // Navegação de semana
  const navigateWeek = (direction) => {
    setCurrentDate(prev => addDays(prev, direction * 7));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
          <p className="text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 consolidacao-container">
      {/* Header com navegação */}
      <Card className="print:hidden">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="w-5 h-5" />
                Consolidação de Pedidos
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Visualize pedidos consolidados por cliente e categoria
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={printing}
                className="gap-2"
              >
                {printing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Navegação de semana */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(-1)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Semana Anterior
            </Button>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800">
                Semana {weekNumber}/{year}
              </h3>
              <p className="text-sm text-gray-600">
                {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 6), "dd/MM/yyyy")}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(1)}
              className="flex items-center gap-2"
            >
              Próxima Semana
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Seletor de dias */}
          <div className="flex justify-center gap-2 mb-6">
            {weekDays.map((day) => (
              <Button
                key={day.dayNumber}
                variant={selectedDay === day.dayNumber ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(day.dayNumber)}
                className="flex flex-col h-16 w-16 p-1 text-xs"
              >
                <span className="font-medium">{day.dayShort}</span>
                <span className="text-xs opacity-80">{day.dayDate}</span>
              </Button>
            ))}
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Digite o nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Badge variant="secondary" className="h-fit">
                {ordersByCustomer.length} cliente(s) com pedidos
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pedidos consolidados */}
      <div className="space-y-8 print:space-y-12">
        {ordersByCustomer.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="font-semibold text-lg text-gray-700 mb-2">
                Nenhum Pedido Encontrado
              </h3>
              <p className="text-gray-500 text-sm">
                Não há pedidos para o dia selecionado com os filtros aplicados.
              </p>
            </CardContent>
          </Card>
        ) : (
          ordersByCustomer.map((customerData) => {
            const consolidatedItems = consolidateCustomerItems(customerData.orders);
            const selectedDayInfo = weekDays.find(d => d.dayNumber === selectedDay);
            
            return (
              <div 
                key={customerData.customer_id} 
                className="print:break-after-page print:min-h-screen print:p-8"
              >
                {/* Header do cliente - formato A4 */}
                <div className="mb-8 print:mb-12">
                  <div className="text-center border-b-2 border-gray-300 pb-4 print:pb-6">
                    <h1 className="text-2xl print:text-3xl font-bold text-gray-900 mb-2">
                      Cardápio dia {selectedDayInfo?.fullDate} - {customerData.customer_name}
                    </h1>
                    <div className="flex justify-center gap-6 text-sm print:text-base text-gray-600">
                      <span>Refeições: {customerData.total_meals}</span>
                      <span>Total: {formatCurrency(customerData.total_amount || 0)}</span>
                      {/* Debug: Mostrar valor raw */}
                      <span className="text-xs text-red-500">(Debug: {customerData.total_amount})</span>
                    </div>
                  </div>
                </div>

                {/* Itens por categoria */}
                <div className="space-y-6 print:space-y-8">
                  {Object.keys(consolidatedItems).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum item no pedido deste cliente.
                    </p>
                  ) : (
                    Object.entries(consolidatedItems).map(([categoryName, items]) => (
                      <div key={categoryName} className="mb-8 print:mb-10">
                        {/* Título da categoria */}
                        <div className="mb-4 print:mb-6">
                          <h2 className="text-xl print:text-2xl font-bold text-gray-800 border-b border-gray-200 pb-2">
                            {categoryName}
                          </h2>
                        </div>
                        
                        {/* Lista de itens */}
                        <div className="space-y-2 print:space-y-3 pl-4 print:pl-6">
                          {items.map((item, index) => (
                            <div 
                              key={`${item.unique_id || item.recipe_id}_${index}`}
                              className="flex items-start gap-4 print:gap-6 text-base print:text-lg"
                            >
                              <span className="font-semibold text-blue-700 min-w-[60px] print:min-w-[80px]">
                                {formattedQuantity(item.quantity)}{item.unit_type ? ` ${item.unit_type}` : ''} -
                              </span>
                              <span className="text-gray-800 flex-1">
                                {item.recipe_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer para impressão */}
                <div className="hidden print:block mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
                  <p>Cozinha Afeto - Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConsolidacaoPedidosComponent;