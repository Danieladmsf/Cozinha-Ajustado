'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingCart,
  Calendar,
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Printer,
  Download,
  Loader2
} from "lucide-react";
import { format, startOfWeek, addDays, getWeek, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";

// Entities
import { Order, Recipe, CategoryTree, MenuConfig } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";

// Componente de consolidação de ingredientes
import IngredientesConsolidados from './lista-compras/IngredientesConsolidados';

const ListaComprasTabs = () => {
  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1); // Dia da semana selecionado (1-5)
  const [showWeekMode, setShowWeekMode] = useState(true); // true = semana inteira, false = dia selecionado

  // Dados
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuConfig, setMenuConfig] = useState(null);
  
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

  // Carregar configuração do menu
  const loadMenuConfig = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const configs = await MenuConfig.query([
        { field: 'user_id', operator: '==', value: mockUserId }
      ]);
      return configs?.[0] || null;
    } catch (error) {
      return null;
    }
  };

  // Função centralizada para carregar/atualizar todos os dados
  const refreshAllData = async () => {
    try {
      setLoading(true);

      const [recipesData, ordersData, categoriesData, configData] = await Promise.all([
        Recipe.list(),
        Order.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ]),
        CategoryTree.list(),
        loadMenuConfig()
      ]);

      setRecipes(recipesData);
      setOrders(ordersData);
      setCategories(categoriesData || []);
      setMenuConfig(configData);
      setDataVersion(prev => prev + 1); // Trigger para atualizar componentes

    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Carregamento inicial de dados
  useEffect(() => {
    refreshAllData();
  }, [weekNumber, year]);

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
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-green-500 animate-spin" />
          <p className="text-gray-600">Carregando dados da lista de compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lista-compras-container">
      {/* Header com navegação */}
      <Card className="print:hidden border-2 border-blue-200 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b-2 border-blue-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShoppingCart className="w-6 h-6" />
                Lista de Compras Semanal
              </CardTitle>
              <p className="text-blue-100 mt-1 font-medium">
                Ingredientes consolidados de todas as receitas da semana
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
                disabled={loading}
                className="gap-2 bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={printing}
                className="gap-2 bg-white border-gray-300 hover:bg-gray-50"
              >
                {printing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimir Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="bg-white pt-6">
          {/* Navegação de semana */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(-1)}
              className="flex items-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            >
              <ChevronLeft className="w-4 h-4" />
              Semana Anterior
            </Button>

            <div className="text-center bg-white p-3 rounded-lg border-2 border-indigo-300 shadow-md">
              <h3 className="text-lg font-semibold text-indigo-900">
                Semana {weekNumber}/{year}
              </h3>
              <p className="text-sm text-indigo-600">
                {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 4), "dd/MM/yyyy")}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(1)}
              className="flex items-center gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
            >
              Próxima Semana
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Toggle: Dia Selecionado / Semana Inteira */}
          <div className="flex justify-center gap-3 mb-4">
            <Button
              variant={!showWeekMode ? "default" : "outline"}
              size="sm"
              onClick={() => setShowWeekMode(false)}
              className={`gap-2 ${
                !showWeekMode
                  ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md"
                  : "border-orange-300 text-orange-700 hover:bg-orange-50"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Dia Selecionado
            </Button>

            <Button
              variant={showWeekMode ? "default" : "outline"}
              size="sm"
              onClick={() => setShowWeekMode(true)}
              className={`gap-2 ${
                showWeekMode
                  ? "bg-teal-600 text-white hover:bg-teal-700 shadow-md"
                  : "border-teal-300 text-teal-700 hover:bg-teal-50"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Semana Inteira
            </Button>
          </div>

          {/* Seleção de dias da semana (clicáveis) */}
          <div className="flex justify-center gap-3 mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
            {weekDays.map((day) => (
              <Button
                key={day.dayNumber}
                variant={selectedDay === day.dayNumber && !showWeekMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedDay(day.dayNumber);
                  setShowWeekMode(false); // Automaticamente muda para modo dia
                }}
                disabled={showWeekMode}
                className={`flex flex-col h-16 w-16 p-1 text-xs transition-all duration-200 ${
                  selectedDay === day.dayNumber && !showWeekMode
                    ? "bg-orange-500 text-white border-orange-600 shadow-lg transform scale-105"
                    : showWeekMode
                    ? "border-gray-300 text-gray-400 bg-white opacity-60"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100 hover:scale-105"
                }`}
              >
                <span className="font-medium">{day.dayShort}</span>
                <span className="text-xs opacity-80">{day.dayDate}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Componente de ingredientes consolidados */}
      <IngredientesConsolidados
        orders={orders}
        recipes={recipes}
        categories={categories}
        menuConfig={menuConfig}
        weekDays={weekDays}
        weekNumber={weekNumber}
        year={year}
        selectedDay={selectedDay}
        showWeekMode={showWeekMode}
        dataVersion={dataVersion}
      />
    </div>
  );
};

export default ListaComprasTabs;