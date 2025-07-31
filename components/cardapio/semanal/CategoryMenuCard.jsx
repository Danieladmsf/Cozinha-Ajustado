'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  EyeOff,
  Search,
  MoreVertical,
  ChevronsUpDown,
  Trash2,
  MessageCircle,
  Plus
} from 'lucide-react';
import { renderFormattedRecipeName } from '@/lib/textHelpers';

export default function CategoryMenuCard({
  category,
  items,
  categoryColor,
  isLocationVisible,
  onToggleLocationVisibility,
  onMenuItemChange,
  onAddMenuItem,
  onRemoveMenuItem,
  recipes,
  menuHelpers,
  menuInterface,
  noteActions,
  currentDayIndex,
  renderLocationCheckboxes
}) {
  const { headerStyle, buttonStyle } = menuHelpers.generateCategoryStyles(categoryColor);

  const handleOpenChange = (itemIndex, open) => {
    menuInterface.handleOpenChange(category.id, itemIndex, open);
    if (!open) {
      menuInterface.clearSearchTerm(category.id, itemIndex);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-all duration-300">
      <div 
        className="py-4 px-6 relative border-b border-gray-100/50" 
        style={headerStyle}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div 
              className="w-5 h-5 rounded-full mr-3 shadow-sm border-2 border-white/30 ring-2 ring-white/20" 
              style={{ backgroundColor: categoryColor }}
            />
            <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleLocationVisibility}
            className="text-gray-600 hover:bg-white/30 hover:text-gray-800 transition-all rounded-lg p-2"
          >
            {isLocationVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="p-6 bg-gradient-to-b from-white to-gray-50/30">
        <div className="space-y-4">
          {items.map((item, itemIndex) => {
            const isOpen = menuInterface.isDropdownOpen(category.id, itemIndex);
            const currentSearchTerm = menuInterface.getSearchTerm(category.id, itemIndex);
            const filteredRecipes = menuHelpers.filterRecipesBySearch(recipes, category.name, currentSearchTerm);

            return (
              <div 
                key={itemIndex} 
                className="space-y-3 p-4 rounded-xl transition-all hover:bg-white/80 border border-gray-100/50 hover:border-gray-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Popover 
                    open={isOpen}
                    onOpenChange={(open) => handleOpenChange(itemIndex, open)}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        role="combobox" 
                        aria-expanded={isOpen}
                        className="w-full justify-between h-11 border-gray-200 hover:border-gray-300 bg-white"
                      >
                        {item.recipe_id ? (
                          <span className="font-medium">
                            {renderFormattedRecipeName(
                              recipes?.find(r => r.id === item.recipe_id)?.name || ""
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Selecione um item...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    
                    <PopoverContent className="p-0 w-[400px]" align="start">
                      <Command shouldFilter={false}>
                        <div className="flex items-center border-b px-3 py-2">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <CommandInput 
                            placeholder="Digite para buscar..." 
                            value={currentSearchTerm}
                            onValueChange={(value) => {
                              menuInterface.updateSearchTerm(category.id, itemIndex, value);
                            }}
                            className="border-0 focus:ring-0"
                          />
                        </div>
                        <CommandList className="max-h-60">
                          <CommandItem
                            onSelect={() => {
                              onMenuItemChange(currentDayIndex, category.id, itemIndex, { recipe_id: null });
                              handleOpenChange(itemIndex, false);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            Limpar seleção
                          </CommandItem>
                          
                          {filteredRecipes.length === 0 ? (
                            <CommandEmpty>Nenhuma receita encontrada</CommandEmpty>
                          ) : (
                            filteredRecipes.map(recipe => (
                              <CommandItem
                                key={recipe.id}
                                value={recipe.name}
                                onSelect={() => {
                                  onMenuItemChange(currentDayIndex, category.id, itemIndex, { recipe_id: recipe.id });
                                  handleOpenChange(itemIndex, false);
                                }}
                                className="cursor-pointer"
                              >
                                {renderFormattedRecipeName(recipe.name)}
                              </CommandItem>
                            ))
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="shrink-0 hover:bg-gray-100 h-11 w-11 rounded-lg"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => {
                          noteActions.startAddingNote(
                            category.id, 
                            itemIndex, 
                            currentDayIndex, 
                            item.recipe_id
                          );
                        }}
                        className="cursor-pointer"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Adicionar observação
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 cursor-pointer" 
                        onClick={() => onRemoveMenuItem(itemIndex)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isLocationVisible && renderLocationCheckboxes(itemIndex, item)}
              </div>
            );
          })}
        </div>

        {items.length < 10 && (
          <div className="mt-6 pt-4 border-t border-gray-200/50">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-dashed border-gray-300 hover:border-gray-400 h-12 rounded-xl"
              style={buttonStyle}
              onClick={onAddMenuItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar item
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}