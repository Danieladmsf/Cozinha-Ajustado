'use client';

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Scale, Package, AlertCircle } from "lucide-react";

// Utilitário para consolidação de ingredientes (VERSÃO CORRIGIDA)
import { consolidateIngredientsFromRecipes } from './utils/ingredientConsolidatorFixed';

const IngredientesConsolidados = ({
  orders = [],
  recipes = [],
  weekDays = [],
  weekNumber,
  year,
  selectedDay = null,
  showWeekMode = true,
  dataVersion
}) => {
  // ✅ CORREÇÃO: Filtrar apenas o último pedido de cada cliente por dia
  // Isso evita somar pedidos duplicados na lista de compras
  const getLatestOrderPerCustomer = (orders) => {
    const ordersByCustomerAndDay = {};

    orders.forEach(order => {
      const key = `${order.customer_name}_${order.day_of_week}`;
      // Substituir pedido anterior - pega sempre o último do array
      ordersByCustomerAndDay[key] = order;
    });

    return Object.values(ordersByCustomerAndDay);
  };

  // Filtrar pedidos pelo dia se necessário
  const filteredOrders = useMemo(() => {
    // Primeiro, remover duplicados (pegar apenas último pedido de cada cliente por dia)
    const uniqueOrders = getLatestOrderPerCustomer(orders);

    if (showWeekMode || !selectedDay) {
      return uniqueOrders; // Modo semana: todos os pedidos únicos
    }
    // Modo dia: filtrar pelo dia selecionado
    return uniqueOrders.filter(order => order.day_of_week === selectedDay);
  }, [orders, selectedDay, showWeekMode]);

  // Consolidar todos os ingredientes (da semana ou do dia)
  const ingredientesConsolidados = useMemo(() => {
    if (!filteredOrders.length || !recipes.length) return [];

    return consolidateIngredientsFromRecipes(filteredOrders, recipes);
  }, [filteredOrders, recipes, dataVersion]);

  // Agrupar ingredientes por categoria
  const ingredientesPorCategoria = useMemo(() => {
    const categorias = {};
    
    ingredientesConsolidados.forEach(ingrediente => {
      const categoria = ingrediente.category || 'Outros';
      
      if (!categorias[categoria]) {
        categorias[categoria] = [];
      }
      
      categorias[categoria].push(ingrediente);
    });
    
    // Ordenar ingredientes dentro de cada categoria alfabeticamente
    Object.keys(categorias).forEach(categoria => {
      categorias[categoria].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return categorias;
  }, [ingredientesConsolidados]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    const totalIngredientes = ingredientesConsolidados.length;
    const totalCategorias = Object.keys(ingredientesPorCategoria).length;
    const pesoTotal = ingredientesConsolidados.reduce((total, ing) => total + ing.totalWeight, 0);
    
    return {
      totalIngredientes,
      totalCategorias,
      pesoTotal
    };
  }, [ingredientesConsolidados, ingredientesPorCategoria]);

  if (ingredientesConsolidados.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold text-lg text-gray-700 mb-2">
            Nenhum Ingrediente Encontrado
          </h3>
          <p className="text-gray-500 text-sm">
            Não há pedidos ou receitas com ingredientes para a semana selecionada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Scale className="w-6 h-6" />
            {showWeekMode ? (
              `Resumo da Lista de Compras - Semana ${weekNumber}/${year}`
            ) : (
              <>
                Resumo da Lista de Compras - {weekDays.find(d => d.dayNumber === selectedDay)?.dayName || `Dia ${selectedDay}`}
                <span className="text-sm font-normal text-green-600 ml-2">
                  ({weekDays.find(d => d.dayNumber === selectedDay)?.fullDate})
                </span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-bold text-2xl text-green-800">
                {estatisticas.totalIngredientes}
              </h4>
              <p className="text-green-600 text-sm">
                Ingredientes Únicos
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-bold text-2xl text-green-800">
                {estatisticas.totalCategorias}
              </h4>
              <p className="text-green-600 text-sm">
                Categorias
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
              <Scale className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-bold text-2xl text-green-800">
                {estatisticas.pesoTotal.toFixed(2)}kg
              </h4>
              <p className="text-green-600 text-sm">
                Peso Total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de ingredientes por categoria */}
      <Card className="border-2 border-green-500 shadow-lg bg-white">
        <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b-2 border-green-300">
          <CardTitle className="text-xl font-bold text-green-900">
            INGREDIENTES POR CATEGORIA (ORDEM ALFABÉTICA)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            {Object.entries(ingredientesPorCategoria)
              .sort(([a], [b]) => a.localeCompare(b)) // Ordenar categorias alfabeticamente
              .map(([categoria, ingredientes]) => (
                <div key={categoria}>
                  {/* Nome da categoria */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-green-800 mb-3 border-b-2 border-green-200 pb-2">
                      {categoria.toUpperCase()}
                    </h3>
                  </div>
                  
                  {/* Tabela de ingredientes */}
                  <div className="overflow-x-auto">
                    <table className="w-full border border-green-300">
                      <thead>
                        <tr className="bg-green-100">
                          <th className="border border-green-300 px-4 py-2 text-left font-bold text-green-900">
                            INGREDIENTE
                          </th>
                          <th className="border border-green-300 px-4 py-2 text-center font-bold text-green-900">
                            QUANTIDADE TOTAL
                          </th>
                          <th className="border border-green-300 px-4 py-2 text-center font-bold text-green-900">
                            UNIDADE
                          </th>
                          <th className="border border-green-300 px-4 py-2 text-center font-bold text-green-900">
                            PESO TOTAL (kg)
                          </th>
                          <th className="border border-green-300 px-4 py-2 text-center font-bold text-green-900">
                            RECEITAS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredientes.map((ingrediente, index) => (
                          <tr key={`${ingrediente.name}_${index}`} className="hover:bg-green-50">
                            <td className="border border-green-300 px-4 py-2 font-semibold text-gray-800">
                              {ingrediente.name}
                            </td>
                            <td className="border border-green-300 px-4 py-2 text-center font-bold text-gray-900">
                              {ingrediente.totalQuantity.toFixed(3)}
                            </td>
                            <td className="border border-green-300 px-4 py-2 text-center text-gray-700">
                              {ingrediente.unit}
                            </td>
                            <td className="border border-green-300 px-4 py-2 text-center font-bold text-gray-900">
                              {ingrediente.totalWeight.toFixed(3)}
                            </td>
                            <td className="border border-green-300 px-4 py-2 text-center text-sm text-gray-600">
                              {ingrediente.usedInRecipes} receitas
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientesConsolidados;