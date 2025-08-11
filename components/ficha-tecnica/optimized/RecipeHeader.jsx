import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Search, ClipboardList, Printer, ClipboardCheck, FilePlus, Save, Loader2, CookingPot } from "lucide-react";

const RecipeHeader = ({
  isDirty,
  search,
  saving,
  onSearchQueryChange,
  onSearchFocus,
  onSearchBlur,
  onShowConfig,
  onRecipeSelection,
  onClearRecipe,
  onSaveRecipe,
  filteredRecipes,
  searchLoading,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <ClipboardList className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Ficha Técnica</h1>
            {isDirty && (
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                Não salvo
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            Crie e estruture suas receitas com detalhes profissionais
          </p>
        </div>

        <div className="relative search-container">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={search.query}
            onChange={onSearchQueryChange}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            placeholder="Buscar receita..."
            className="w-full pl-10 pr-12 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Settings
              className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={onShowConfig}
            />
          </div>

          {search.isOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              <div className="p-2">
                {searchLoading ? (
                  <div className="p-3 text-center text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando receitas...
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="p-3 text-center text-gray-500">
                    {search.query.trim() ? 'Nenhuma receita encontrada' : 'Digite para buscar receitas'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredRecipes.map(recipe => (
                      <div
                        key={recipe.id}
                        className="p-2 hover:bg-gray-50 rounded cursor-pointer flex items-center gap-2"
                        onClick={() => onRecipeSelection(recipe)}
                      >
                        <CookingPot className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{recipe.name}</div>
                          {recipe.category && (
                            <div className="text-xs text-gray-500">{recipe.category}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button variant="outline" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2">
            <Printer className="h-4 w-4" />
            Ficha Técnica Completa
          </Button>

          <Button variant="outline" className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Ficha de Coleta
          </Button>

          <Button
            variant="outline"
            onClick={onClearRecipe}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
          >
            <FilePlus className="h-4 w-4" />
            Nova Ficha
          </Button>

          <div className="flex-grow"></div>

          <Button
            onClick={onSaveRecipe}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar Ficha'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RecipeHeader);
