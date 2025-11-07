import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { processTypes } from "@/lib/recipeConstants";
import IngredientTable from './IngredientTable';

const PreparationCard = ({
  prep,
  index,
  onRemovePreparation,
  onUpdatePreparation,
  ...rest // Pass down all other props for IngredientTable
}) => {
  return (
    <Card key={prep.id} className="border-l-4 border-l-blue-400">
      <CardHeader className="bg-blue-50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-800">
            {prep.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemovePreparation(prep.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Processos: {prep.processes?.map(p => processTypes[p]?.label).join(', ')}
            </Label>
          </div>

          <IngredientTable prep={prep} prepIndex={index} {...rest} />

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Instruções
            </Label>
            <textarea
              value={prep.instructions || ''}
              onChange={(e) => onUpdatePreparation(
                index,
                'instructions',
                e.target.value
              )}
              placeholder="Descreva o modo de preparo desta etapa..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-y min-h-[400px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(PreparationCard);
