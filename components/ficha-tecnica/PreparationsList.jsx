import React from 'react';
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';
import { Card, CardContent, CardHeader, CardTitle, Button, Label, Textarea } from "@/components/ui";
import { Trash2 } from "lucide-react";
import IngredientTable from './IngredientTable';
import RecipeEmptyStates from './RecipeEmptyStates';

export default function PreparationsList() {
  const { preparations, actions, computed } = useRecipeStore();

  if (preparations.length === 0) {
    return <RecipeEmptyStates.EmptyRecipeState />;
  }

  return (
    <div className="space-y-6">
      {preparations.map((prep, index) => (
        <Card key={prep.id || index} className="border-l-4 border-l-blue-400 overflow-hidden">
          <CardHeader className="bg-blue-50/50 border-b flex flex-row items-center justify-between py-3 px-4">
            <CardTitle className="text-base font-semibold text-blue-800">
              {prep.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => actions.removePreparation(prep.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-100 h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-xs font-medium text-gray-500">
                Processos: {prep.processes?.map(p => computed.processTypes[p]?.label).join(', ')}
              </Label>
            </div>

            <IngredientTable prepIndex={index} />

            <div>
              <Label htmlFor={`instructions-${index}`} className="text-sm font-medium mb-1 block">
                Modo de Preparo da Etapa
              </Label>
              <Textarea
                id={`instructions-${index}`}
                value={prep.instructions || ''}
                onChange={(e) => actions.updatePreparation(prep.id, { instructions: e.target.value })}
                placeholder="Descreva o modo de preparo desta etapa..."
                className="w-full p-2 border border-gray-200 rounded-lg resize-y min-h-[400px] focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}