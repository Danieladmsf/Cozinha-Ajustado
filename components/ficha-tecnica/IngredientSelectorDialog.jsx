'use client';

import React, { useCallback } from "react";
import {
  Button,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  useToast,
  Input,
} from "@/components/ui";
import {
  Loader2,
  Search,
} from "lucide-react";

const IngredientSelectorDialog = React.memo(({
  isOpen,
  onClose,
  ingredients,
  actions,
  currentPrepIndexForIngredient,
  preparations,
  addIngredient,
}) => {
  const { toast } = useToast();

  const handleSelectIngredient = useCallback((ingredient) => {
    if (currentPrepIndexForIngredient !== null) {
      const prepIndex = currentPrepIndexForIngredient;
      onClose();

      const currentPrep = preparations[prepIndex];
      const ingredientExists = currentPrep?.ingredients?.some(
        ing => ing.ingredient_id === ingredient.id || ing.name === ingredient.name || ing.id === ingredient.id
      );

      if (ingredientExists) {
        toast({
          title: "Ingrediente já existe",
          description: `"${ingredient.name}" já foi adicionado a esta preparação.`, 
          variant: "destructive"
        });
        return;
      }

      const newIngredient = {
        ...ingredient,
        id: `${ingredient.id}_${Date.now()}`,
        ingredient_id: ingredient.id,
        weight_frozen: '',
        weight_thawed: '',
        weight_raw: '',
        weight_clean: '',
        weight_pre_cooking: '',
        weight_cooked: '',
        weight_portioned: '',
        // Remover current_price fixo - será buscado dinamicamente
      };

      addIngredient(prepIndex, newIngredient);

      toast({
        title: "Ingrediente adicionado",
        description: `"${ingredient.name}" foi adicionado à preparação.`
      });
    }
  }, [currentPrepIndexForIngredient, onClose, preparations, addIngredient, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Selecionar Ingrediente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar ingrediente..."
              value={ingredients.searchTerm}
              onChange={(e) => actions.ingredients.setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto border rounded-lg">
            {ingredients.loading ? (
              <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando ingredientes...
              </div>
            ) : ingredients.filtered.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {ingredients.searchTerm.trim() ? 'Nenhum ingrediente encontrado' : 'Digite para buscar ingredientes'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {ingredients.filtered.map(ingredient => (
                  <div
                    key={ingredient.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectIngredient(ingredient);
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
                            R$ {parseFloat(ingredient.current_price || 0).toFixed(2)}/{ingredient.unit || 'kg'}
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
});

export default IngredientSelectorDialog;
