'use client';


import React, { useState, useEffect } from "react";
import { Ingredient } from "@/app/api/entities";
import { PriceHistory } from "@/app/api/entities";
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
  X
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";
import { useRouter } from "next/navigation";
import BrandsManager from "@/components/ingredientes/BrandsManager";
import ImportManager from "@/components/ingredientes/ImportManager";
import AnalysisManager from "@/components/ingredientes/AnalysisManager";

export default function Ingredients() {
  const [isClient, setIsClient] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Hydration guard
  useEffect(() => {
    setIsClient(true);
  }, []);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [editingPrice, setEditingPrice] = useState(null);
  const [tempPrice, setTempPrice] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    traditional: 0,
    commercial: 0
  });

  const router = useRouter();

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar apenas ingredientes unificados com timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Ingredients loading timeout")), 10000)
      );
      
      const loadPromise = Ingredient.list().catch(error => {
        // Error loading from database
        return []; // Return empty array on error
      });

      const allIngredients = await Promise.race([loadPromise, timeoutPromise]);
      
      // Filtrar ingredientes que realmente existem (têm ID válido)
      const validIngredients = allIngredients.filter(ing => ing && ing.id);

      // Processar ingredientes
      const processedIngredients = (validIngredients || []).map(ingredient => ({
        ...ingredient,
        displayName: ingredient.name,
        displayPrice: ingredient.current_price,
        displaySupplier: ingredient.main_supplier || 'N/A',
        displayBrand: ingredient.brand || 'N/A'
      }));

      // Filtrar ingredientes ativos
      const activeIngredients = processedIngredients.filter(ing => ing.active !== false);

      setIngredients(activeIngredients);
      
      setStats({
        total: processedIngredients.length,
        active: activeIngredients.length,
        traditional: activeIngredients.filter(ing =>
          ing.ingredient_type === 'traditional' || ing.ingredient_type === 'both'
        ).length,
        commercial: activeIngredients.filter(ing =>
          ing.ingredient_type === 'commercial' || ing.ingredient_type === 'both'
        ).length
      });
      

    } catch (err) {
      // Critical error loading ingredients
      setError('Erro ao carregar ingredientes: ' + err.message);
      // Set empty state on error
      setIngredients([]);
      setStats({ total: 0, active: 0, traditional: 0, commercial: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ingredient) => {
    if (!ingredient || !ingredient.id) {
      toast({
        variant: "destructive",
        title: "Erro de Exclusão",
        description: "O ingrediente selecionado não possui um ID válido.",
      });
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o ingrediente "${ingredient.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await Ingredient.delete(ingredient.id);

        // Atualizar o estado local APÓS a exclusão bem-sucedida
        const updatedIngredients = ingredients.filter(ing => ing.id !== ingredient.id);
        setIngredients(updatedIngredients);

        // Recalcular estatísticas com base na lista atualizada
        setStats(prevStats => ({
          ...prevStats,
          total: prevStats.total - 1,
          active: prevStats.active - 1,
          // Lógica para recalcular 'traditional' e 'commercial' se necessário
        }));

        toast({
          title: "✅ Sucesso",
          description: `Ingrediente "${ingredient.name}" foi excluído.`,
        });
        loadIngredients(); // Re-fetch ingredients to ensure UI is in sync

      } catch (err) {
        console.error("Erro completo ao tentar excluir ingrediente:", err); // Added logging
        // Se a exclusão falhar, o estado local não é alterado, evitando inconsistência.
        const errorMessage = err.code === 'permission-denied'
          ? "Você não tem permissão para excluir ingredientes."
          : err.message || "Ocorreu um erro desconhecido.";

        setError(`Erro ao excluir: ${errorMessage}`);
        
        toast({
          variant: "destructive",
          title: "❌ Falha na Exclusão",
          description: errorMessage,
          duration: 7000,
        });
      }
    }
  };

  const handlePriceEdit = (ingredient) => {
    setEditingPrice(ingredient.id);
    setTempPrice(ingredient.current_price?.toString() || "0");
  };

  const handlePriceSave = async (ingredient) => {
    if (!tempPrice || isNaN(parseFloat(tempPrice))) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preço deve ser um número válido.",
      });
      return;
    }

    try {
      const newPrice = parseFloat(tempPrice);

      // CORREÇÃO: Chamar a API PUT em vez de atualizar o Firebase diretamente
      const response = await fetch(`/api/ingredients?id=${ingredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_price: newPrice,
          raw_price_kg: newPrice, // Assumindo que o preço atual é por kg para consistência
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          toast({
            variant: "destructive",
            title: "Erro ao atualizar preço",
            description: `Ingrediente "${ingredient.name}" não encontrado. Ele pode ter sido excluído.`, 
          });
          fetchIngredients(); // Refresh the list to remove the non-existent item
          setEditingPrice(null); // Exit editing mode
          setTempPrice(""); // Clear temp price
          return; // Stop further processing
        }
        throw new Error(errorData.details || 'Falha ao atualizar ingrediente na API.');
      }

      // Atualizar na lista local
      setIngredients(prevIngredients => 
        prevIngredients.map(ing => 
          ing.id === ingredient.id 
            ? { ...ing, current_price: newPrice, displayPrice: newPrice, last_update: new Date().toISOString().split('T')[0] }
            : ing
        )
      );

      setEditingPrice(null);
      setTempPrice("");

      toast({
        title: "Preço atualizado",
        description: `${ingredient.name}: R$ ${newPrice.toFixed(2).replace('.', ',')}`
      });

    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar preço",
        description: err.message,
      });
    }
  };

  const handlePriceCancel = () => {
    setEditingPrice(null);
    setTempPrice("");
  };

  // Filtros
  const uniqueCategories = [...new Set(ingredients.map(ing => ing.category).filter(Boolean))];
  const uniqueSuppliers = [...new Set(ingredients.map(ing => ing.main_supplier).filter(Boolean))];

  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = (ingredient.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (ingredient.displaySupplier?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (ingredient.displayBrand?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ingredient.category === categoryFilter;
    const matchesSupplier = supplierFilter === "all" || ingredient.main_supplier === supplierFilter;

    return matchesSearch && matchesCategory && matchesSupplier;
  });

  if (!isClient || loading) {
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
          {/* Removed direct button for IngredientAnalysis, now using a tab */}
          <Button onClick={() => router.push('/ingredientes/editor')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ingrediente
          </Button>
        </div>
      </div>

      {/* Tabs principais - agora com 4 tabs */}
      <Tabs defaultValue="ingredients" className="w-full">
        <TabsList className="grid w-full grid-cols-4"> {/* Changed to grid-cols-4 */}
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Ingredientes
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            Marcas
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2"> {/* New tab trigger */}
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

          {/* Tabela de Ingredientes */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Ingredientes ({filteredIngredients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Nome</th>
                      <th className="text-left p-4">Unidade</th>
                      <th className="text-left p-4">Categoria</th>
                      <th className="text-left p-4">Marca</th>
                      <th className="text-left p-4">Preço Atual</th>
                      <th className="text-left p-4">Fornecedor</th>
                      <th className="text-left p-4">Última Atualização</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.map((ingredient, index) => (
                      <tr key={ingredient.id || `ingredient-${index}`} className="border-b hover:bg-gray-50 group">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{ingredient.name}</div>
                            {ingredient.taco_variations && ingredient.taco_variations.length > 0 && (
                              <Badge
                                variant="outline"
                                className="mt-1 bg-gray-100 text-gray-700 border-gray-300"
                              >
                                {ingredient.taco_variations.length} TACO
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">{ingredient.unit}</td>
                        <td className="p-4">{ingredient.category || 'N/A'}</td>
                        <td className="p-4">{ingredient.displayBrand}</td>
                        <td className="p-4">
                          {editingPrice === ingredient.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                className="w-20 h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePriceSave(ingredient);
                                  if (e.key === 'Escape') handlePriceCancel();
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handlePriceSave(ingredient)}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={handlePriceCancel}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>R$ {ingredient.displayPrice?.toFixed(2).replace('.', ',') || '0,00'}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handlePriceEdit(ingredient)}
                                title="Editar preço"
                              >
                                <DollarSign className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-4">{ingredient.displaySupplier}</td>
                        <td className="p-4">
                          {ingredient.last_update ?
                            new Date(ingredient.last_update).toLocaleDateString('pt-BR') :
                            'N/A'}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-gray-700">
                            {ingredient.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={() => router.push(`/ingredientes/editor?id=${ingredient.id}`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePriceEdit(ingredient)}
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Atualizar Preço
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDelete(ingredient);
                                }}
                                className="text-gray-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredIngredients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum ingrediente encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands" className="space-y-6">
          <BrandsManager />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6"> {/* New tab content */}
          <AnalysisManager />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <ImportManager onImportComplete={loadIngredients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
