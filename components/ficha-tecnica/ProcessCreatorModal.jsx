'use client';

import React, { useCallback, useState } from "react";
import {
  Button,
  Label,
} from "@/components/ui";
import {
  CookingPot,
} from "lucide-react";
import { processTypes } from "@/lib/recipeConstants";
import RecipeSelectorModal from "./RecipeSelectorModal";

const ProcessCreatorModal = React.memo(({
  isOpen,
  onClose,
  onAddPreparation,
  preparationsLength,
  currentRecipeId,
}) => {
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  const handleProcessToggle = useCallback((processId, checked) => {
    setSelectedProcesses(prev =>
      checked ? [...prev, processId] : prev.filter((id) => id !== processId)
    );
  }, []);

  const handleCreateProcess = useCallback(() => {
    if (selectedProcesses.length === 0) return;

    // Se apenas "Receita" foi selecionado, abrir modal de seleção de receitas
    if (selectedProcesses.length === 1 && selectedProcesses[0] === 'recipe') {
      setShowRecipeSelector(true);
      return;
    }

    const prepCount = preparationsLength;
    const processLabels = selectedProcesses
      .map(id => processTypes[id]?.label || id)
      .join(' + ');

    const newPreparation = {
      title: `${prepCount + 1}º Etapa: ${processLabels}`,
      processes: selectedProcesses,
      ingredients: [],
      instructions: "",
      assembly_config: selectedProcesses.includes('assembly') ? {
        container_type: 'cuba',
        total_weight: '',
        units_quantity: '1',
        notes: ''
      } : undefined
    };

    onAddPreparation(newPreparation);
    setSelectedProcesses([]);
    onClose();
  }, [selectedProcesses, preparationsLength, onAddPreparation, onClose]);

  const handleSelectRecipe = useCallback((recipeData) => {
    const prepCount = preparationsLength;

    const newPreparation = {
      title: `${prepCount + 1}º Etapa: ${recipeData.name}`,
      processes: ['recipe'],
      ingredients: [],
      recipes: [{
        ...recipeData,
        // Garantir que tem os campos necessários para RecipeRow
        id: recipeData.id,
        name: recipeData.name,
        yield_weight: recipeData.yield_weight,
        cost_per_kg_yield: recipeData.cost_per_kg_yield,
        used_weight: '', // Campo vazio para o usuário preencher
        isRecipe: true,
        type: 'recipe'
      }],
      instructions: "",
    };

    onAddPreparation(newPreparation);
    setShowRecipeSelector(false);
    setSelectedProcesses([]);
    onClose();
  }, [preparationsLength, onAddPreparation, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Só mostrar o ProcessCreatorModal quando RecipeSelectorModal não está aberto */}
      {!showRecipeSelector && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <CookingPot className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Criar Nova Etapa de Processo</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Selecione os Processos Desejados
                </Label>
                <div className="space-y-2">
                  {Object.values(processTypes)
                    .sort((a, b) => a.order - b.order)
                    .map(process => (
                      <label key={process.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedProcesses.includes(process.id)}
                          onChange={(e) => handleProcessToggle(process.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-${process.color}-600`}>
                          {process.label}
                        </span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="bg-sky-50 p-3 rounded-md border border-sky-100">
                <p className="text-xs text-sky-700">
                  {selectedProcesses.length === 1 && selectedProcesses[0] === 'recipe'
                    ? 'Ao clicar em "Criar Etapa", você poderá selecionar uma receita existente'
                    : 'As colunas na tabela seguirão a ordem: Descongelamento → Limpeza → Cocção → Porcionamento'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleCreateProcess}
                disabled={selectedProcesses.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {selectedProcesses.length === 1 && selectedProcesses[0] === 'recipe'
                  ? 'Selecionar Receita'
                  : 'Criar Etapa'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de seleção de receitas */}
      <RecipeSelectorModal
        isOpen={showRecipeSelector}
        onClose={() => setShowRecipeSelector(false)}
        onSelectRecipe={handleSelectRecipe}
        currentRecipeId={currentRecipeId}
      />
    </>
  );
});

export default ProcessCreatorModal;
