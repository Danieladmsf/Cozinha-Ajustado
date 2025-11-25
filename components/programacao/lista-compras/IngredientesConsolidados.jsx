'use client';

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Scale, Package, AlertCircle, List, Grid3x3 } from "lucide-react";

// Utilitário para consolidação de ingredientes (VERSÃO CORRIGIDA)
import { consolidateIngredientsFromRecipes } from './utils/ingredientConsolidatorFixed';

const IngredientesConsolidados = ({
  orders = [],
  recipes = [],
  categories = [],
  menuConfig = null,
  weekDays = [],
  weekNumber,
  year,
  selectedDay = null,
  showWeekMode = true,
  dataVersion
}) => {
  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState("por-categoria");
  // ✅ NOVO: Obter categorias ativas na ordem configurada (igual ao cardápio)
  const getActiveCategories = useMemo(() => {
    if (!categories || !menuConfig) return [];

    // Filtrar apenas categorias de nível 1 (principais)
    let filteredCategories = categories.filter(cat => cat.level === 1);

    // Filtrar por categorias principais selecionadas
    if (menuConfig.selected_main_categories && menuConfig.selected_main_categories.length > 0) {
      filteredCategories = filteredCategories.filter(category => {
        return menuConfig.selected_main_categories.includes(category.type);
      });
    }

    // Filtrar categorias ativas
    const activeCategories = filteredCategories.filter(category => {
      return menuConfig.active_categories?.[category.id] === true;
    });

    // Aplicar ordem personalizada
    if (menuConfig.category_order && menuConfig.category_order.length > 0) {
      return menuConfig.category_order
        .map(id => activeCategories.find(cat => cat.id === id))
        .filter(Boolean);
    }

    return activeCategories;
  }, [categories, menuConfig]);
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

  // Consolidar todos os ingredientes GLOBALMENTE (para aba alfabética)
  const ingredientesConsolidados = useMemo(() => {
    if (!filteredOrders.length || !recipes.length) return [];

    return consolidateIngredientsFromRecipes(filteredOrders, recipes);
  }, [filteredOrders, recipes, dataVersion]);

  // ✅ NOVO: Extrair ingredientes SEM consolidação global (para agrupamento por categoria)
  const ingredientesSemConsolidacao = useMemo(() => {
    if (!filteredOrders.length || !recipes.length) return [];

    // Usar a mesma lógica mas sem a etapa de consolidação
    const { extractAllIngredientsWithoutConsolidation } = require('./utils/ingredientConsolidatorFixed');
    return extractAllIngredientsWithoutConsolidation(filteredOrders, recipes);
  }, [filteredOrders, recipes, dataVersion]);

  // ✅ ATUALIZADO: Agrupar ingredientes por categoria e consolidar DENTRO de cada categoria
  const ingredientesPorCategoria = useMemo(() => {
    const activeCategories = getActiveCategories;

    console.log('🔍 DEBUG ingredientesPorCategoria:', {
      totalIngredientesSemConsolidar: ingredientesSemConsolidacao.length,
      activeCategories: activeCategories?.length || 0,
      primeiroIngrediente: ingredientesSemConsolidacao[0]
    });

    // Helper para consolidar ingredientes duplicados dentro de uma categoria
    const consolidarDentroDeCategoria = (ingredientes) => {
      const consolidated = {};

      ingredientes.forEach(ing => {
        const key = `${ing.name}_${ing.unit}`.toLowerCase();

        if (consolidated[key]) {
          consolidated[key].quantity += ing.quantity;
          consolidated[key].weight += ing.weight;
          consolidated[key].usedInRecipes += 1;
          if (!consolidated[key].recipes.includes(ing.recipe)) {
            consolidated[key].recipes.push(ing.recipe);
          }
        } else {
          consolidated[key] = {
            name: ing.name,
            unit: ing.unit,
            quantity: ing.quantity,
            weight: ing.weight,
            recipes: [ing.recipe],
            usedInRecipes: 1,
            totalQuantity: ing.quantity,
            totalWeight: ing.weight
          };
        }
      });

      return Object.values(consolidated).sort((a, b) => a.name.localeCompare(b.name));
    };

    // ✅ FALLBACK: Se não há categorias configuradas, agrupar por categorias das receitas
    if (!activeCategories || activeCategories.length === 0) {
      console.warn('⚠️ Sem categorias ativas - usando fallback');

      const categoriasFallback = {};

      // Agrupar por categoria SEM consolidar
      ingredientesSemConsolidacao.forEach(ingrediente => {
        const categoriaReceita = ingrediente.recipeCategory || 'Outros';

        if (!categoriasFallback[categoriaReceita]) {
          categoriasFallback[categoriaReceita] = {
            name: categoriaReceita,
            ingredientes: []
          };
        }
        categoriasFallback[categoriaReceita].ingredientes.push(ingrediente);
      });

      // Consolidar dentro de cada categoria
      Object.keys(categoriasFallback).forEach(catName => {
        categoriasFallback[catName].ingredientes = consolidarDentroDeCategoria(
          categoriasFallback[catName].ingredientes
        );
      });

      console.log('✅ Categorias fallback criadas:', Object.keys(categoriasFallback));

      return categoriasFallback;
    }

    const categorias = {};

    // Inicializar categorias ativas
    activeCategories.forEach(cat => {
      categorias[cat.id] = {
        name: cat.name,
        ingredientes: []
      };
    });

    // Agrupar ingredientes por categoria SEM consolidar
    ingredientesSemConsolidacao.forEach(ingrediente => {
      const categoriaReceita = ingrediente.recipeCategory;

      if (!categoriaReceita) return;

      // Encontrar a categoria correspondente no CategoryTree
      const categoria = activeCategories.find(cat => cat.name === categoriaReceita);

      if (categoria && categorias[categoria.id]) {
        categorias[categoria.id].ingredientes.push(ingrediente);
      }
    });

    // Consolidar ingredientes DENTRO de cada categoria
    Object.keys(categorias).forEach(catId => {
      categorias[catId].ingredientes = consolidarDentroDeCategoria(
        categorias[catId].ingredientes
      );
    });

    // Filtrar categorias vazias
    const categoriasComIngredientes = {};
    Object.entries(categorias).forEach(([catId, catData]) => {
      if (catData.ingredientes.length > 0) {
        categoriasComIngredientes[catId] = catData;
      }
    });

    return categoriasComIngredientes;
  }, [ingredientesSemConsolidacao, getActiveCategories]);

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
      <Card className="border-2 border-slate-200 bg-white shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-100 to-gray-100 border-b-2 border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Scale className="w-6 h-6 text-blue-600" />
            {showWeekMode ? (
              `Resumo da Lista de Compras - Semana ${weekNumber}/${year}`
            ) : (
              <>
                Resumo da Lista de Compras - {weekDays.find(d => d.dayNumber === selectedDay)?.dayName || `Dia ${selectedDay}`}
                <span className="text-sm font-normal text-slate-600 ml-2">
                  ({weekDays.find(d => d.dayNumber === selectedDay)?.fullDate})
                </span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-300 text-center shadow-md hover:shadow-lg transition-shadow">
              <Package className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <h4 className="font-bold text-2xl text-orange-800">
                {estatisticas.totalIngredientes}
              </h4>
              <p className="text-orange-600 text-sm font-medium">
                Ingredientes Únicos
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-300 text-center shadow-md hover:shadow-lg transition-shadow">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h4 className="font-bold text-2xl text-purple-800">
                {estatisticas.totalCategorias}
              </h4>
              <p className="text-purple-600 text-sm font-medium">
                Categorias
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border-2 border-teal-300 text-center shadow-md hover:shadow-lg transition-shadow">
              <Scale className="w-8 h-8 mx-auto mb-2 text-teal-600" />
              <h4 className="font-bold text-2xl text-teal-800">
                {estatisticas.pesoTotal.toFixed(2)}kg
              </h4>
              <p className="text-teal-600 text-sm font-medium">
                Peso Total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistema de abas para visualizações diferentes */}
      <Card className="border-2 border-teal-400 shadow-xl bg-white">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 border-b-2 border-teal-700">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            LISTA DE INGREDIENTES
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="por-categoria" className="flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                Por Categoria
              </TabsTrigger>
              <TabsTrigger value="alfabetica" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Ordem Alfabética
              </TabsTrigger>
            </TabsList>

            {/* Aba 1: Por Categoria */}
            <TabsContent value="por-categoria">
          <div className="space-y-8">
            {/* ✅ ATUALIZADO: Categorias na ordem do cardápio */}
            {Object.entries(ingredientesPorCategoria).map(([catId, catData], categoryIndex) => {
              // Definir cores alternadas para cada categoria
              const categoryColors = [
                { bg: 'bg-blue-50', border: 'border-blue-300', header: 'bg-blue-100', text: 'text-blue-900', hover: 'hover:bg-blue-100' },
                { bg: 'bg-purple-50', border: 'border-purple-300', header: 'bg-purple-100', text: 'text-purple-900', hover: 'hover:bg-purple-100' },
                { bg: 'bg-orange-50', border: 'border-orange-300', header: 'bg-orange-100', text: 'text-orange-900', hover: 'hover:bg-orange-100' },
                { bg: 'bg-teal-50', border: 'border-teal-300', header: 'bg-teal-100', text: 'text-teal-900', hover: 'hover:bg-teal-100' },
                { bg: 'bg-pink-50', border: 'border-pink-300', header: 'bg-pink-100', text: 'text-pink-900', hover: 'hover:bg-pink-100' },
              ];
              const colors = categoryColors[categoryIndex % categoryColors.length];

              return (
                <div key={catId} className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4 shadow-md`}>
                  {/* Nome da categoria */}
                  <div className="mb-4">
                    <h3 className={`text-lg font-bold ${colors.text} mb-3 border-b-2 ${colors.border} pb-2`}>
                      {catData.name.toUpperCase()}
                    </h3>
                  </div>

                  {/* Tabela de ingredientes */}
                  <div className="overflow-x-auto rounded-lg">
                    <table className={`w-full border-2 ${colors.border} bg-white`}>
                      <thead>
                        <tr className={colors.header}>
                          <th className={`border ${colors.border} px-4 py-3 text-left font-bold ${colors.text}`}>
                            INGREDIENTE
                          </th>
                          <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                            QUANTIDADE TOTAL
                          </th>
                          <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                            UNIDADE
                          </th>
                          <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                            PESO TOTAL (kg)
                          </th>
                          <th className={`border ${colors.border} px-4 py-3 text-center font-bold ${colors.text}`}>
                            RECEITAS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {catData.ingredientes.map((ingrediente, index) => (
                          <tr key={`${ingrediente.name}_${index}`} className={`${colors.hover} transition-colors`}>
                            <td className={`border ${colors.border} px-4 py-2 font-semibold text-gray-800`}>
                              {ingrediente.name}
                            </td>
                            <td className={`border ${colors.border} px-4 py-2 text-center font-bold text-gray-900`}>
                              {ingrediente.totalQuantity.toFixed(3)}
                            </td>
                            <td className={`border ${colors.border} px-4 py-2 text-center text-gray-700`}>
                              {ingrediente.unit}
                            </td>
                            <td className={`border ${colors.border} px-4 py-2 text-center font-bold text-gray-900`}>
                              {ingrediente.totalWeight.toFixed(3)}
                            </td>
                            <td className={`border ${colors.border} px-4 py-2 text-center text-sm text-gray-600`}>
                              {ingrediente.usedInRecipes} receitas
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
            </TabsContent>

            {/* Aba 2: Ordem Alfabética */}
            <TabsContent value="alfabetica">
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full border-2 border-slate-300 bg-white">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-100 to-gray-100">
                        <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                          INGREDIENTE
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          QUANTIDADE TOTAL
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          UNIDADE
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          PESO TOTAL (kg)
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                          CATEGORIAS QUE USAM
                        </th>
                        <th className="border border-slate-300 px-4 py-3 text-center font-bold text-slate-900">
                          Nº RECEITAS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientesConsolidados.map((ingrediente, index) => (
                        <tr key={`${ingrediente.name}_${index}`} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-300 px-4 py-2 font-semibold text-gray-800">
                            {ingrediente.name}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center font-bold text-gray-900">
                            {ingrediente.totalQuantity.toFixed(3)}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center text-gray-700">
                            {ingrediente.unit}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center font-bold text-gray-900">
                            {ingrediente.totalWeight.toFixed(3)}
                          </td>
                          <td className="border border-slate-300 px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {ingrediente.recipeCategories && ingrediente.recipeCategories.length > 0 ? (
                                ingrediente.recipeCategories.map((category, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200"
                                  >
                                    {category}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm italic">Sem categoria</span>
                              )}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-center text-sm text-gray-600">
                            {ingrediente.usedInRecipes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default IngredientesConsolidados;