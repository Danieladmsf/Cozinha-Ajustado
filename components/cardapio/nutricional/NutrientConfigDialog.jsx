'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Save, RotateCcw, Settings2 } from 'lucide-react';
import { nutrientConfig } from '@/components/shared/nutrientConfig';

export default function NutrientConfigDialog({
  isOpen,
  onClose,
  selectedNutrients,
  onToggleNutrient,
  onToggleCategory,
  onResetToDefaults,
  onSave
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-blue-600" />
            Configurar Nutrientes
          </DialogTitle>
          <DialogDescription>
            Selecione os nutrientes que deseja exibir na tabela nutricional
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[50vh] pr-2">
          <div className="space-y-6">
            {Object.entries(nutrientConfig.nutrientCategories).map(([category, nutrients]) => {
              const allSelected = nutrients.every(id => selectedNutrients[id]);
              const someSelected = nutrients.some(id => selectedNutrients[id]);
              
              return (
                <div key={category} className="space-y-3">
                  {/* Header da categoria */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onCheckedChange={() => onToggleCategory(category)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <label 
                      className="text-sm font-semibold cursor-pointer text-gray-900 flex-1" 
                      onClick={() => onToggleCategory(category)}
                    >
                      {category}
                    </label>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      {nutrients.filter(id => selectedNutrients[id]).length}/{nutrients.length}
                    </span>
                  </div>
                  
                  {/* Nutrientes da categoria */}
                  <div className="ml-6 grid grid-cols-1 gap-3">
                    {nutrients.map(nutrientId => (
                      <div 
                        key={nutrientId} 
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedNutrients[nutrientId] || false}
                          onCheckedChange={() => onToggleNutrient(nutrientId)}
                          className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <label 
                          className="text-sm cursor-pointer text-gray-700 flex-1" 
                          onClick={() => onToggleNutrient(nutrientId)}
                        >
                          {nutrientConfig.nutrientNames?.[nutrientId] || nutrientId}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onResetToDefaults}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrões
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            
            <Button 
              onClick={onSave}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              Salvar Configuração
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}