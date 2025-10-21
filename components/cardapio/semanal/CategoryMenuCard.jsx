'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
// Card components removed - not being used
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all mb-4">
      <div 
        className="py-2 px-3 border-b border-gray-200" 
        style={headerStyle}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div 
              className="w-4 h-4 rounded-full mr-2 shadow-sm" 
              style={{ backgroundColor: categoryColor }}
            />
            <h3 className="text-base font-semibold text-gray-800">{category.name}</h3>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleLocationVisibility}
            className="text-gray-600 hover:bg-white/30 hover:text-gray-800 p-1"
          >
            {isLocationVisible ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="space-y-3">
          {items.map((item, itemIndex) => {
            const isOpen = menuInterface.isDropdownOpen(category.id, itemIndex);
            const currentSearchTerm = menuInterface.getSearchTerm(category.id, itemIndex);
            const filteredRecipes = menuHelpers.filterRecipesBySearch(recipes, category.name, currentSearchTerm);

            return (
              <div 
                key={itemIndex} 
                className="space-y-2 p-2 rounded border border-gray-100 hover:border-gray-200 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Popover 
                    open={isOpen}
                    onOpenChange={(open) => handleOpenChange(itemIndex, open)}
                  >
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        role="combobox" 
                        aria-expanded={isOpen}
                        className="w-full justify-between h-9 border-gray-200 hover:border-gray-300 bg-white text-sm"
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
                        className="shrink-0 hover:bg-gray-100 h-9 w-9 rounded-lg"
                      >
                        <MoreVertical className="h-3 w-3" />
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
          <div className="mt-3 pt-2 border-t border-gray-200">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-dashed border-gray-300 hover:border-gray-400 h-9 rounded-lg text-sm"
              style={buttonStyle}
              onClick={onAddMenuItem}
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar item
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}