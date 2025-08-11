'use client';

import React, { useCallback } from "react";
import {
  Button,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  useToast,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui";
import {
  Loader2,
  Settings,
  Save,
} from "lucide-react";

const RecipeConfigDialog = React.memo(({
  isOpen,
  onClose,
  config,
  actions,
  setUIState,
}) => {
  const { toast } = useToast();

  const handleSaveConfig = useCallback(async () => {
    const result = await actions.config.save(config.selectedCategoryType);
    if (result.success) {
      setUIState('showConfigDialog', false);
      toast({
        title: "Configuração salva",
        description: "As configurações da ficha técnica foram salvas com sucesso."
      });
    } else {
      toast({
        title: "Erro ao salvar configuração",
        description: result.error.message || "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive"
      });
    }
  }, [actions.config, config.selectedCategoryType, setUIState, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
            {config.loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando opções...
              </div>
            ) : config.categoryTypes.length === 0 ? (
              <div className="p-4 text-center text-gray-500 border border-dashed rounded">
                Nenhum tipo de categoria encontrado
              </div>
            ) : (
              <Select
                value={config.selectedCategoryType}
                onValueChange={actions.config.save}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um tipo de categoria" />
                </SelectTrigger>
                <SelectContent>
                  {config.categoryTypes.map((type) => {
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
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveConfig}
            disabled={config.saving || !config.selectedCategoryType}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {config.saving ? (
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
});

export default RecipeConfigDialog;
