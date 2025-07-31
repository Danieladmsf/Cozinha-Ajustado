import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MenuCategoryItem({ 
  day, 
  category, 
  categoryId, 
  items = [], 
  onChange, 
  onAddItem, 
  onRemoveItem,
  onAddNote,
  color = "#4f46e5",
  isEditable = true,
  className
}) {
  // Função para formatar nomes de receitas
  const formatRecipeName = (name) => {
    if (!name) return "";
    // Verificar se já tem aspas
    if (name.startsWith('"') && name.endsWith('"')) return name;
    
    // Se tiver dois pontos, formatar com aspas na primeira parte
    if (name.includes(":")) {
      const [first, ...rest] = name.split(":");
      return `"${first}": ${rest.join(":")}`;
    }
    
    return name;
  };
  
  // Handler simplificado sem estado local
  const handleItemChange = useCallback((index, field, value) => {
    // Avisar o componente pai da mudança sem solicitação de recarregamento
    onChange(day, categoryId, index, { [field]: value });
  }, [day, categoryId, onChange]);
  
  return (
    <div className={cn("mb-4 last:mb-0", className)}>
      {/* Cabeçalho da categoria */}
      <div 
        className="flex justify-between items-center px-3 py-2 rounded-md text-sm font-medium mb-2"
        style={{ 
          backgroundColor: `${color}15`,
          borderLeft: `3px solid ${color}` 
        }}
      >
        <span className="text-gray-700">{category}</span>
        {isEditable && (
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => onAddItem(day, categoryId)}
            >
              <PlusCircle className="h-4 w-4" />
              <span className="sr-only">Adicionar item</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                  <span className="font-bold text-xs">•••</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Opções</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAddNote(day, categoryId)}>
                  Adicionar Observação
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      
      {/* Lista de itens da categoria */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div 
            key={index} 
            className={cn(
              "flex items-center gap-2 rounded-md",
              isEditable ? "hover:bg-gray-50" : ""
            )}
          >
            <div className="flex-1">
              <Input
                value={formatRecipeName(item.name || "")}
                onChange={(e) => handleItemChange(index, "name", e.target.value)}
                placeholder="Nome do item..."
                className="border-none bg-transparent px-3 hover:bg-gray-50 focus:bg-white"
                readOnly={!isEditable}
              />
            </div>
            
            {isEditable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveItem(day, categoryId, index)}
                className="opacity-0 group-hover:opacity-100 h-7 w-7 transition-opacity duration-200"
              >
                <Trash2 className="h-3.5 w-3.5 text-gray-400" />
              </Button>
            )}
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-2 text-sm text-gray-400">
            {isEditable ? "Clique em + para adicionar itens" : "Nenhum item nesta categoria"}
          </div>
        )}
      </div>
    </div>
  );
}