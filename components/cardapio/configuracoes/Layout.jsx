import React from 'react';
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Grid, GripVertical } from "lucide-react";

const LayoutTab = ({
  categories,
  categoryTree,
  selectedMainCategories,
  activeCategories,
  expandedCategories,
  categoryColors,
  fixedDropdowns,
  categoryOrder,
  getFilteredCategories,
  toggleCategoryActive,
  toggleExpandedCategory,
  updateFixedDropdowns,
  setCategoryOrder
}) => {
  console.log('LayoutTab: Props received - categories:', categories);
  console.log('LayoutTab: Props received - categoryTree:', categoryTree);
  console.log('LayoutTab: Props received - selectedMainCategories:', selectedMainCategories);
  console.log('LayoutTab: Props received - categoryOrder:', categoryOrder);
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(categoryOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCategoryOrder(items);
  };

  const getCategoryOrderPosition = (categoryId) => {
    const currentOrder = categoryOrder.filter(id => 
      getFilteredCategories().some(cat => cat.id === id)
    );
    const position = currentOrder.indexOf(categoryId);
    return position !== -1 ? position + 1 : 1;
  };

  const updateCategoryOrder = (categoryId, newOrder) => {
    const numValue = parseInt(newOrder) || 1;
    const clampedValue = Math.max(1, Math.min(getFilteredCategories().length, numValue));
    
    const updatedOrder = [...categoryOrder];
    const currentIndex = updatedOrder.indexOf(categoryId);
    if (currentIndex !== -1) {
      updatedOrder.splice(currentIndex, 1);
    }
    
    updatedOrder.splice(clampedValue - 1, 0, categoryId);
    setCategoryOrder(updatedOrder);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid className="h-5 w-5" />
          Configurações das Categorias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Configure ordem, ativação e todas as propriedades das categorias em uma única tabela:
        </p>

        {selectedMainCategories.length === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ Nenhum tipo de categoria selecionado. Vá para a aba "Categorias" para selecionar os tipos que devem aparecer no cardápio.
            </p>
          </div>
        )}

        {getFilteredCategories().length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">Nenhuma categoria disponível</p>
            <p className="text-sm">Selecione tipos de categoria na aba "Categorias" primeiro</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Ordem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Ativa
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Expandida
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Dropdowns Fixos
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    <GripVertical className="h-4 w-4 mx-auto" title="Arraste para reordenar" />
                  </th>
                </tr>
              </thead>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="categories-table">
                  {(provided) => (
                    <tbody
                      className="bg-white divide-y divide-gray-200"
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {categoryOrder.filter(categoryId => {
                        console.log('LayoutTab: Filtering categoryId:', categoryId);
                        const category = categoryTree.find(c => c.id === categoryId);
                        console.log('LayoutTab: Category found for filter:', category);
                        if (!category) return false;
                        if (selectedMainCategories.length === 0) return true;
                        const mainCategory = categories.find(cat => cat.value === category.type);
                        if (!mainCategory) return false;
                        return selectedMainCategories.includes(mainCategory.value);
                      }).map((categoryId, index) => {
                        const category = categoryTree.find(c => c.id === categoryId);
                        if (!category) return null;
                        
                        return (
                          <Draggable key={category.id} draggableId={category.id} index={index}>
                            {(provided) => (
                              <tr 
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                              >
                                <td className="px-3 py-3 text-center">
                                  <Input
                                    type="number"
                                    min="1"
                                    max={getFilteredCategories().length}
                                    className="w-16 mx-auto text-center text-sm"
                                    value={getCategoryOrderPosition(category.id)}
                                    onChange={(e) => updateCategoryOrder(category.id, e.target.value)}
                                  />
                                </td>
                                
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-4 h-4 rounded-full border"
                                      style={{ 
                                        backgroundColor: categoryColors[category.id] || category.color || '#808080',
                                        opacity: activeCategories[category.id] ? 1 : 0.5 
                                      }}
                                    />
                                    <span className={`font-medium ${activeCategories[category.id] ? 'text-gray-900' : 'text-gray-400'}`}>
                                      {category.name}
                                    </span>
                                  </div>
                                </td>
                                
                                <td className="px-3 py-3 text-center">
                                  <Switch
                                    checked={activeCategories[category.id]}
                                    onCheckedChange={() => toggleCategoryActive(category.id)}
                                    className={`${activeCategories[category.id] 
                                      ? 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500' 
                                      : 'bg-red-100 border-red-300'
                                    }`}
                                  />
                                </td>
                                
                                <td className="px-3 py-3 text-center">
                                  <Switch
                                    checked={expandedCategories.includes(category.id)}
                                    onCheckedChange={() => toggleExpandedCategory(category.id)}
                                    className={`${expandedCategories.includes(category.id) 
                                      ? 'data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500' 
                                      : 'bg-gray-200 border-gray-300'
                                    }`}
                                    disabled={!activeCategories[category.id]}
                                  />
                                </td>
                                
                                <td className="px-3 py-3 text-center">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    className="w-16 mx-auto text-center"
                                    value={fixedDropdowns[category.id] || 0}
                                    onChange={(e) => updateFixedDropdowns(category.id, e.target.value)}
                                    disabled={!activeCategories[category.id]}
                                  />
                                </td>
                                
                                <td className="px-3 py-3 text-center">
                                  <div 
                                    {...provided.dragHandleProps}
                                    className="cursor-grab hover:text-blue-600 inline-flex"
                                    title="Arraste para reordenar"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </tbody>
                  )}
                </Droppable>
              </DragDropContext>
            </table>
          </div>
        )}

        {/* Legenda */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded"></div>
            <span><strong>Ordem:</strong> Posição no cardápio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span><strong>Ativa:</strong> Aparece no cardápio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span><strong>Expandida:</strong> Locais visíveis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span><strong>Dropdowns:</strong> Quantidade fixa</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LayoutTab;