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
import { Order, Recipe } from "@/app/api/entities";

// Componente de consolidação de ingredientes
import IngredientesConsolidados from './lista-compras/IngredientesConsolidados';

const ListaComprasTabs = () => {
  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  
  // Dados
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  
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
      
      const [recipesData, ordersData] = await Promise.all([
        Recipe.list(),
        Order.query([
          { field: 'week_number', operator: '==', value: weekNumber },
          { field: 'year', operator: '==', value: year }
        ])
      ]);
      
      setRecipes(recipesData);
      setOrders(ordersData);
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
      <Card className="print:hidden border-2 border-green-200 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b-2 border-green-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <ShoppingCart className="w-5 h-5" />
                Lista de Compras Semanal
              </CardTitle>
              <p className="text-green-700 mt-1 font-medium">
                Ingredientes consolidados de todas as receitas da semana
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
                disabled={loading}
                className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Dados
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
                Imprimir Lista
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
              className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Semana Anterior
            </Button>
            
            <div className="text-center bg-white p-3 rounded-lg border-2 border-green-200 shadow-sm">
              <h3 className="text-lg font-semibold text-green-800">
                Semana {weekNumber}/{year}
              </h3>
              <p className="text-sm text-green-600">
                {format(weekStart, "dd/MM")} - {format(addDays(weekStart, 4), "dd/MM/yyyy")}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek(1)}
              className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50"
            >
              Próxima Semana
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Resumo da semana */}
          <div className="grid grid-cols-5 gap-3 mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            {weekDays.map((day) => (
              <div
                key={day.dayNumber}
                className="text-center p-3 bg-white rounded-lg border border-emerald-200 shadow-sm"
              >
                <h4 className="font-semibold text-emerald-800 text-sm">
                  {day.dayShort}
                </h4>
                <p className="text-xs text-emerald-600 mt-1">
                  {day.dayDate}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Componente de ingredientes consolidados */}
      <IngredientesConsolidados 
        orders={orders}
        recipes={recipes}
        weekDays={weekDays}
        weekNumber={weekNumber}
        year={year}
        dataVersion={dataVersion}
      />
    </div>
  );
};

export default ListaComprasTabs;