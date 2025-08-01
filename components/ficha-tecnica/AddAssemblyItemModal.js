import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Layers, Plus, Search, Package2 } from "lucide-react";
import { formatWeight, formatCurrency, parseNumericValue } from "@/lib/formatUtils";

// Constantes para categorias e cores
const CATEGORY_COLORS = {
  'Carnes': 'bg-red-500',
  'Legumes': 'bg-green-500',
  'Temperos': 'bg-yellow-500',
  'Óleos': 'bg-orange-500',
  'Grãos': 'bg-amber-600',
  'Laticínios': 'bg-blue-500',
  'Açúcares': 'bg-pink-500',
  'Sem categoria': 'bg-gray-400'
};



const AddAssemblyItemModal = ({
  isOpen,
  onClose,
  preparationsData,
  currentPrepIndex,
  ingredients,
  currentRecipeId,
  onAddItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleAddPreviousProcess = (prevPrep) => {
    onAddItem({
      id: prevPrep.id,
      name: prevPrep.title, // Usar 'name' em vez de 'title' para consistência
      isRecipe: false,
      yield_weight: prevPrep.total_yield_weight_prep || 0,
      total_cost: prevPrep.total_cost_prep || 0
    });
    setSearchTerm('');
  };

  const handleAddIngredient = (ingredient) => {
    onAddItem({
      id: ingredient.id,
      name: ingredient.commercial_name || ingredient.name,
      isIngredient: true,
      unit: ingredient.unit || 'kg',
      current_price: ingredient.current_price || 0,
      category: ingredient.category || 'Outros'
    });
    setSearchTerm('');
  };

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };


  const filteredPreviousProcesses = (preparationsData || [])
    .filter((p, idx) => {
      // Deve ser um processo anterior (índice menor)
      if (idx >= currentPrepIndex) return false;
      
      // Deve ter título
      if (!p.title) return false;
      
      // Deve ter ingredientes OU sub_components (conteúdo válido)
      const hasIngredients = p.ingredients && p.ingredients.length > 0;
      const hasSubComponents = p.sub_components && p.sub_components.length > 0;
      
      // Filtro por termo de pesquisa - aplicar filtro apenas se houver termo
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        // Buscar no título do processo
        if (!p.title.toLowerCase().includes(term)) {
          return false;
        }
      }
      
      return hasIngredients || hasSubComponents;
    });

  // Filtrar ingredientes com busca inteligente
  const filteredIngredients = (ingredients || [])
    .filter((ingredient, index) => {
      
      // Apenas ingredientes ativos (verificar se active === false especificamente)
      if (ingredient.active === false) return false;
      
      // Filtro por termo de pesquisa - aplicar filtro apenas se houver termo
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        // Buscar no nome comercial, nome ou categoria
        return (ingredient.commercial_name && ingredient.commercial_name.toLowerCase().includes(term)) ||
               (ingredient.name && ingredient.name.toLowerCase().includes(term)) ||
               (ingredient.category && ingredient.category.toLowerCase().includes(term));
      }
      
      return true;
    });


  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Adicionar Item ao Porcionamento
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar ingrediente por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Processos Anteriores */}
          <div>
            <Label className="font-medium text-gray-700 flex items-center gap-2">
              <Package2 className="w-4 h-4" />
              Processos Anteriores (desta Ficha)
            </Label>
            <div className="bg-gray-50 rounded-md max-h-[200px] overflow-y-auto mt-1 border">
              {filteredPreviousProcesses.length > 0 ? (
                filteredPreviousProcesses.map(prevPrep => (
                  <button
                    key={`prep-${prevPrep.id}`}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center justify-between border-b last:border-b-0"
                    onClick={() => handleAddPreviousProcess(prevPrep)}
                  >
                    <div>
                      <div className="font-medium">{prevPrep.title}</div>
                      <div className="text-xs text-gray-500">
                        Rendimento: {formatWeight((parseNumericValue(prevPrep.total_yield_weight_prep) || 0) * 1000)} / 
                        Custo: {formatCurrency(parseNumericValue(prevPrep.total_cost_prep))}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">
                  Nenhum processo anterior utilizável nesta ficha.
                </p>
              )}
            </div>
          </div>

          {/* Ingredientes - Lista Simples */}
          <div>
            <Label className="font-medium text-gray-700">
              Ingredientes ({filteredIngredients.length})
            </Label>
            <div className="bg-gray-50 rounded-md max-h-[300px] overflow-y-auto mt-1 border">
              {!ingredients ? (
                <p className="px-4 py-3 text-sm text-gray-500">
                  Carregando ingredientes...
                </p>
              ) : filteredIngredients.length > 0 ? (
                filteredIngredients.map(ingredient => (
                  <button
                    key={`ingredient-${ingredient.id}`}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 flex items-center justify-between border-b last:border-b-0 transition-colors"
                    onClick={() => handleAddIngredient(ingredient)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[ingredient.category] || CATEGORY_COLORS['Sem categoria']} flex-shrink-0`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{ingredient.commercial_name || ingredient.name}</div>
                        <div className="text-xs text-gray-500">
                          <span className="text-gray-600">{ingredient.category}</span> • 
                          <span className="font-medium">{formatCurrency(parseNumericValue(ingredient.current_price))} / {ingredient.unit}</span>
                          {ingredient.current_stock > 0 && <span className="text-green-600 ml-2">• Em estoque</span>}
                        </div>
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-gray-500">
                  {searchTerm ? 'Nenhum ingrediente encontrado para esta busca.' : 
                   ingredients.length === 0 ? 'Nenhum ingrediente cadastrado.' :
                   'Nenhum ingrediente ativo disponível.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAssemblyItemModal;