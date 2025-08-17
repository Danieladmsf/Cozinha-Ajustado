'use client';


import React, { useState, useEffect, useMemo } from "react";
import { Recipe } from "@/app/api/entities";
import { Ingredient } from "@/app/api/entities";
import { PriceHistory } from "@/app/api/entities";
import { format, subDays, subMonths, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Chart components
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";

// Icons
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart2,
  Filter as FilterIcon,
  Search,
  Info,
  AlertTriangle,
  Layers,
  List,
  ArrowRight,
  ChefHat,
  Utensils,
  Percent,
  ArrowRightLeft,
  Calendar as CalendarIcon
} from "lucide-react";

export default function RecipeAnalysis() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [selectedRecipeDetails, setSelectedRecipeDetails] = useState(null);
  const [timeRange, setTimeRange] = useState("3m"); // 1w, 1m, 3m, 6m, 1y
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("cost_overview");
  const [sortBy, setSortBy] = useState("volatility"); // volatility, price, name

  // Constantes de estilo
  const THEME_COLORS = {
    primary: {
      light: '#EEF2FF', // indigo-50
      main: '#4F46E5',  // indigo-600
      dark: '#4338CA'   // indigo-700
    },
    success: {
      light: '#ECFDF5', // green-50
      main: '#10B981',  // green-500
      dark: '#059669'   // green-600
    },
    warning: {
      light: '#FFFBEB', // amber-50
      main: '#F59E0B',  // amber-500
      dark: '#D97706'   // amber-600
    },
    error: {
      light: '#FEF2F2', // red-50
      main: '#EF4444',  // red-500
      dark: '#DC2626'   // red-600
    },
    neutral: {
      light: '#F9FAFB', // gray-50
      main: '#6B7280',  // gray-500
      dark: '#374151'   // gray-700
    }
  };

  // Cores para os gráficos
  const CHART_COLORS = {
    primary: '#4F46E5',   // indigo-600
    success: '#10B981',   // green-500
    error: '#EF4444',     // red-500
    warning: '#F59E0B',   // amber-500
    gray: '#94A3B8'       // gray-400
  };

  // *** FUNÇÕES AUXILIARES - PRIMEIRO DECLARE AS FUNÇÕES BÁSICAS ***
  
  // Formatar valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar valor percentual
  const formatPercent = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`;
  };
  
  // Função auxiliar para verificar se é o mesmo dia
  const isSameDay = (date1, date2) => {
    return format(date1, 'yyyy-MM-dd') === format(date2, 'yyyy-MM-dd');
  };
  
  // Função para determinar a cor do card baseado no valor
  const getCardStyle = (value, type) => {
    if (type === 'volatility') {
      if (value > 10) return 'bg-red-50 border-red-100 text-red-700';
      if (value > 5) return 'bg-amber-50 border-amber-100 text-amber-700';
      return 'bg-emerald-50 border-emerald-100 text-emerald-700';
    }
    
    if (type === 'trend') {
      // Padronizando: vermelho para aumento, verde para diminuição
      if (value > 0) return 'bg-red-50 border-red-100';
      if (value < 0) return 'bg-emerald-50 border-emerald-100';
      return 'bg-gray-50 border-gray-100';
    }
    
    return 'bg-white border-gray-100';
  };
  
  // *** FUNÇÕES DE CÁLCULO DE PREÇO E VOLATILIDADE ***
  
  // Calcular custo atual da receita com base nos preços atuais dos ingredientes
  const calculateCurrentRecipeCost = (recipe) => {
    if (!recipe?.ingredients) return 0;
    return recipe.ingredients.reduce((total, ing) => {
      const ingredientData = ingredients.find(i => i.id === ing.ingredient_id);
      if (!ingredientData) return total;
      return total + (ingredientData.current_price * ing.quantity);
    }, 0);
  };
  
  // Obter preço de um ingrediente em uma data específica
  const getIngredientPriceAtDate = (ingredientId, targetDate) => {
    if (!ingredientId || !targetDate) return 0;
    
    // Verificar se o ingrediente existe
    const ingredientData = ingredients.find(i => i.id === ingredientId);
    if (!ingredientData) return 0;
    
    // Se não houver histórico, retornar preço atual
    if (!priceHistory || priceHistory.length === 0) {
      return ingredientData.current_price || 0;
    }
    
    // Filtrar histórico de preços para este ingrediente, ordenado por data (mais recente primeiro)
    const history = priceHistory
      .filter(item => item.ingredient_id === ingredientId)
      .filter(item => isBefore(parseISO(item.date), parseISO(targetDate)) || isSameDay(parseISO(item.date), parseISO(targetDate)))
      .sort((a, b) => parseISO(b.date) - parseISO(a.date));
    
    // Se houver registros, retornar o mais recente até a data alvo
    if (history.length > 0) {
      return history[0].new_price;
    }
    
    // Se não houver registros para a data alvo, retornar preço atual
    return ingredientData.current_price || 0;
  };
  
  // Calcular custo da receita em uma data específica
  const calculateRecipeCostAtDate = (recipe, targetDate) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return 0;
    
    let totalCost = 0;
    
    recipe.ingredients.forEach(ingredient => {
      // Encontrar preço do ingrediente na data alvo
      const priceAtDate = getIngredientPriceAtDate(ingredient.ingredient_id, targetDate);
      
      // Calcular custo baseado na quantidade e conversão de unidade
      let cost = 0;
      if (ingredient.unit === 'kg') {
        // Converter para kg para cálculo
        cost = (ingredient.quantity * priceAtDate);
      } else if (ingredient.unit === 'g') {
        // Converter para kg para cálculo
        cost = (ingredient.quantity / 1000) * priceAtDate;
      } else {
        // Outros formatos de unidade (usar direto)
        cost = ingredient.quantity * priceAtDate;
      }
      
      totalCost += cost;
    });
    
    return totalCost;
  };
  
  // Calcular histórico de preços para uma receita específica
  const calculateRecipePriceHistory = async (recipe) => {
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      return {
        ...recipe,
        priceHistory: [],
        volatilityScore: 0,
        averageChange: 0
      };
    }

    // Definir período de análise com base no timeRange
    const today = new Date();
    let startDate;
    
    switch (timeRange) {
      case "1w": startDate = subDays(today, 7); break;
      case "1m": startDate = subMonths(today, 1); break;
      case "3m": startDate = subMonths(today, 3); break;
      case "6m": startDate = subMonths(today, 6); break;
      case "1y": startDate = subMonths(today, 12); break;
      default: startDate = subMonths(today, 3);
    }

    // Gerar sequência de datas para análise (intervalo semanal)
    const dates = [];
    let currentDate = startDate;
    
    while (isAfter(today, currentDate) || isSameDay(today, currentDate)) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate = addDays(currentDate, 7); // Intervalo semanal
    }
    
    // Se a última data não for hoje, adicionar hoje
    if (format(currentDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
      dates.push(format(today, 'yyyy-MM-dd'));
    }

    // Calcular custo da receita em cada data
    const priceHistory = [];
    let prevPrice = null;
    let volatilitySum = 0;
    let changeCount = 0;

    for (const date of dates) {
      const cost = calculateRecipeCostAtDate(recipe, date);
      
      if (prevPrice !== null) {
        // Usado para volatilidade - valor absoluto da variação percentual
        const change = ((cost - prevPrice) / prevPrice) * 100;
        volatilitySum += Math.abs(change); // Usar valor absoluto para volatilidade
        changeCount++;
      }
      
      priceHistory.push({
        date,
        cost,
        formattedDate: format(parseISO(date), 'dd/MM/yyyy')
      });
      
      prevPrice = cost;
    }

    // Adicionar valores percentuais de variação
    for (let i = 1; i < priceHistory.length; i++) {
      const prevCost = priceHistory[i-1].cost;
      const currentCost = priceHistory[i].cost;
      
      // Garantir que não haverá divisão por zero
      if (prevCost === 0) {
        priceHistory[i].percentChange = currentCost > 0 ? 100 : 0;
      } else {
        priceHistory[i].percentChange = ((currentCost - prevCost) / prevCost) * 100;
      }
    }

    // Calcular métricas de volatilidade - média do módulo das variações percentuais
    const volatilityScore = changeCount > 0 ? (volatilitySum / changeCount) : 0;
    
    // Calcular variação média (com sinal, não é valor absoluto)
    const firstPrice = priceHistory[0]?.cost || 0;
    const lastPrice = priceHistory[priceHistory.length - 1]?.cost || 0;
    const totalChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

    return {
      ...recipe,
      priceHistory,
      volatilityScore,
      averageChange: totalChange // Usar variação total do período
    };
  };
  
  // Função corrigida para calcular contribuição dos ingredientes
  const calculateIngredientContributions = (recipe) => {
    if (!recipe?.ingredients) return [];
    
    const currentTotalCost = calculateCurrentRecipeCost(recipe);
    if (currentTotalCost <= 0) return [];

    return recipe.ingredients.map(ing => {
      const ingredientData = ingredients.find(i => i.id === ing.ingredient_id);
      if (!ingredientData) return null;

      const currentCost = ingredientData.current_price * ing.quantity;
      const contribution = (currentCost / currentTotalCost) * 100;

      // Calcular variação de preço nos últimos 3 meses
      const today = new Date();
      const threeMonthsAgo = subMonths(today, 3);
      
      const relevantHistory = priceHistory
        .filter(h => h.ingredient_id === ing.ingredient_id)
        .filter(h => isAfter(parseISO(h.date), threeMonthsAgo))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      let priceChange = 0;
      if (relevantHistory.length >= 2) {
        const oldestPrice = relevantHistory[0].new_price;
        const latestPrice = relevantHistory[relevantHistory.length - 1].new_price;
        priceChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;
      }

      // Calcular impacto na receita
      const costImpact = (priceChange * contribution) / 100;

      return {
        ...ing,
        name: ingredientData.name,
        currentPrice: ingredientData.current_price,
        quantity: ing.quantity,
        unit: ing.unit,
        total_cost: currentCost,
        contribution,
        priceChange,
        costImpact
      };
    }).filter(Boolean);
  };

  // *** EFEITOS E CARREGAMENTO DE DADOS ***

  // Carregar dados ao iniciar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar receitas, ingredientes e histórico de preços
      const [recipesData, ingredientsData, historyData] = await Promise.all([
        Recipe.list(),
        Ingredient.list(),
        PriceHistory.list()
      ]);
      
      setRecipes(recipesData.filter(r => r.active));
      setIngredients(ingredientsData);
      setPriceHistory(historyData);

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados. Tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  // Corrigindo seleção de receita para não recalcular a volatilidade
  const selectRecipe = async (recipe) => {
    if (!recipe) return;
    
    try {
      setLoadingDetails(true);
      setSelectedRecipe(recipe);
      
      // Calcular histórico de preços para esta receita
      const recipeWithHistory = await calculateRecipePriceHistory(recipe);
      
      // Não recalcular a volatilidade aqui - usar o volatilityScore calculado em calculateRecipePriceHistory
      // Esta linha foi removida: recipeWithHistory.consistentVolatility = calculateConsistentVolatility(recipe, '3m');
      
      setSelectedRecipeDetails(recipeWithHistory);
      setActiveTab("cost_overview");
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao processar detalhes da receita"
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // *** COMPONENTES DE UI E RENDERIZAÇÃO ***
  
  // Lógica de filtragem e ordenação - adicionando priceHistory como dependência
  const filteredRecipes = useMemo(() => {
    let result = [...recipes];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(recipe => 
        recipe.name.toLowerCase().includes(searchLower) || 
        recipe.category.toLowerCase().includes(searchLower)
      );
    }
    
    // Calcular custo atual e volatilidade para cada receita
    result = result.map(recipe => {
      // Calcular o custo atual com base nos preços atuais dos ingredientes
      const calculatedCurrentCost = calculateCurrentRecipeCost(recipe);
      
      // Calcular volatilidade - usar a mesma lógica de calculateRecipePriceHistory
      // Gerar datas para análise (últimos 3 meses, intervalo semanal)
      const today = new Date();
      const startDate = subMonths(today, 3);
      const dates = [];
      let currentDate = startDate;
      
      while (isAfter(today, currentDate) || isSameDay(today, currentDate)) {
        dates.push(format(currentDate, 'yyyy-MM-dd'));
        currentDate = addDays(currentDate, 7);
      }
      
      if (format(currentDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) {
        dates.push(format(today, 'yyyy-MM-dd'));
      }
      
      // Calcular volatilidade como em calculateRecipePriceHistory
      let prevPrice = null;
      let volatilitySum = 0;
      let changeCount = 0;
      
      for (const date of dates) {
        const cost = calculateRecipeCostAtDate(recipe, date);
        
        if (prevPrice !== null && prevPrice > 0) {
          const change = ((cost - prevPrice) / prevPrice) * 100;
          volatilitySum += Math.abs(change);
          changeCount++;
        }
        
        prevPrice = cost;
      }
      
      const volatilityScore = changeCount > 0 ? volatilitySum / changeCount : 0;
      
      return {
        ...recipe,
        calculatedCurrentCost,
        volatilityScore
      };
    });
    
    // Ordenação
    if (sortBy === 'volatility') {
      result.sort((a, b) => b.volatilityScore - a.volatilityScore);
    } else if (sortBy === 'price') {
      result.sort((a, b) => b.calculatedCurrentCost - a.calculatedCurrentCost);
    } else { // name
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  }, [recipes, searchTerm, sortBy, ingredients, priceHistory]); // Adicionado priceHistory como dependência

  // Renderizar itens da lista de receitas - usar volatilityScore em vez de consistentVolatility
  const renderRecipeList = (recipe) => (
    <div 
      key={recipe.id}
      className={`flex items-center justify-between p-3 cursor-pointer rounded-lg transition-all duration-200 ${
        selectedRecipe?.id === recipe.id 
          ? 'bg-indigo-50 border border-indigo-100 shadow-sm' 
          : 'hover:bg-gray-50 border border-transparent'
      }`}
      onClick={() => selectRecipe(recipe)}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${
          selectedRecipe?.id === recipe.id 
            ? 'bg-indigo-100 text-indigo-600' 
            : 'bg-gray-100 text-gray-500'
        }`}>
          <Utensils className="h-5 w-5" />
        </div>
        <div>
          <p className={`font-medium ${
            selectedRecipe?.id === recipe.id 
              ? 'text-indigo-900' 
              : 'text-gray-700'
          }`}>
            {recipe.name}
          </p>
          <div className="flex items-center text-sm text-gray-500 gap-2">
            <span>{recipe.category}</span>
            <span className="text-gray-300">•</span>
            <span className="text-emerald-600 font-medium">
              {formatCurrency(recipe.calculatedCurrentCost)}
            </span>
          </div>
        </div>
      </div>
      
      {recipe.volatilityScore > 0 && (
        <Badge className={cn(
          "font-medium shadow-sm",
          recipe.volatilityScore > 10 
            ? "bg-red-50 text-red-700 border-red-200" 
            : recipe.volatilityScore > 5
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        )}>
          {recipe.volatilityScore.toFixed(1)}%
        </Badge>
      )}
    </div>
  );

  // Renderizar cabeçalho da receita selecionada
  const renderRecipeHeader = () => {
    if (!selectedRecipe) return null;

    return (
      <Card className="overflow-hidden border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-indigo-500/10 border-b border-indigo-100">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl text-indigo-900">{selectedRecipe.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    {selectedRecipe.category}
                  </Badge>
                  <span className="flex items-center gap-1 text-indigo-600">
                    <Clock className="h-3.5 w-3.5" />
                    {selectedRecipe.prep_time || 0} min
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <DollarSign className="h-3.5 w-3.5" />
                    {formatCurrency(calculateCurrentRecipeCost(selectedRecipeDetails))}
                  </span>
                  {selectedRecipe.yield_weight && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      Rendimento: {selectedRecipe.yield_weight > 1000 
                        ? `${(selectedRecipe.yield_weight / 1000).toFixed(2)}kg`
                        : `${selectedRecipe.yield_weight}g`}
                    </span>
                  )}
                </div>
              </CardDescription>
            </div>
            
            <Badge 
              className={`flex items-center gap-1 shadow-sm ${
                (selectedRecipeDetails?.volatilityScore || 0) > 10 
                  ? "bg-red-50 text-red-700 border-red-200" 
                  : (selectedRecipeDetails?.volatilityScore || 0) > 5
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              <Percent className="h-3 w-3" />
              Volatilidade: {(selectedRecipeDetails?.volatilityScore || 0).toFixed(2)}%
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  };

    // Calcular contribuição de cada ingrediente para o custo total
    const calculateIngredientContribution = (recipe) => {
      if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
        return [];
      }
      
      const totalCost = recipe.total_cost || 0;
      if (totalCost <= 0) return [];
      
      return recipe.ingredients.map(ing => {
        const ingredientCost = ing.total_cost || 0;
        const contribution = (ingredientCost / totalCost) * 100;
        
        return {
          ...ing,
          contribution: contribution,
          name: ingredients.find(i => i.id === ing.ingredient_id)?.name || "Ingrediente desconhecido"
        };
      });
    };

  // Renderizar card de métrica
  const renderMetricCard = (title, value, subtitle, icon, trend = null, type = null) => {
    const cardStyle = getCardStyle(trend || value, type);
    
    return (
      <Card className={`backdrop-blur-sm hover:bg-opacity-80 transition-all duration-300 border ${cardStyle}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {trend !== null && (
            <p className={`text-sm flex items-center mt-1 ${
              // Padronizando as cores das variações: 
              // vermelho para alta/aumento, verde para baixa/diminuição
              trend > 0 ? 'text-red-600' : trend < 0 ? 'text-emerald-600' : 'text-gray-500'
            }`}>
              {trend > 0 ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : trend < 0 ? (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              ) : null}
              {formatPercent(trend)}
              <span className="text-gray-500 ml-1">{subtitle}</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Atualizar tabs
  const renderTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4 p-1 bg-gray-100/50 backdrop-blur-sm">
        <TabsTrigger 
          value="cost_overview" 
          className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700"
        >
          <TrendingUp className="h-4 w-4" />
          Visão Geral
        </TabsTrigger>
        <TabsTrigger 
          value="ingredients_analysis"
          className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700"
        >
          <Layers className="h-4 w-4" />
          Análise de Ingredientes
        </TabsTrigger>
        <TabsTrigger 
          value="recipe_comparison"
          className="flex items-center gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700"
        >
          <BarChart2 className="h-4 w-4" />
          Comparação
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="cost_overview">
        {renderCostOverviewTab()}
      </TabsContent>
      
      <TabsContent value="ingredients_analysis">
        {renderIngredientsAnalysisTab()}
      </TabsContent>
      
      <TabsContent value="recipe_comparison">
        {renderRecipeComparisonTab()}
      </TabsContent>
    </Tabs>
  );

  // Atualizar a aba de visão geral com cálculos corrigidos
  const renderCostOverviewTab = () => {
    if (!selectedRecipeDetails) return null;
    
    const recipe = selectedRecipeDetails;
    const priceData = recipe.priceHistory || [];
    
    if (priceData.length === 0) {
      return (
        <div className="flex items-center justify-center h-60 text-center">
          <div className="max-w-md">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Dados históricos insuficientes</h3>
            <p className="text-sm text-gray-500 mt-2">
              Não há dados históricos suficientes para analisar esta receita.
            </p>
          </div>
        </div>
      );
    }

    const costs = priceData.map(item => item.cost);
    const maxCost = Math.max(...costs);
    const minCost = Math.min(...costs);
    const currentCost = calculateCurrentRecipeCost(recipe);
    
    // Calcular variações corretas
    const variationMinToMax = minCost > 0 ? ((maxCost - minCost) / minCost) * 100 : 0;
    const variationMaxToMin = maxCost > 0 ? ((minCost - maxCost) / maxCost) * 100 : 0;
    const totalChange = priceData[0].cost > 0 
      ? ((currentCost - priceData[0].cost) / priceData[0].cost) * 100 
      : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderMetricCard(
            "Custo Atual",
            formatCurrency(currentCost),
            "no período",
            <DollarSign className="h-4 w-4" />,
            totalChange,
            'trend'
          )}
          {renderVolatilityCard(recipe.volatilityScore)}
          {renderMetricCard(
            "Maior Custo",
            formatCurrency(maxCost),
            "Valor máximo registrado",
            <ChevronUp className="h-4 w-4" />,
            variationMinToMax,
            'trend'
          )}
          {renderMetricCard(
            "Menor Custo",
            formatCurrency(minCost),
            "Valor mínimo registrado",
            <ChevronDown className="h-4 w-4" />,
            variationMaxToMin,
            'trend'
          )}
        </div>

        {/* Gráfico de evolução de preço */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evolução do Custo da Receita</CardTitle>
            <CardDescription className="text-gray-500">
              Período: {timeRange === '1w' ? 'Última semana' : 
                       timeRange === '1m' ? 'Último mês' : 
                       timeRange === '3m' ? 'Últimos 3 meses' : 
                       timeRange === '6m' ? 'Últimos 6 meses' : 'Último ano'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={priceData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ fontSize: 12 }} 
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cost" 
                  name="Custo Total" 
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ r: 4 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Gráfico de variação percentual */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Variação Percentual Semana a Semana</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priceData.filter(item => item.percentChange !== undefined)}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <Tooltip 
                  formatter={(value) => `${value.toFixed(2)}%`}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="percentChange" 
                  name="Variação %" 
                  fill={(data) => data > 0 ? CHART_COLORS.error : CHART_COLORS.success}
                  radius={[4, 4, 0, 0]}
                >
                  {priceData.filter(item => item.percentChange !== undefined).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentChange >= 0 ? CHART_COLORS.error : CHART_COLORS.success} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Tabela de dados históricos */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Dados Históricos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left font-medium text-gray-600">Data</th>
                    <th className="p-2 text-right font-medium text-gray-600">Custo Total</th>
                    <th className="p-2 text-right font-medium text-gray-600">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {priceData.reverse().map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="p-2">{item.formattedDate}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(item.cost)}</td>
                      <td className="p-2 text-right">
                        {item.percentChange !== undefined ? (
                          <span className={item.percentChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatPercent(item.percentChange)}
                          </span>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Renderizar volatilidade com valor correto
  const renderVolatilityCard = (volatilityScore) => {
    const getVolatilityStyle = (score) => {
      if (score > 10) return 'text-red-600';
      if (score > 5) return 'text-amber-600';
      return 'text-emerald-600';
    };

    const averageChange = selectedRecipeDetails?.averageChange || 0;

    return (
      <Card className={cn(
        "backdrop-blur-sm transition-all duration-300 border",
        volatilityScore > 10 ? "bg-red-50 border-red-100" :
        volatilityScore > 5 ? "bg-amber-50 border-amber-100" :
        "bg-emerald-50 border-emerald-100"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Volatilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getVolatilityStyle(volatilityScore)}>
              {volatilityScore.toFixed(2)}%
            </span>
          </div>
          <p className="text-sm flex items-center mt-1">
            <span className={
              averageChange > 0 ? 'text-red-600' : 
              averageChange < 0 ? 'text-emerald-600' : 
              'text-gray-500'
            }>
              {averageChange !== 0 && (
                averageChange > 0 
                  ? <ArrowUpRight className="h-4 w-4 mr-1 inline" />
                  : <ArrowDownRight className="h-4 w-4 mr-1 inline" />
              )}
              {formatPercent(averageChange)}
            </span>
            <span className="text-gray-500 ml-1">variação total no período</span>
          </p>
        </CardContent>
      </Card>
    );
  };

  // Atualização do renderIngredientsAnalysisTab para cálculos corretos
  const renderIngredientsAnalysisTab = () => {
    if (!selectedRecipeDetails || !selectedRecipeDetails.ingredients) return null;
    
    const recipe = selectedRecipeDetails;
        
    const ingredientsWithDetails = calculateIngredientContributions(recipe);
    
    // Ordenar ingredientes por impacto no custo
    const sortedIngredients = [...ingredientsWithDetails].sort((a, b) => 
      Math.abs(b.costImpact) - Math.abs(a.costImpact)
    );
    
    // Dados para o gráfico de pizza de contribuição
    const pieData = sortedIngredients.map(ing => ({
      name: ing.name,
      value: ing.contribution
    }));
    
    // Cores para o gráfico de pizza
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#a855f7'];
    
    return (
      <div className="space-y-6">
        {/* Gráfico de contribuição por ingrediente */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Contribuição por Ingrediente</CardTitle>
            <CardDescription className="text-gray-500">
              Participação de cada ingrediente no custo total
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${value.toFixed(2)}%`}
                  labelFormatter={(index) => pieData[index].name}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

          {/* Gráfico de impacto de variação */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Impacto da Variação de Preço</CardTitle>
              <CardDescription className="text-gray-500">
                Como a mudança de preço de cada ingrediente afeta o custo total
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedIngredients.map(ing => ({
                    name: ing.name,
                    impact: ing.costImpact
                  }))}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 30,
                    left: 100,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => `${value.toFixed(2)}%`}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={90}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(2)}%`}
                    labelFormatter={(label) => `Ingrediente: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="impact" 
                    name="Impacto na Receita" 
                    radius={[0, 4, 4, 0]}
                  >
                    {sortedIngredients.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.costImpact >= 0 ? CHART_COLORS.error : CHART_COLORS.success} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        
        {/* Tabela de ingredientes e análise */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Análise Detalhada de Ingredientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left font-medium text-gray-600">Ingrediente</th>
                    <th className="p-2 text-right font-medium text-gray-600">Quantidade</th>
                    <th className="p-2 text-right font-medium text-gray-600">Preço Atual</th>
                    <th className="p-2 text-right font-medium text-gray-600">Variação (3m)</th>
                    <th className="p-2 text-right font-medium text-gray-600">Contrib. (%)</th>
                    <th className="p-2 text-right font-medium text-gray-600">Impacto</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIngredients.map((ing, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="p-2 font-medium">{ing.name}</td>
                      <td className="p-2 text-right">{ing.quantity} {ing.unit}</td>
                      <td className="p-2 text-right">{formatCurrency(ing.currentPrice)}</td>
                      <td className="p-2 text-right">
                        <span className={
                          ing.priceChange > 0 
                            ? 'text-red-600' 
                            : ing.priceChange < 0 
                              ? 'text-emerald-600' 
                              : 'text-gray-600'
                        }>
                          {formatPercent(ing.priceChange)}
                        </span>
                      </td>
                      <td className="p-2 text-right">{ing.contribution.toFixed(2)}%</td>
                      <td className="p-2 text-right">
                        <span className={
                          ing.costImpact > 0 
                            ? 'text-red-600' 
                            : ing.costImpact < 0 
                              ? 'text-emerald-600' 
                              : 'text-gray-600'
                        }>
                          {formatPercent(ing.costImpact)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar tab de comparação de receitas
  const renderRecipeComparisonTab = () => {
    // Calcular receitas mais voláteis para comparar com a selecionada
    const topVolatileRecipes = recipes
      .filter(r => r.id !== selectedRecipeDetails?.id)
      .slice(0, 5);
    
    // Preparar dados de comparação
    const comparisonData = [
      {
        name: selectedRecipeDetails?.name || "Receita atual",
        volatility: selectedRecipeDetails?.volatilityScore || 0,
        cost: selectedRecipeDetails?.total_cost || 0
      },
      ...topVolatileRecipes.map(recipe => ({
        name: recipe.name,
        volatility: recipe.volatilityScore || 0,
        cost: recipe.total_cost || 0
      }))
    ];
    
    return (
      <div className="space-y-6">
        {/* Gráfico de comparação de volatilidade */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Comparação de Volatilidade</CardTitle>
            <CardDescription className="text-gray-500">
              Como a receita selecionada se compara com outras receitas
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <Tooltip 
                  formatter={(value) => `${value.toFixed(2)}%`}
                  labelFormatter={(label) => `Receita: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="volatility" 
                  name="Volatilidade (%)" 
                  fill={CHART_COLORS.gray}
                  radius={[4, 4, 0, 0]}
                >
                  <Cell fill={CHART_COLORS.primary} />
                  {comparisonData.slice(1).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.gray} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Gráfico de comparação de custos */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Comparação de Custos</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value.toFixed(2)}`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Receita: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="cost" 
                  name="Custo Total" 
                  fill={CHART_COLORS.gray}
                  radius={[4, 4, 0, 0]}
                >
                  <Cell fill={CHART_COLORS.success} />
                  {comparisonData.slice(1).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.gray} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Análise de Receitas</h1>
          <p className="text-gray-500">Monitore a evolução de custos e volatilidade de preços das suas receitas</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período de análise" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Período de Análise</SelectLabel>
                <SelectItem value="1w">Última semana</SelectItem>
                <SelectItem value="1m">Último mês</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="1y">Último ano</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar com lista de receitas */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-700">Receitas</h3>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volatility">Volatilidade</SelectItem>
                    <SelectItem value="price">Preço</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar receitas..."
                  className="pl-8 bg-gray-50 border-gray-100 focus-visible:ring-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[160px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-330px)]">
                  <div className="space-y-2 p-3">
                    {filteredRecipes.length === 0 ? (
                      <div className="py-6 text-center text-gray-400">
                        <ChefHat className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2">Nenhuma receita encontrada</p>
                      </div>
                    ) : (
                      filteredRecipes.map((recipe) => renderRecipeList(recipe))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="px-4 py-4 border-t border-gray-100">
              <div className="flex items-center text-xs text-gray-500">
                <Info className="h-4 w-4 mr-2" />
                A volatilidade indica quanto o preço da receita variou no período selecionado.
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Área principal com análise */}
        <div className="lg:col-span-8 xl:col-span-9">
          {!selectedRecipe || loadingDetails ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {loadingDetails ? "Carregando análise..." : "Selecione uma receita para análise"}
                </h3>
                <p className="mt-2 text-gray-500 max-w-sm">
                  {loadingDetails 
                    ? "Calculando os dados de evolução de preços e volatilidade." 
                    : "Escolha uma receita da lista ao lado para ver análises detalhadas sobre custos e variações de preço."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cabeçalho da receita selecionada */}
              {renderRecipeHeader()}
              
              {/* Tabs de análise */}
              {renderTabs()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
