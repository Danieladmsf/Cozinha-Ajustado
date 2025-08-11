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

const ProcessCreatorModal = React.memo(({
  isOpen,
  onClose,
  onAddPreparation,
  preparationsLength,
}) => {
  const [selectedProcesses, setSelectedProcesses] = useState([]);

  const handleProcessToggle = useCallback((processId, checked) => {
    setSelectedProcesses(prev =>
      checked ? [...prev, processId] : prev.filter((id) => id !== processId)
    );
  }, []);

  const handleCreateProcess = useCallback(() => {
    if (selectedProcesses.length === 0) return;

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
    onClose();
  }, [selectedProcesses, preparationsLength, onAddPreparation, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
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
              As colunas na tabela seguirão a ordem: Descongelamento → Limpeza → Cocção → Porcionamento
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
            Criar Etapa
          </Button>
        </div>
      </div>
    </div>
  );
});

export default ProcessCreatorModal;
