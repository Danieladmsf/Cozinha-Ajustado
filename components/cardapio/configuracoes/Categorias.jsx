import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Grid, Check } from "lucide-react";

const CategoriesTab = ({
  categories,
  categoryTree,
  selectedMainCategories,
  setSelectedMainCategories
}) => {
  const handleSelectAll = () => {
    const allCategoryValues = categories.map(cat => cat.value);
    setSelectedMainCategories(allCategoryValues);
  };

  const handleClearSelection = () => {
    setSelectedMainCategories([]);
  };

  const handleCategoryToggle = (categoryValue) => {
    const isSelected = selectedMainCategories.includes(categoryValue);
    
    if (isSelected) {
      setSelectedMainCategories(prev => prev.filter(val => val !== categoryValue));
    } else {
      setSelectedMainCategories(prev => [...prev, categoryValue]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Grid className="h-5 w-5 mr-2" />
          Categorias do Cardápio
        </CardTitle>
        <p className="text-sm text-gray-600">
          Selecione quais categorias principais aparecerão no cardápio. 
          Apenas as categorias selecionadas aqui estarão disponíveis nas outras configurações.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-medium">Categorias Disponíveis</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                Selecionar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
              >
                Limpar Seleção
              </Button>
            </div>
          </div>

          <ScrollArea className="h-96 border rounded-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((category) => {
                const categoryName = category.label || category.name || category.id;
                const categoryValue = category.value;
                const isSelected = selectedMainCategories.includes(categoryValue);
                
                // Contar subcategorias que pertencem a esta categoria principal
                const matchingSubcategories = categoryTree.filter(subcat => {
                  return subcat.type === category.value && subcat.level === 1;
                });
                
                const subcategoriesCount = matchingSubcategories.length;
                
                return (
                  <div
                    key={`category-${category.id}`}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                    onClick={() => handleCategoryToggle(categoryValue)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
                            isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{categoryName}</div>
                          <div className="text-xs text-gray-500">
                            {subcategoriesCount} subcategoria{subcategoriesCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>{selectedMainCategories.length}</strong> categoria{selectedMainCategories.length !== 1 ? 's' : ''} selecionada{selectedMainCategories.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoriesTab;