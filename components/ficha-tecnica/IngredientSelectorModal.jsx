import React from 'react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { Search, Loader2 } from "lucide-react";

export default function IngredientSelectorModal({
  isOpen,
  onOpenChange,
  searchTerm,
  onSearchTermChange,
  isLoading,
  filteredIngredients,
  onSelectIngredient,
  formatCurrency,
  onClose,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Selecionar Ingrediente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar ingrediente..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Lista de resultados */}
          <div className="max-h-80 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando ingredientes...
              </div>
            ) : filteredIngredients.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm.trim() ? 'Nenhum ingrediente encontrado' : 'Digite para buscar ingredientes'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredIngredients.map(ingredient => (
                  <div
                    key={ingredient.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectIngredient(ingredient);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{ingredient.name}</div>
                        {ingredient.brand && (
                          <div className="text-xs text-gray-500">Marca: {ingredient.brand}</div>
                        )}
                        {ingredient.category && (
                          <div className="text-xs text-gray-500">Categoria: {ingredient.category}</div>
                        )}
                      </div>
                      <div className="text-right">
                        {ingredient.current_price && (
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(ingredient.current_price)}/{ingredient.unit || 'kg'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}