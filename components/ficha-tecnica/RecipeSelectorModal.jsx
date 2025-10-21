import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CookingPot, Loader2 } from "lucide-react";
import { formatCurrency, formatWeight } from "@/lib/formatUtils";

/**
 * Modal para buscar e selecionar receitas para adicionar à preparação
 */
const RecipeSelectorModal = ({ isOpen, onClose, onSelectRecipe, currentRecipeId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Limpar ao abrir/fechar o modal
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setFilteredRecipes([]);
      setError(null);
    }
  }, [isOpen]);

  // Busca dinâmica com debounce
  useEffect(() => {
    // Não buscar se não tiver termo de busca
    if (!searchTerm.trim()) {
      setFilteredRecipes([]);
      return;
    }

    // Mínimo de 2 caracteres para buscar
    if (searchTerm.trim().length < 2) {
      setFilteredRecipes([]);
      return;
    }

    // Debounce: esperar 500ms após o usuário parar de digitar
    const timeoutId = setTimeout(() => {
      searchRecipes(searchTerm.trim());
    }, 500);

    // Limpar timeout anterior
    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentRecipeId]);

  const searchRecipes = async (term) => {
    setLoading(true);
    setError(null);

    try {
      // Fazer busca no backend com o termo
      const params = new URLSearchParams({
        search: term,
        excludeId: currentRecipeId || '',
        activeOnly: 'true',
        validOnly: 'true' // Apenas receitas com métricas válidas
      });

      const response = await fetch(`/api/recipes?${params}`);

      if (!response.ok) {
        throw new Error('Falha ao buscar receitas');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar receitas');
      }

      const recipes = result.data || [];

      // Ordenar alfabeticamente
      const sortedRecipes = recipes.sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR')
      );

      setFilteredRecipes(sortedRecipes);
    } catch (err) {
      console.error('Erro ao buscar receitas:', err);
      setError(err.message);
      setFilteredRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecipe = (recipe) => {
    // Preparar dados da receita para adicionar
    const recipeData = {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      yield_weight: recipe.yield_weight,
      cost_per_kg_yield: recipe.cost_per_kg_yield,
      total_cost: recipe.total_cost,
      // Campo vazio inicialmente, usuário preencherá o peso desejado
      used_weight: '',
      // Marcador para identificar como receita
      isRecipe: true,
      // Tipo para diferenciação
      type: 'recipe'
    };

    onSelectRecipe(recipeData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CookingPot className="w-5 h-5 text-purple-600" />
            Selecionar Receita
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar receita por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>


          {/* Lista de resultados */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span>Buscando receitas...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                <p className="font-medium">Erro ao buscar receitas</p>
                <p className="text-sm mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => searchRecipes(searchTerm.trim())}
                  className="mt-3"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : !searchTerm.trim() ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Search className="h-12 w-12 text-gray-300" />
                <div>
                  <p className="font-medium text-gray-600">Digite para buscar receitas</p>
                  <p className="text-sm mt-1">Mínimo de 2 caracteres</p>
                </div>
              </div>
            ) : searchTerm.trim().length < 2 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Search className="h-12 w-12 text-gray-300" />
                <div>
                  <p className="font-medium text-gray-600">Continue digitando...</p>
                  <p className="text-sm mt-1">Mínimo de 2 caracteres</p>
                </div>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Nenhuma receita encontrada para "{searchTerm}"</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="mt-3"
                >
                  Limpar busca
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className="p-3 hover:bg-purple-50/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectRecipe(recipe)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CookingPot className="h-4 w-4 text-purple-600 flex-shrink-0" />
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {recipe.name}
                          </h4>
                        </div>

                        <div className="flex gap-4 ml-6">
                          <div className="text-xs">
                            <span className="text-gray-500">Rendimento: </span>
                            <span className="font-medium text-blue-600">
                              {formatWeight(recipe.yield_weight)} kg
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Custo/kg: </span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(recipe.cost_per_kg_yield)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        Selecionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contador de resultados */}
          {!loading && !error && filteredRecipes.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? 'receita encontrada' : 'receitas encontradas'}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeSelectorModal;
