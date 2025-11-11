import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, DollarSign, Trash2, Package, Plus, TrendingUp, Search, X, Leaf, Calendar, Check } from "lucide-react";
import PriceEditor from "./PriceEditor";
import PriceHistoryViewer from "./PriceHistoryViewer";
import PriceUpdateModal from "./PriceUpdateModal";

export default function IngredientsTable({ ingredients, onDelete, updateIngredientPrice, updateIngredient }) {
  const router = useRouter();
  const [selectedIngredientForHistory, setSelectedIngredientForHistory] = useState(null);
  const [selectedIngredientForPriceUpdate, setSelectedIngredientForPriceUpdate] = useState(null);

  // Estados dos filtros
  const [filters, setFilters] = useState({
    name: '',
    unit: '',
    category: '',
    brand: '',
    supplier: '',
    status: ''
  });

  // Lista de IDs problemáticos para filtrar (blacklist)
  const BLACKLISTED_IDS = [
    '684bfe20b60fe3a1a47dfce7', '684bfe28943203651ae5a922',
    '684bfe2b60647d247b5533be', '684bfe32767c7d82725a74d5',
    '684bfe39ce1a5c4bb28d47a2', '684bfe3cce1a5c4bb28d47bc',
    '684bfe3cfede6d0d2bb1ef16', '684bfe3d8e7a40c69f0fe67e',
    '684bfe40ce1a5c4bb28d47d9', '684bfe3760647d247b5533f5'
  ];

  // Filtrar ingredientes
  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ingredient => {
      // Filtrar IDs problemáticos da blacklist
      if (BLACKLISTED_IDS.includes(ingredient.id)) {
        return false;
      }

      const matchName = !filters.name || ingredient.name?.toLowerCase().includes(filters.name.toLowerCase());
      const matchUnit = !filters.unit || ingredient.unit?.toLowerCase().includes(filters.unit.toLowerCase());
      const matchCategory = !filters.category || ingredient.category?.toLowerCase().includes(filters.category.toLowerCase());
      const matchBrand = !filters.brand || ingredient.displayBrand?.toLowerCase().includes(filters.brand.toLowerCase());
      const matchSupplier = !filters.supplier || ingredient.displaySupplier?.toLowerCase().includes(filters.supplier.toLowerCase());
      const matchStatus = !filters.status || (filters.status === 'ativo' ? ingredient.active : !ingredient.active);

      return matchName && matchUnit && matchCategory && matchBrand && matchSupplier && matchStatus;
    });
  }, [ingredients, filters]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      unit: '',
      category: '',
      brand: '',
      supplier: '',
      status: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  if (ingredients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ingredientes (0)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <div className="flex flex-col items-center space-y-4">
              <Package className="w-16 h-16 text-gray-300" />
              <div>Nenhum ingrediente encontrado</div>
              <Button 
                onClick={() => router.push("/ingredientes/editor")}
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Ingrediente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/60 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-xl text-slate-700">
              Lista de Ingredientes ({filteredIngredients.length.toLocaleString()} {filteredIngredients.length !== ingredients.length && `de ${ingredients.length.toLocaleString()}`})
            </CardTitle>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-300">
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Nome</span>
                    </div>
                    <Input
                      placeholder="Filtrar nome..."
                      value={filters.name}
                      onChange={(e) => updateFilter('name', e.target.value)}
                      className="h-8 text-xs bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Unidade</span>
                    </div>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.unit}
                      onChange={(e) => updateFilter('unit', e.target.value)}
                      className="h-8 text-xs bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Categoria</span>
                    </div>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.category}
                      onChange={(e) => updateFilter('category', e.target.value)}
                      className="h-8 text-xs bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Marca</span>
                    </div>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.brand}
                      onChange={(e) => updateFilter('brand', e.target.value)}
                      className="h-8 text-xs bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span>Preço Atual</span>
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Fornecedor</span>
                    </div>
                    <Input
                      placeholder="Filtrar..."
                      value={filters.supplier}
                      onChange={(e) => updateFilter('supplier', e.target.value)}
                      className="h-8 text-xs bg-white border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  Última Atualização
                </th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">
                  <div className="space-y-2">
                    <span>Status</span>
                    <select
                      value={filters.status}
                      onChange={(e) => updateFilter('status', e.target.value)}
                      className="h-8 w-full text-xs bg-white border border-slate-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500"
                    >
                      <option value="">Todos</option>
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                </th>
                <th className="text-center p-4 text-sm font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map((ingredient, index) => (
                <tr key={ingredient.id || `ingredient-${index}`} className="border-b border-slate-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-emerald-50/50 group transition-all duration-200">
                  <td className="p-4">
                    <div className="space-y-2">
                      <div className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors duration-200">
                        {ingredient.name}
                      </div>
                      {ingredient.taco_variations && ingredient.taco_variations.length > 0 && (
                        <Badge className="bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-300 font-medium text-xs flex items-center gap-1 w-fit">
                          <Leaf className="w-3 h-3" />
                          {ingredient.taco_variations.length} TACO
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">
                      {ingredient.unit}
                    </span>
                  </td>
                  <td className="p-4">
                    <Badge className="bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border-purple-300 font-medium">
                      {ingredient.category || (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          N/A
                        </span>
                      )}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-600 font-medium">{ingredient.displayBrand}</span>
                  </td>
                  <td className="p-4">
                    <PriceEditor
                      ingredient={ingredient}
                      onEdit={() => setSelectedIngredientForPriceUpdate(ingredient)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-slate-600 font-medium">{ingredient.displaySupplier}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-slate-500 text-sm font-medium flex items-center gap-1">
                      {ingredient.last_update ? (
                        <>
                          <Calendar className="w-3 h-3" />
                          {new Date(ingredient.last_update).toLocaleDateString('pt-BR')}
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3 h-3" />
                          N/A
                        </>
                      )}
                    </span>
                  </td>
                  <td className="p-4">
                    <Badge
                      className={ingredient.active
                        ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300 font-semibold flex items-center gap-1 w-fit"
                        : "bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-300 font-semibold flex items-center gap-1 w-fit"
                      }
                    >
                      {ingredient.active ? (
                        <>
                          <Check className="w-3 h-3" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="hover:bg-slate-100 rounded-lg opacity-60 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                        >
                          <MoreHorizontal className="h-4 w-4 text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-xl shadow-xl border-0 bg-white/95 backdrop-blur-sm">
                        <DropdownMenuItem
                          onClick={() => router.push(`/ingredientes/editor?id=${ingredient.id}`)}
                          className="rounded-lg hover:bg-blue-50 cursor-pointer group/item"
                        >
                          <Edit className="mr-3 h-4 w-4 text-blue-600 group-hover/item:scale-110 transition-transform duration-200" />
                          <span className="text-slate-700 font-medium">Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedIngredientForPriceUpdate(ingredient)}
                          className="rounded-lg hover:bg-green-50 cursor-pointer group/item"
                        >
                          <DollarSign className="mr-3 h-4 w-4 text-green-600 group-hover/item:scale-110 transition-transform duration-200" />
                          <span className="text-slate-700 font-medium">Atualizar Preço</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedIngredientForHistory(ingredient)}
                          className="rounded-lg hover:bg-purple-50 cursor-pointer group/item"
                        >
                          <TrendingUp className="mr-3 h-4 w-4 text-purple-600 group-hover/item:scale-110 transition-transform duration-200" />
                          <span className="text-slate-700 font-medium">Histórico de Preços</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(ingredient);
                          }}
                          className="rounded-lg hover:bg-red-50 cursor-pointer group/item"
                        >
                          <Trash2 className="mr-3 h-4 w-4 text-red-600 group-hover/item:scale-110 transition-transform duration-200" />
                          <span className="text-red-700 font-medium">Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    
    {/* Price Update Modal */}
    <PriceUpdateModal
      ingredient={selectedIngredientForPriceUpdate}
      isOpen={!!selectedIngredientForPriceUpdate}
      onClose={() => setSelectedIngredientForPriceUpdate(null)}
      onUpdate={updateIngredient}
    />
    
    {/* Price History Viewer Modal */}
    <PriceHistoryViewer
      ingredient={selectedIngredientForHistory}
      isOpen={!!selectedIngredientForHistory}
      onClose={() => setSelectedIngredientForHistory(null)}
      onRefresh={() => {
        // Optionally trigger a refresh of the ingredients list
        // This could be passed as a prop if needed
      }}
    />
  </>
  );
}