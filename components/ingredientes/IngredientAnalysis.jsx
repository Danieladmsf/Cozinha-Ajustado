'use client';


import React, { useState, useEffect, useCallback } from "react";
import { Ingredient, PriceHistory, Category } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";
import { Brand } from "@/app/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  ArrowLeft,
  Download,
  FileText,
  FileSpreadsheet,
  LineChart,
  Star,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { format, subDays, parseISO, differenceInDays, startOfMonth, endOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { Label } from "@/components/ui/label";
import DatePicker from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";

export default function IngredientAnalysis() {
  const [ingredients, setIngredients] = useState([]);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 365),
    end: new Date()
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // Changed default tab to 'overview'
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedIngredient, setSelectedIngredient] = useState("all");
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("line");
  const [chartStyle, setChartStyle] = useState("default");
  const [expandedHistories, setExpandedHistories] = useState(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingredientsData, historyData, categoriesData, suppliersData, brandsData] = await Promise.all([
        Ingredient.list(),
        PriceHistory.list(),
        Category.list(),
        Supplier.list(),
        Brand.list()
      ]);

      setPriceHistory(historyData || []);
      setIngredients((ingredientsData || []).filter(ingredient => ingredient && ingredient.active !== false));

      if (historyData && historyData.length > 0) {
        try {
          const dates = historyData
            .map(h => new Date(h.date + 'T00:00:00'))
            .filter(date => !isNaN(date.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

          if (dates.length > 0) {
            setDateRange({ start: dates[0], end: dates[dates.length - 1] });
          }
        } catch (error) {
          console.error('Erro ao calcular período inteligente:', error);
        }
      }

      setCategories((categoriesData || [])
        .filter(cat => cat && cat.type === "ingredient" && cat.active !== false)
        .map(cat => ({ value: cat.name || '', label: cat.name || '' }))
        .filter(cat => cat.value)
        .sort((a, b) => a.label.localeCompare(b.label)));

      setSuppliers([...new Set(
        (suppliersData || [])
          .filter(s => s && s.active !== false && s.company_name)
          .map(s => s.company_name.trim())
      )].filter(Boolean).sort().map(name => ({ value: name, label: name })));

      setBrands([...new Set(
        (brandsData || [])
          .filter(b => b && b.active !== false && b.name)
          .map(b => b.name.trim())
      )].filter(Boolean).sort().map(name => ({ value: name, label: name })));

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Não foi possível carregar os dados para análise.");
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados para análise"
      });
    } finally {
      setLoading(false);
    }
  };

  // NOVA LÓGICA: Os filtros de histórico também filtram ingredientes
  useEffect(() => {
    if (loading) return;


    // 1. PRIMEIRO: Filtrar histórico por período, fornecedor e marca
    const historyFilteredByPeriodSupplierBrand = priceHistory.filter(record => {
      try {
        const recordDate = new Date(record.date + 'T00:00:00');
        const isInDateRange = recordDate >= dateRange.start && recordDate <= dateRange.end;
        const supplierMatch = selectedSupplier === "all" || record.supplier === selectedSupplier;
        let brandMatch = true;
        if (selectedBrand !== "all") {
          brandMatch = record.brand && record.brand === selectedBrand;
        }
        return isInDateRange && supplierMatch && brandMatch;
      } catch (e) {
        console.error("Erro ao processar filtros do histórico:", record.date, e);
        return false;
      }
    });


    // 2. Criar índices para busca de histórico
    const historyByIngredientId = {};
    const historyByIngredientName = {};

    historyFilteredByPeriodSupplierBrand.forEach(historyRecord => {
      if (!historyRecord) return;

      if (historyRecord.ingredient_id) {
        if (!historyByIngredientId[historyRecord.ingredient_id]) {
          historyByIngredientId[historyRecord.ingredient_id] = [];
        }
        historyByIngredientId[historyRecord.ingredient_id].push(historyRecord);
      }

      if (historyRecord.ingredient_name) {
        const normalizedName = historyRecord.ingredient_name.toLowerCase().trim();
        if (!historyByIngredientName[normalizedName]) {
          historyByIngredientName[normalizedName] = [];
        }
        historyByIngredientName[normalizedName].push(historyRecord);
      }
    });

    // 3. SEGUNDO: Filtrar ingredientes por categoria
    let ingredientsFilteredByCategory = ingredients;
    if (selectedCategory !== "all") {
      ingredientsFilteredByCategory = ingredientsFilteredByCategory.filter(ing => ing.category === selectedCategory);
    }

    // 4. TERCEIRO: NOVA FUNCIONALIDADE - Filtrar ingredientes pelos filtros de histórico
    let ingredientsFilteredByHistory = ingredientsFilteredByCategory;

    // 4.1 Filtro por Fornecedor: Mostrar apenas ingredientes que têm histórico com o fornecedor selecionado
    if (selectedSupplier !== "all") {
      const ingredientIdsWithSupplier = new Set();
      const ingredientNamesWithSupplier = new Set();

      historyFilteredByPeriodSupplierBrand
        .filter(record => record.supplier === selectedSupplier)
        .forEach(record => {
          if (record.ingredient_id) ingredientIdsWithSupplier.add(record.ingredient_id);
          if (record.ingredient_name) ingredientNamesWithSupplier.add(record.ingredient_name.toLowerCase().trim());
        });

      ingredientsFilteredByHistory = ingredientsFilteredByHistory.filter(ingredient => {
        // Verificar por ID
        if (ingredient.id && ingredientIdsWithSupplier.has(ingredient.id)) return true;

        // Verificar por nome
        if (ingredient.name) {
          const normalizedName = ingredient.name.toLowerCase().trim();
          if (ingredientNamesWithSupplier.has(normalizedName)) return true;
        }

        // ALTERNATIVA: Também mostrar ingredientes que têm esse fornecedor como main_supplier
        if (ingredient.main_supplier === selectedSupplier) return true;

        return false;
      });

    }

    // 4.2 Filtro por Marca: Mostrar apenas ingredientes que têm histórico com a marca selecionada
    if (selectedBrand !== "all") {
      const ingredientIdsWithBrand = new Set();
      const ingredientNamesWithBrand = new Set();

      historyFilteredByPeriodSupplierBrand
        .filter(record => record.brand === selectedBrand)
        .forEach(record => {
          if (record.ingredient_id) ingredientIdsWithBrand.add(record.ingredient_id);
          if (record.ingredient_name) ingredientNamesWithBrand.add(record.ingredient_name.toLowerCase().trim());
        });

      ingredientsFilteredByHistory = ingredientsFilteredByHistory.filter(ingredient => {
        // Verificar por ID
        if (ingredient.id && ingredientIdsWithBrand.has(ingredient.id)) return true;

        // Verificar por nome
        if (ingredient.name) {
          const normalizedName = ingredient.name.toLowerCase().trim();
          if (ingredientNamesWithBrand.has(normalizedName)) return true;
        }

        // ALTERNATIVA: Também mostrar ingredientes que têm essa marca no campo brand
        if (ingredient.brand === selectedBrand) return true;

        return false;
      });

    }

    // 5. Para cada ingrediente filtrado, buscar SEU histórico e calcular estatísticas
    const processedIngredients = ingredientsFilteredByHistory.map(ingredient => {
      let historyForIngredient = [];

      // Buscar histórico por ID
      if (ingredient.id && historyByIngredientId[ingredient.id]) {
        historyForIngredient = historyByIngredientId[ingredient.id];
      }

      // Buscar por nome se não encontrou por ID
      if (historyForIngredient.length === 0 && ingredient.name) {
        const normalizedIngredientName = ingredient.name.toLowerCase().trim();
        if (historyByIngredientName[normalizedIngredientName]) {
          historyForIngredient = historyByIngredientName[normalizedIngredientName];
        }
      }

      // Busca adicional por similaridade de nome
      if (historyForIngredient.length === 0 && ingredient.name) {
        const normalizedIngredientName = ingredient.name.toLowerCase().trim();

        const similarNameHistory = historyFilteredByPeriodSupplierBrand.filter(record => {
          if (!record.ingredient_name) return false;
          const normalizedRecordName = record.ingredient_name.toLowerCase().trim();

          return normalizedRecordName.includes(normalizedIngredientName) ||
                 normalizedIngredientName.includes(normalizedRecordName);
        });

        if (similarNameHistory.length > 0) {
          historyForIngredient = similarNameHistory;
        }
      }

      // Ordenar histórico por data (mais recente primeiro)
      const sortedHistory = [...historyForIngredient].sort((a, b) => {
        try {
          return new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime();
        } catch (e) {
          return 0;
        }
      });

      // Calcular estatísticas
      let lastVariationDisplay = 'Sem histórico';
      let lastVariationValue = 0;
      let bestSupplierName = 'Não disponível';
      let bestSupplierPrice = null;
      let volatility = 0;
      let currentPrice = ingredient.current_price;

      if (sortedHistory.length > 0) {
        currentPrice = parseFloat(sortedHistory[0].new_price) || ingredient.current_price;

        if (sortedHistory.length >= 2) {
          const lastPrice = parseFloat(sortedHistory[0].new_price) || 0;
          const prevPrice = parseFloat(sortedHistory[1].new_price) || 0;
          if (prevPrice > 0) {
            const change = ((lastPrice - prevPrice) / prevPrice) * 100;
            lastVariationValue = change;
            lastVariationDisplay = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
          } else {
            lastVariationDisplay = 'Primeiro registro';
          }
        } else {
          lastVariationDisplay = 'Apenas 1 registro';
        }

        // Calcular melhor fornecedor
        const supplierPrices = {};
        sortedHistory.forEach(r => {
          if (r.supplier && r.new_price != null) {
            if (!supplierPrices[r.supplier]) supplierPrices[r.supplier] = [];
            supplierPrices[r.supplier].push(parseFloat(r.new_price));
          }
        });

        if (Object.keys(supplierPrices).length > 0) {
          let minAvgPrice = Infinity;
          Object.keys(supplierPrices).forEach(s => {
            const avg = supplierPrices[s].reduce((a, b) => a + b, 0) / supplierPrices[s].length;
            if (avg < minAvgPrice) {
              minAvgPrice = avg;
              bestSupplierName = s;
            }
          });
          bestSupplierPrice = minAvgPrice;
        }

        // Calcular volatilidade
        if (sortedHistory.length > 1) {
          const prices = sortedHistory.map(h => parseFloat(h.new_price)).filter(p => !isNaN(p));
          if (prices.length > 1) {
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            if (avg > 0) {
              const variance = prices.reduce((acc, p) => acc + Math.pow(p - avg, 2), 0) / prices.length;
              volatility = (Math.sqrt(variance) / avg) * 100;
            }
          }
        }
      }

      return {
        ...ingredient,
        last_variation_display: lastVariationDisplay,
        last_variation_value: lastVariationValue,
        best_supplier_name: bestSupplierName,
        best_supplier_price: bestSupplierPrice,
        volatility: volatility,
        history: sortedHistory,
        has_history: sortedHistory.length > 0,
        current_price: currentPrice,
        history_count: sortedHistory.length
      };
    });


    setFilteredIngredients(processedIngredients);

  }, [ingredients, priceHistory, dateRange, selectedCategory, selectedSupplier, selectedBrand, loading]);

  const getPriceChangeBadgeVariant = (percentageValue) => {
    if (percentageValue < 0) return "success";
    if (percentageValue > 0) return "destructive";
    return "secondary";
  };

  const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ -';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return dateString || '-';
    }
  };

  const toggleHistoryExpansion = (ingredientId) => {
    setExpandedHistories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) newSet.delete(ingredientId);
      else newSet.add(ingredientId);
      return newSet;
    });
  };

  const getChartData = useCallback((ingredientId) => {
    if (!ingredientId || ingredientId === "all") return [];
    const ingredient = filteredIngredients.find(ing => ing.id === ingredientId);
    if (!ingredient || !ingredient.history || ingredient.history.length === 0) return [];
    const sortedForChart = [...ingredient.history].sort((a, b) => new Date(a.date + 'T00:00:00') - new Date(b.date + 'T00:00:00'));
    return sortedForChart.map(record => ({
      date: format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy'),
      preco: parseFloat(record.new_price) || 0,
    }));
  }, [filteredIngredients]);

  const sortedIngredients = [...filteredIngredients].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;
    let valA, valB;
    if (key === 'volatility') { valA = a.volatility; valB = b.volatility; }
    else if (key === 'price') { valA = a.current_price; valB = b.current_price; }
    else if (key === 'name') { valA = a.name; valB = b.name; }
    else if (key === 'lastVariationDate') {
      valA = a.history?.[0]?.date ? new Date(a.history[0].date + 'T00:00:00').getTime() : 0;
      valB = b.history?.[0]?.date ? new Date(b.history[0].date + 'T00:00:00').getTime() : 0;
    } else return 0;
    if (typeof valA === 'string' && typeof valB === 'string') return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ChevronDown className="w-4 h-4 text-gray-400 inline ml-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 inline ml-1" /> : <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  const exportToPDF = () => window.print();

  const exportToExcel = () => {
    let csvContent = "Ingrediente,Categoria,Preço Atual (Filtrado),Última Variação (Filtrado)(%),Data Última Variação (Filtrado),Melhor Fornecedor (Filtrado),Preço Melhor Fornecedor (Filtrado),Volatilidade (Filtrado)(%),Registros de Histórico (Filtrado)\n";
    sortedIngredients.forEach(ing => {
      const row = [ `"${ing.name || ''}"`, `"${ing.category || 'N/A'}"`, ing.current_price ? ing.current_price.toFixed(2) : 'N/A', typeof ing.last_variation_value === 'number' ? ing.last_variation_value.toFixed(1) : 'N/A', ing.history?.[0]?.date ? formatDate(ing.history[0].date) : 'N/A', ing.best_supplier_name !== 'Não disponível' ? `"${ing.best_supplier_name}"` : 'N/A', typeof ing.best_supplier_price === 'number' ? ing.best_supplier_price.toFixed(2) : 'N/A', ing.volatility.toFixed(1), ing.history.length ];
      csvContent += row.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise_precos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedIngredientData = filteredIngredients.find(ing => ing.id === selectedIngredient);
  const chartData = getChartData(selectedIngredient);

  const renderIngredientCard = (ingredient) => {
    const isExpanded = expandedHistories.has(ingredient.id);
    const hasHistory = ingredient.has_history;
    const visibleHistory = isExpanded ? ingredient.history : ingredient.history.slice(0, 3);

    return (
      <Card key={ingredient.id} className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{ingredient.name}</CardTitle>
              <CardDescription className="mt-1">{ingredient.category || 'Sem categoria'}</CardDescription>
            </div>
            {hasHistory && ingredient.last_variation_value !== 0 && (
              <Badge variant={getPriceChangeBadgeVariant(ingredient.last_variation_value)} className="text-xs flex-shrink-0">{ingredient.last_variation_display}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Preço Atual</p><p className="font-semibold text-lg text-green-600">{formatCurrency(ingredient.current_price)}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide">Volatilidade</p><p className="font-semibold text-lg">{ingredient.volatility.toFixed(1)}%</p></div>
          </div>
          <div className="space-y-3">
            <div><p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Melhor Fornecedor</p><p className="text-sm font-medium text-blue-600">{ingredient.best_supplier_name}</p></div>
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Registros de Histórico</p><p className="text-sm font-medium">{ingredient.history.length} registro{ingredient.history.length !== 1 ? 's' : ''}</p></div>
              {hasHistory && ingredient.history.length > 3 && (
                <Button variant="ghost" size="sm" onClick={() => toggleHistoryExpansion(ingredient.id)} className="text-xs h-8 px-2">
                  {isExpanded ? <><EyeOff className="w-3 h-3 mr-1" />Ocultar</> : <><Eye className="w-3 h-3 mr-1" />Ver todos</>}
                </Button>
              )}
            </div>
          </div>
          {hasHistory ? (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Histórico Recente {isExpanded ? '(Completo)' : '(Últimos 3)'}</p>
              <div className={`space-y-2 ${isExpanded ? 'max-h-60 overflow-y-auto' : ''}`}>
                {visibleHistory.map((record, index) => (
                  <div key={index} className="flex items-center justify-between text-xs py-2 px-2 bg-gray-50 rounded border-l-2 border-blue-200">
                    <div className="flex-1 min-w-0"><p className="font-medium text-gray-800 truncate">{formatDate(record.date)}</p><p className="text-gray-600 truncate text-xs">{record.supplier || 'Sem fornecedor'}</p></div>
                    <div className="text-right ml-2"><p className="font-semibold text-green-600">{formatCurrency(record.new_price)}</p>
                      {record.percentage_change != null && <p className={`text-xs ${record.percentage_change >= 0 ? 'text-red-500' : 'text-green-500'}`}>{record.percentage_change >= 0 ? '+' : ''}{record.percentage_change.toFixed(1)}%</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t pt-3"><p className="text-xs text-gray-400 text-center py-2">Nenhum histórico disponível no período selecionado</p></div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-700">Carregando dados...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Erro ao carregar dados: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Principal */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <Link href="/ingredients">
                <Button variant="outline" size="icon" aria-label="Voltar para Ingredientes">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Análise de Preços</h1>
                <p className="text-gray-600 mt-1">Acompanhamento detalhado da evolução dos preços</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar para PDF (Imprimir)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar para Excel (CSV)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Filtros de Histórico */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Filtros de Histórico e Ingredientes</h3>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">ℹ</span>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-blue-800 mb-2">Como funcionam estes filtros:</p>
                <div className="space-y-1 text-blue-700">
                  <p><strong>📊 Histórico:</strong> Afetam qual histórico de preços é usado para cálculos (variação, volatilidade, melhor fornecedor)</p>
                  <p><strong>🔍 Ingredientes:</strong> Também filtram quais ingredientes são exibidos na lista</p>
                  <p><strong>📂 Categoria:</strong> O filtro de categoria acima funciona independentemente</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">Data inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.start ? format(dateRange.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker 
                    selected={dateRange.start} 
                    onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))} 
                    inline 
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="end-date" className="text-sm font-medium text-gray-700">Data final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.end ? format(dateRange.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker 
                    selected={dateRange.end} 
                    onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))} 
                    inline 
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="supplier-filter" className="text-sm font-medium text-gray-700">
                Fornecedor
                <span className="ml-1 text-xs text-blue-600">(filtra histórico + ingredientes)</span>
              </Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers.sort((a, b) => a.label.localeCompare(b.label)).map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="brand-filter" className="text-sm font-medium text-gray-700">
                Marca
                <span className="ml-1 text-xs text-blue-600">(filtra histórico + ingredientes)</span>
              </Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as marcas</SelectItem>
                  {brands.sort((a, b) => a.label.localeCompare(b.label)).map(b => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Container Principal com Tabs */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            {/* Header das Tabs com Cores e Molduras */}
            <div className="border-b bg-gradient-to-r from-gray-50 to-gray-100 px-2 py-3">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 bg-white border border-gray-200 shadow-sm">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 9H21" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 15H21" stroke="currentColor" strokeWidth="2" />
                    <path d="M9 21L9 3" stroke="currentColor" strokeWidth="2" />
                    <path d="M15 21L15 3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <span className="hidden sm:inline">Tabela</span>
                </TabsTrigger>
                <TabsTrigger
                  value="chart"
                  className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <LineChart className="w-4 h-4" />
                  <span className="hidden sm:inline">Gráficos</span>
                </TabsTrigger>
                <TabsTrigger
                  value="detailed"
                  className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">Análise Detalhada</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Conteúdo das Tabs */}
            <TabsContent value="overview" className="p-6 border-l-4 border-blue-500 bg-blue-50/20">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Visão Geral dos Ingredientes
                </h3>
                <p className="text-blue-600 text-sm">Cards com informações resumidas de cada ingrediente</p>
              </div>
              {filteredIngredients.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sortedIngredients.map(ing => renderIngredientCard(ing))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BarChart3 className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">Nenhum ingrediente encontrado para os filtros selecionados.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="table" className="p-6 border-l-4 border-green-500 bg-green-50/20">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 9H21" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 15H21" stroke="currentColor" strokeWidth="2" />
                    <path d="M9 21L9 3" stroke="currentColor" strokeWidth="2" />
                    <path d="M15 21L15 3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Tabela Comparativa
                </h3>
                <p className="text-green-600 text-sm">Visualização tabular com todos os dados organizados</p>
              </div>
              <div className="bg-white rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                        Nome {getSortIcon('name')}
                      </TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('price')}>
                        Preço Atual (No período) {getSortIcon('price')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('lastVariationDate')}>
                        Última Variação (No período) {getSortIcon('lastVariationDate')}
                      </TableHead>
                      <TableHead>Melhor Fornecedor (No período)</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('volatility')}>
                        Volatilidade (No período) {getSortIcon('volatility')}
                      </TableHead>
                      <TableHead>Registros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedIngredients.map((ing) => (
                      <TableRow key={ing.id}>
                        <TableCell className="font-medium">{ing.name}</TableCell>
                        <TableCell>{ing.category || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(ing.current_price)}</TableCell>
                        <TableCell>
                          {typeof ing.last_variation_value === 'number' && ing.has_history ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                {ing.last_variation_value >= 0 ? (
                                  <TrendingUp className="w-4 h-4 text-red-500" />
                                ) : (
                                  <TrendingDown className="w-4 h-4 text-green-500" />
                                )}
                                <span className={ing.last_variation_value >= 0 ? "text-red-600" : "text-green-600"}>
                                  {ing.last_variation_display}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(ing.history[0]?.date)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500">{ing.last_variation_display}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {ing.best_supplier_name !== 'Não disponível' ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-4 h-4 text-gray-400" />
                                <span>{ing.best_supplier_name}</span>
                              </div>
                              <span className="text-sm text-gray-500">{formatCurrency(ing.best_supplier_price)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">Não disponível</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            {ing.volatility.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>{ing.history_count || 0}</TableCell>
                      </TableRow>
                    ))}
                    {sortedIngredients.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500">
                          Nenhum ingrediente encontrado para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="chart" className="p-6 border-l-4 border-purple-500 bg-purple-50/20">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-purple-700 flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Gráficos de Evolução
                </h3>
                <p className="text-purple-600 text-sm">Visualização gráfica da evolução dos preços ao longo do tempo</p>
              </div>
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5" />
                        Gráfico de Evolução de Preços
                      </CardTitle>
                      <div className="flex gap-3 items-center">
                        <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Selecione um ingrediente" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredIngredients
                              .filter(ing => ing.has_history)
                              .sort((a,b)=>a.name.localeCompare(b.name))
                              .map(ing => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.history.length} registros)
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {selectedIngredientData && chartData.length > 1 && (
                      <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Tipo:</span>
                          <Select value={chartType} onValueChange={setChartType}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="line">Linha</SelectItem>
                              <SelectItem value="area">Área</SelectItem>
                              <SelectItem value="bar">Barras</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Estilo:</span>
                          <Select value={chartStyle} onValueChange={setChartStyle}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Padrão</SelectItem>
                              <SelectItem value="smooth">Suave</SelectItem>
                              <SelectItem value="stepped">Escalonado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Pontos:</span>
                          <Badge variant="outline">{chartData.length} registros</Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedIngredientData && selectedIngredient !== "all" ? (
                    <>
                      <div className="flex flex-wrap gap-3 mb-4">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <span className="font-medium">Ingrediente:</span> {selectedIngredientData.name}
                        </Badge>
                        {selectedIngredientData.category && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <span className="font-medium">Categoria:</span> {selectedIngredientData.category}
                          </Badge>
                        )}
                        <Badge variant="outline" className="flex items-center gap-1">
                          <span className="font-medium">Preço Atual:</span> {formatCurrency(selectedIngredientData.current_price)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <span className="font-medium">Registros (no período):</span> {selectedIngredientData.history?.length || 0}
                        </Badge>
                      </div>
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div><span className="font-medium text-blue-700">📅 Filtro Aplicado:</span><br /><span className="text-blue-600">{format(dateRange.start, 'dd/MM/yyyy')} até {format(dateRange.end, 'dd/MM/yyyy')}</span><div className="text-xs text-blue-500 mt-1">(Período que você selecionou para análise)</div></div>
                          <div><span className="font-medium text-blue-700">📊 Dados Disponíveis (Total):</span><br /><span className="text-blue-600">{(() => { const fullHistory = priceHistory.filter(h => h.ingredient_id === selectedIngredient); if(fullHistory.length === 0) return 'N/A'; const dates = fullHistory.map(h => new Date(h.date + 'T00:00:00')).sort((a,b)=>a-b); return `${format(dates[0], 'dd/MM/yyyy')} até ${format(dates[dates.length - 1], 'dd/MM/yyyy')}`; })()}</span><div className="text-xs text-blue-500 mt-1">(Período real dos registros de preços para este ingrediente)</div></div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-blue-200">
                          {selectedIngredientData.history?.length > 0 ? <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div><span className="text-sm text-green-700"><strong>Exibindo {selectedIngredientData.history.length} registros</strong> de {selectedIngredientData.name} que estão dentro do período selecionado e filtros de fornecedor/marca.</span></div> : <div className="flex flex-col items-center gap-2"><div className="w-2 h-2 bg-gray-400 rounded-full"></div><span className="text-sm text-gray-600">Nenhum registro encontrado para este ingrediente com os filtros atuais.</span></div>}
                        </div>
                        {selectedIngredientData.history?.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200"><span className="text-xs font-medium text-blue-700">Dates no gráfico:</span><div className="text-xs text-blue-600 mt-1">{(() => { const dates = selectedIngredientData.history.map(h => format(new Date(h.date + 'T00:00:00'), 'dd/MM/yyyy')).sort(); return dates.length <= 5 ? dates.join(', ') : `${dates.slice(0,3).join(', ')}, ... e mais ${dates.length-3} datas`; })()}</div></div>
                        )}
                      </div>
                      {chartData.length > 1 ? (
                        <div className="h-[400px] mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            {chartType === "line" && (
                              <RechartsLineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `R$ ${v.toFixed(2)}`} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip formatter={(v) => [`${formatCurrency(v)}`, 'Preço']} labelFormatter={(l) => `Data: ${l}`} />
                                <Legend />
                                <Line
                                  type={chartStyle === "smooth" ? "monotone" : chartStyle === "stepped" ? "step" : "linear"}
                                  dataKey="preco"
                                  name="Preço"
                                  stroke="#1E40AF"
                                  strokeWidth={chartStyle === "smooth" ? 3 : 2}
                                  activeDot={{ r: 8 }}
                                  dot={{ r: chartStyle === "default" ? 4 : 0 }}
                                />
                              </RechartsLineChart>
                            )}
                            {chartType === "area" && (
                              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `R$ ${v.toFixed(2)}`} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip formatter={(v) => [`${formatCurrency(v)}`, 'Preço']} labelFormatter={(l) => `Data: ${l}`} />
                                <Legend />
                                <Area
                                  type={chartStyle === "smooth" ? "monotone" : "linear"}
                                  dataKey="preco"
                                  name="Preço"
                                  fill="#1E40AF"
                                  fillOpacity={0.3}
                                  strokeWidth={2}
                                />
                              </AreaChart>
                            )}
                            {chartType === "bar" && (
                              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                                <YAxis tickFormatter={(v) => `R$ ${v.toFixed(2)}`} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip formatter={(v) => [`${formatCurrency(v)}`, 'Preço']} labelFormatter={(l) => `Data: ${l}`} />
                                <Legend />
                                <Bar dataKey="preco" name="Preço" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      ) : chartData.length === 1 ? (
                        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-10 mt-4">
                          <LineChart className="h-10 w-10 text-gray-300 mb-3" />
                          <p className="text-gray-500 text-center">Apenas um registro encontrado. São necessários ao menos 2 pontos para exibir um gráfico.</p>
                          <p className="text-sm text-gray-400 mt-2">Registro: {chartData[0]?.date} - {formatCurrency(chartData[0]?.preco)}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-10 mt-4">
                          <LineChart className="h-10 w-10 text-gray-300 mb-3" />
                          <p className="text-gray-500 text-center">Nenhum registro encontrado com os filtros atuais.</p>
                          <Button variant="outline" className="mt-3" onClick={() => setDateRange({ start: subDays(new Date(), 365), end: new Date() })}>
                            Expandir período para 1 ano
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-10">
                      <LineChart className="h-10 w-10 text-gray-300 mb-3" /><p className="text-gray-500">Selecione um ingrediente com histórico de preços.</p>
                      <p className="text-sm text-gray-400 mt-2">{filteredIngredients.filter(ing => ing.has_history).length} ingredientes disponíveis</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="detailed" className="p-6 border-l-4 border-orange-500 bg-orange-50/20">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-orange-700 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Análise Detalhada
                </h3>
                <p className="text-orange-600 text-sm">Estatísticas avançadas e insights detalhados sobre os ingredientes</p>
              </div>

              {/* Estatísticas Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="border-l-4 border-orange-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total de Ingredientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{filteredIngredients.length}</div>
                    <p className="text-xs text-gray-500 mt-1">Ingredientes analisados</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-green-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Com Histórico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {filteredIngredients.filter(ing => ing.has_history).length}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {filteredIngredients.length > 0
                        ? `${Math.round((filteredIngredients.filter(ing => ing.has_history).length / filteredIngredients.length) * 100)}% do total`
                        : '0% do total'
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-blue-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Preço Médio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        filteredIngredients.length > 0
                          ? filteredIngredients.reduce((sum, ing) => sum + (ing.current_price || 0), 0) / filteredIngredients.length
                          : 0
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Por ingrediente</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-red-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Volatilidade Média</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {filteredIngredients.length > 0
                        ? (filteredIngredients.reduce((sum, ing) => sum + ing.volatility, 0) / filteredIngredients.length).toFixed(1)
                        : '0.0'
                      }%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Variação de preços</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Ingredientes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mais Voláteis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                      Mais Voláteis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredIngredients
                        .filter(ing => ing.has_history && ing.volatility > 0)
                        .sort((a, b) => b.volatility - a.volatility)
                        .slice(0, 5)
                        .map((ing, index) => (
                          <div key={ing.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{ing.name}</p>
                                <p className="text-xs text-gray-500">{ing.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">{ing.volatility.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">{ing.history.length} registros</p>
                            </div>
                          </div>
                        ))}
                      {filteredIngredients.filter(ing => ing.has_history && ing.volatility > 0).length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhum ingrediente com volatilidade no período</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Mais Caros */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="w-5 h-5 text-blue-500" />
                      Mais Caros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredIngredients
                        .filter(ing => ing.current_price > 0)
                        .sort((a, b) => b.current_price - a.current_price)
                        .slice(0, 5)
                        .map((ing, index) => (
                          <div key={ing.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{ing.name}</p>
                                <p className="text-xs text-gray-500">{ing.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-blue-600">{formatCurrency(ing.current_price)}</p>
                              <p className="text-xs text-gray-500">{ing.has_history ? `${ing.history.length} registros` : 'Sem histórico'}</p>
                            </div>
                          </div>
                        ))}
                      {filteredIngredients.filter(ing => ing.current_price > 0).length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhum ingrediente com preço no período</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Maiores Aumentos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                      Maiores Aumentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredIngredients
                        .filter(ing => ing.has_history && ing.last_variation_value > 0)
                        .sort((a, b) => b.last_variation_value - a.last_variation_value)
                        .slice(0, 5)
                        .map((ing, index) => (
                          <div key={ing.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{ing.name}</p>
                                <p className="text-xs text-gray-500">{formatDate(ing.history[0]?.date)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">+{ing.last_variation_value.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">{formatCurrency(ing.current_price)}</p>
                            </div>
                          </div>
                        ))}
                      {filteredIngredients.filter(ing => ing.has_history && ing.last_variation_value > 0).length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhum aumento registrado no período</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Maiores Reduções */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-green-500" />
                      Maiores Reduções
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredIngredients
                        .filter(ing => ing.has_history && ing.last_variation_value < 0)
                        .sort((a, b) => a.last_variation_value - b.last_variation_value)
                        .slice(0, 5)
                        .map((ing, index) => (
                          <div key={ing.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{ing.name}</p>
                                <p className="text-xs text-gray-500">{formatDate(ing.history[0]?.date)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{ing.last_variation_value.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">{formatCurrency(ing.current_price)}</p>
                            </div>
                          </div>
                        ))}
                      {filteredIngredients.filter(ing => ing.has_history && ing.last_variation_value < 0).length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhuma redução registrada no período</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
