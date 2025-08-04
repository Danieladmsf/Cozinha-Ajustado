import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";

const ColorPalette = ({ onSelect }) => {
  const colors = [
    "#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
    "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50",
    "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", "#ff9800",
    "#ff5722", "#795548", "#9e9e9e", "#607d8b", "#000000"
  ];

  return (
    <div className="grid grid-cols-10 gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="w-6 h-6 rounded-full hover:scale-110 transition-transform border border-gray-300"
          style={{ backgroundColor: color }}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  );
};

const Cores = ({
  categoryColors,
  updateCategoryColor,
  getFilteredCategories
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Cores das Categorias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-6">
          Personalize as cores para cada categoria:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-2">
          {getFilteredCategories().length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p className="mb-2">Nenhuma categoria disponível</p>
              <p className="text-sm">Selecione tipos de categoria na aba "Categorias" primeiro</p>
            </div>
          )}
          {getFilteredCategories().map(category => {
            const categoryColor = categoryColors[category.id] || category.color || "#808080";
            
            return (
              <Card key={category.id} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: categoryColor }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <Badge variant="outline" style={{ borderColor: categoryColor, color: categoryColor }}>
                      {categoryColor}
                    </Badge>
                  </div>
                  <ColorPalette onSelect={(color) => updateCategoryColor(category.id, color)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default Cores;