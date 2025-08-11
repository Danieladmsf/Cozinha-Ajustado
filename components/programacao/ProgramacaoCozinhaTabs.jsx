'use client';

import React, { useState, useEffect, useMemo } from "react";
import '../cardapio/consolidacao/print-styles.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Loader2,
  ChefHat,
  Leaf,
  Package2,
  Utensils,
  RefreshCw
} from "lucide-react";
import { format, startOfWeek, addDays, getWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";

// Entities
import { Customer, Order, Recipe } from "@/app/api/entities";

// Utils
import { formattedQuantity } from "@/components/utils/orderUtils";
import { useCategoryDisplay } from "@/hooks/shared/useCategoryDisplay";
import { useOrderConsolidation } from "@/hooks/cardapio/useOrderConsolidation";
import { convertQuantityForKitchen } from "@/lib/cubaConversionUtils";

// Função utilitária centralizada para formatação de quantidade
export const formatQuantityForDisplay = (quantity, unitType, useKitchenFormat) => {
  if (useKitchenFormat && unitType?.toLowerCase() === 'cuba-g') {
    return convertQuantityForKitchen(quantity, unitType);
  } else {
    // Formato padrão
    const formattedQty = quantity ? String(quantity).replace('.', ',') : '';
    return `${formattedQty}${unitType ? ` ${unitType}` : ''}`;
  }
};

// Componentes das abas
import SaladaTab from './tabs/SaladaTab';
import AcougueTab from './tabs/AcougueTab';
import CozinhaTab from './tabs/CozinhaTab';
import EmbalagemTab from './tabs/EmbalagemTab';

const ProgramacaoCozinhaTabs = () => {
  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  
  // Dados
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  
  // Filtros
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estado centralizado do formato cozinha para todas as abas
  const [globalKitchenFormat, setGlobalKitchenFormat] = useState(() => {
    // Carregar preferência salva do localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('programacao-global-kitchen-format');
      return saved === 'true';
    }
    return false;
  });
  
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

  // Função centralizada para carregar/atualizar todos os dados
  const refreshAllData = async () => {
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
      setDataVersion(prev => prev + 1); // Trigger para atualizar abas
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carregamento inicial de dados
  useEffect(() => {
    refreshAllData();
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

  // Hook de consolidação (deve vir depois de filteredOrders)
  const { ordersByCustomer, consolidateCustomerItems } = useOrderConsolidation(filteredOrders, recipes);

  // Função centralizada para alternar formato em todas as abas
  const toggleGlobalKitchenFormat = () => {
    const newFormat = !globalKitchenFormat;
    setGlobalKitchenFormat(newFormat);
    
    // Salvar preferência no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('programacao-global-kitchen-format', newFormat.toString());
    }
  };

  // Função para formatar quantidade baseada no modo selecionado
  const formatQuantityDisplay = (item) => {
    if (globalKitchenFormat && item.unit_type?.toLowerCase() === 'cuba-g') {
      const convertedQuantity = convertQuantityForKitchen(item.quantity, item.unit_type);
      return `${convertedQuantity} –`;
    } else {
      // Formato padrão
      return `${formattedQuantity(item.quantity)}${item.unit_type ? ` ${item.unit_type}` : ''} –`;
    }
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

  const ConsolidacaoContent = () => (
    <>
      {/* Lista de pedidos consolidados */}
      <div className="space-y-4 print:space-y-12">
        {ordersByCustomer.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-slate-100">
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
              <Card 
                key={customerData.customer_id} 
                className="print:break-after-page print:min-h-screen print:p-8 border-2 border-slate-200 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-shadow duration-200"
              >
                <CardContent className="p-4 print:p-8">
                {/* Header do cliente - compacto */}
                <div className="mb-3 print:mb-12">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-2 print:pb-6">
                    <div className="flex-1">
                      <h1 className="text-lg print:text-3xl font-bold text-gray-900">
                        {customerData.customer_name}
                      </h1>
                      <p className="text-sm text-gray-600">
                        {selectedDayInfo?.fullDate} • {customerData.total_meals} refeições
                      </p>
                    </div>
                    {globalKitchenFormat && (
                      <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-md inline-block mt-1 sm:mt-0 print:hidden">
                        <ChefHat className="w-3 h-3 inline mr-1" />
                        Formato Cozinha
                      </div>
                    )}
                  </div>
                </div>

                {/* Itens por categoria */}
                <div className="space-y-3 print:space-y-8">
                  {Object.keys(consolidatedItems).length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      Nenhum item no pedido deste cliente.
                    </p>
                  ) : (
                    Object.entries(consolidatedItems).map(([categoryName, items]) => (
                      <div key={categoryName} className="mb-3 print:mb-10">
                        {/* Título da categoria */}
                        <div className="mb-2 print:mb-6">
                          <h2 className="text-lg print:text-2xl font-bold text-gray-800 border-b border-gray-200 pb-1">
                            {categoryName}
                          </h2>
                        </div>
                        
                        {/* Lista de itens */}
                        <div className="space-y-1 print:space-y-3 pl-3 print:pl-6">
                          {items.map((item, index) => (
                            <div 
                              key={`${item.unique_id || item.recipe_id}_${index}`}
                              className="flex items-start gap-3 print:gap-6 text-sm print:text-lg"
                            >
                              <span className="font-semibold text-blue-700 min-w-[50px] print:min-w-[80px] text-sm">
                                {formatQuantityDisplay(item)}
                              </span>
                              <span className="text-gray-800 flex-1">
                                {item.recipe_name}
                                {item.notes && item.notes.trim() && (
                                  <span className="text-gray-600 italic">
                                    {' '}({item.notes.trim()})
                                  </span>
                                )}
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
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="space-y-6 consolidacao-container">
      {/* Header com navegação */}
      <Card className="print:hidden border-2 border-blue-200 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="w-5 h-5" />
                Consolidação de Pedidos
              </CardTitle>
              <p className="text-blue-700 mt-1 font-medium">
                Visualize pedidos consolidados por cliente e categoria
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
                disabled={loading}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>
              
              <Button
                variant={globalKitchenFormat ? "default" : "outline"}
                size="sm"
                onClick={toggleGlobalKitchenFormat}
                className="gap-2"
              >
                <ChefHat className="w-4 h-4" />
                {globalKitchenFormat ? "Formato Padrão" : "Formato Cozinha"}
              </Button>
              
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
        
        <CardContent className="bg-white">
          {/* Navegação de semana */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(-1)}
              className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Semana Anterior
            </Button>
            
            <div className="text-center bg-white p-3 rounded-lg border-2 border-blue-200 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-800">
                Semana {weekNumber}/{year}
              </h3>
              <p className="text-sm text-blue-600">
                {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 6), "dd/MM/yyyy")}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(1)}
              className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              Próxima Semana
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Seletor de dias */}
          <div className="flex justify-center gap-3 mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            {weekDays.map((day) => (
              <Button
                key={day.dayNumber}
                variant={selectedDay === day.dayNumber ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`flex flex-col h-16 w-16 p-1 text-xs transition-all duration-200 ${
                  selectedDay === day.dayNumber 
                    ? "bg-emerald-500 text-white border-emerald-600 shadow-lg transform scale-105" 
                    : "border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:scale-105"
                }`}
              >
                <span className="font-medium">{day.dayShort}</span>
                <span className="text-xs opacity-80">{day.dayDate}</span>
              </Button>
            ))}
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Cliente
              </label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="border-purple-300 focus:border-purple-500 focus:ring-purple-200">
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
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Buscar Cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Digite o nome do cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-purple-300 focus:border-purple-500 focus:ring-purple-200"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Badge variant="secondary" className="h-fit bg-purple-100 text-purple-800 border border-purple-300">
                {ordersByCustomer.length} cliente(s) com pedidos
              </Badge>
            </div>
          </div>

          {/* Abas das seções */}
          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
            <Tabs defaultValue="por-empresa" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-white border-2 border-orange-200 p-2 rounded-lg">
                <TabsTrigger 
                  value="por-empresa" 
                  className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:border-indigo-600 border-2 border-transparent hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
                >
                  <FileText className="w-4 h-4" />
                  Por Empresa
                </TabsTrigger>
                <TabsTrigger 
                  value="salada" 
                  className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:border-green-600 border-2 border-transparent hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                >
                  <Leaf className="w-4 h-4" />
                  Salada
                </TabsTrigger>
                <TabsTrigger 
                  value="acougue" 
                  className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:border-red-600 border-2 border-transparent hover:border-red-300 hover:bg-red-50 transition-all duration-200"
                >
                  <Utensils className="w-4 h-4" />
                  Açougue
                </TabsTrigger>
                <TabsTrigger 
                  value="cozinha" 
                  className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:border-orange-600 border-2 border-transparent hover:border-orange-300 hover:bg-orange-50 transition-all duration-200"
                >
                  <ChefHat className="w-4 h-4" />
                  Cozinha
                </TabsTrigger>
                <TabsTrigger 
                  value="embalagem" 
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:border-blue-600 border-2 border-transparent hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <Package2 className="w-4 h-4" />
                  Embalagem
                </TabsTrigger>
              </TabsList>

              <TabsContent value="por-empresa" className="mt-6">
                <ConsolidacaoContent />
              </TabsContent>

              <TabsContent value="salada" className="mt-6">
                <SaladaTab 
                  currentDate={currentDate}
                  selectedDay={selectedDay}
                  weekNumber={weekNumber}
                  year={year}
                  weekDays={weekDays}
                  orders={orders}
                  recipes={recipes}
                  dataVersion={dataVersion}
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />
              </TabsContent>

              <TabsContent value="acougue" className="mt-6">
                <AcougueTab 
                  currentDate={currentDate}
                  selectedDay={selectedDay}
                  weekNumber={weekNumber}
                  year={year}
                  weekDays={weekDays}
                  orders={orders}
                  recipes={recipes}
                  dataVersion={dataVersion}
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />
              </TabsContent>

              <TabsContent value="cozinha" className="mt-6">
                <CozinhaTab 
                  currentDate={currentDate}
                  selectedDay={selectedDay}
                  weekNumber={weekNumber}
                  year={year}
                  weekDays={weekDays}
                  orders={orders}
                  recipes={recipes}
                  dataVersion={dataVersion}
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />
              </TabsContent>

              <TabsContent value="embalagem" className="mt-6">
                <EmbalagemTab 
                  globalKitchenFormat={globalKitchenFormat}
                  toggleGlobalKitchenFormat={toggleGlobalKitchenFormat}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramacaoCozinhaTabs;