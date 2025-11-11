'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  Upload,
  BarChart3,
  Store,
  DollarSign,
  Check,
  X,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import BrandsManager from "@/components/ingredientes/BrandsManager";
import ImportManager from "@/components/ingredientes/ImportManager";
import AnalysisManager from "@/components/ingredientes/AnalysisManager";
import IngredientsTable from "@/components/ingredientes/IngredientsTable";

// 🎯 USAR HOOKS CUSTOMIZADOS
import { useIngredients } from "@/hooks/ingredientes/useIngredients";
import { useIngredientFilters } from "@/hooks/ingredientes/useIngredientFilters";
import { usePriceEditor } from "@/hooks/ingredientes/usePriceEditor";
import { logger } from "@/lib/logger";

export default function Ingredients() {
  const router = useRouter();

  // 🎯 Hook para gerenciar ingredientes
  const {
    ingredients,
    loading,
    error,
    stats,
    loadIngredients,
    handleDelete,
  } = useIngredients();

  // 🎯 Hook para gerenciar filtros
  const {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    supplierFilter,
    setSupplierFilter,
    filteredIngredients,
    uniqueCategories,
    uniqueSuppliers
  } = useIngredientFilters(ingredients);

  // 🎯 Hook para gerenciar edição de preços
  const {
    editingPrice,
    tempPrice,
    setTempPrice,
    handlePriceEdit,
    handlePriceSave,
    handlePriceCancel
  } = usePriceEditor();

  // Wrapper para handlePriceSave com callback de atualização
  const onPriceSave = (ingredient) => {
    handlePriceSave(ingredient, (ingredientId, newPrice, lastUpdate) => {
      // Callback para atualizar o ingrediente localmente após salvar
      loadIngredients();
    });
  };

  // Função para atualizar ingrediente (para o IngredientsTable)
  const updateIngredient = async (ingredientData) => {
    try {
      await onPriceSave(ingredientData);
      toast({
        title: "Sucesso",
        description: "Ingrediente atualizado com sucesso!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao atualizar ingrediente.",
      });
    }
  };

  const [activeTab, setActiveTab] = useState("ingredients");

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-lg font-medium">Carregando ingredientes...</div>
        <div className="text-sm text-gray-600">Aguarde enquanto carregamos a lista de ingredientes.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
          <div className="text-gray-800 font-medium">Erro ao carregar ingredientes</div>
          <div className="text-gray-700 text-sm mt-1">{error}</div>
          <button
            onClick={loadIngredients}
            className="mt-3 px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ingredientes</h1>
          <p className="text-gray-500">Gerencie seus ingredientes e preços</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "Recarregando...",
                description: "Limpando cache e buscando dados atualizados do servidor.",
              });
              loadIngredients();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={() => router.push('/ingredientes/editor')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ingrediente
          </Button>
        </div>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Ingredientes
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Marcas
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Análise Detalhada
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Importação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total</CardTitle>
                <Package className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Ativos</CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Para Receitas</CardTitle>
                <Package className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.traditional}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Comerciais</CardTitle>
                <Store className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.commercial}</div>
              </CardContent>
            </Card>
          </div>

          {/* Busca e Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar ingredientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos fornecedores</SelectItem>
                {uniqueSuppliers.map(supplier => (
                  <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tabela de Ingredientes com Filtros */}
          <IngredientsTable
            ingredients={filteredIngredients}
            onDelete={handleDelete}
            updateIngredient={updateIngredient}
          />
        </TabsContent>

        <TabsContent value="brands" className="space-y-6">
          <BrandsManager />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <AnalysisManager />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <ImportManager onImportComplete={loadIngredients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
