import React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Settings, Loader2, Save } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onOpenChange,
  isLoading,
  isSaving,
  categoryTypes,
  selectedCategoryType,
  onSelectedCategoryTypeChange,
  onSave,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações da Ficha Técnica
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="categoryType">Tipo de Categoria</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando opções...
              </div>
            ) : categoryTypes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 border border-dashed rounded">
                Nenhum tipo de categoria encontrado
              </div>
            ) : (
              <Select
                value={selectedCategoryType}
                onValueChange={onSelectedCategoryTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tipo de categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoryTypes.map((type) => {
                    // Suporte para diferentes estruturas de dados
                    const displayName = type.name || type.label || type.value;
                    const typeValue = type.value || type.id;
                    return (
                      <SelectItem key={type.id} value={typeValue}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || !selectedCategoryType}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}