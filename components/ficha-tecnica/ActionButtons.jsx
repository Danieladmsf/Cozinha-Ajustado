import React from 'react';
import { Button } from "@/components/ui";
import { Printer, ClipboardCheck, FilePlus, Save, Loader2, AlertCircle } from "lucide-react";
import ErrorBoundary from '../common/ErrorBoundary';
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';

export default function ActionButtons() {
  const { computed, actions } = useRecipeStore();
  const {
    isCalculating: isSaving,
    needsSave: hasUnsavedChanges,
    saveError,
    validationErrors = {},
    isFormValid,
  } = computed;

  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const canSave = !isSaving && isFormValid && !hasValidationErrors && hasUnsavedChanges;

  return (
    <ErrorBoundary fallbackTitle="Erro nos botões de ação">
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          variant="outline"
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
          disabled={isSaving}
        >
          <Printer className="h-4 w-4" />
          Ficha Técnica Completa
        </Button>

        <Button
          variant="outline"
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
          disabled={isSaving}
        >
          <ClipboardCheck className="h-4 w-4" />
          Ficha de Coleta
        </Button>

        <Button
          variant="outline"
          onClick={actions.clearRecipe}
          disabled={isSaving}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 gap-2"
        >
          <FilePlus className="h-4 w-4" />
          Nova Ficha
        </Button>

        <div className="flex-grow"></div>

        {hasUnsavedChanges && !isSaving && (
          <div className="flex items-center gap-1 text-orange-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Alterações não salvas</span>
          </div>
        )}

        {saveError && !isSaving && (
          <div className="flex items-center gap-1 text-red-600 text-sm max-w-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate" title={saveError}>
              {saveError}
            </span>
          </div>
        )}

        <Button
          onClick={actions.saveRecipe}
          disabled={!canSave}
          className={`shadow-sm gap-2 min-w-[140px] ${
            canSave
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={
            !isFormValid || hasValidationErrors
              ? 'Corrija os erros no formulário antes de salvar'
              : !hasUnsavedChanges
              ? 'Nenhuma alteração para salvar'
              : isSaving
              ? 'Salvando receita...'
              : 'Salvar ficha técnica'
          }
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Salvando...' : 'Salvar Ficha'}
        </Button>
      </div>
    </ErrorBoundary>
  );
}