import React, { useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { CookingPot, Trash2 } from "lucide-react";
import { formatCurrency, formatWeight } from '@/lib/formatUtils';

/**
 * Componente para exibir uma receita como linha na tabela de ingredientes
 * Mostra apenas o último processo da receita (output final)
 */
const RecipeRow = ({
  recipe,
  prepIndex,
  recipeIndex,
  prep,
  onUpdateRecipe,
  onRemoveRecipe,
}) => {
  const processes = prep.processes || [];
  const hasProcess = (processName) => processes.includes(processName);

  const parseNumericValue = (value) => {
    if (!value) return 0;
    const cleaned = String(value).replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Determinar qual é o último processo ativo na preparação
  const lastActiveProcess = useMemo(() => {
    const processOrder = ['defrosting', 'cleaning', 'cooking', 'portioning'];
    const activeProcesses = processOrder.filter(p => hasProcess(p));
    return activeProcesses[activeProcesses.length - 1] || null;
  }, [prep.processes]);

  // Verificar se é apenas processo de receita (sem outros processos)
  const isRecipeOnly = useMemo(() => {
    return hasProcess('recipe') &&
           !hasProcess('defrosting') &&
           !hasProcess('cleaning') &&
           !hasProcess('cooking') &&
           !hasProcess('portioning');
  }, [prep.processes]);

  // Calcular o peso final da receita (yield_weight)
  const recipeFinalWeight = parseNumericValue(recipe.yield_weight);
  const recipeCostPerKgYield = parseNumericValue(recipe.cost_per_kg_yield);

  // Peso que será usado nesta etapa (pode ser editado)
  const usedWeight = parseNumericValue(recipe.used_weight || recipe.yield_weight);

  // Calcular custo baseado no peso usado
  const calculatedCost = usedWeight * recipeCostPerKgYield;

  const updateRecipeField = (field, value) => {
    onUpdateRecipe(
      prepIndex,
      recipeIndex,
      field,
      value
    );
  };

  // Renderizar colunas para todos os processos ativos
  const renderAllProcessColumns = () => {
    // Renderizar colunas vazias para processos anteriores ao último
    const processOrder = ['defrosting', 'cleaning', 'cooking', 'portioning'];
    const activeProcesses = processOrder.filter(p => hasProcess(p));

    return activeProcesses.map((processId, idx) => {
      const isLastProcess = idx === activeProcesses.length - 1;

      switch (processId) {
        case 'defrosting':
          // 3 colunas: Peso Congelado, Peso Resfriado, Perda
          return (
            <React.Fragment key={processId}>
              <TableCell className="px-4 py-2 bg-blue-50/20">
                <div className="text-xs text-center text-gray-400">-</div>
              </TableCell>
              {isLastProcess ? (
                <TableCell className="px-4 py-2">
                  <Input
                    type="text"
                    value={recipe.used_weight || ''}
                    onChange={(e) => updateRecipeField('used_weight', e.target.value)}
                    placeholder="0,000"
                    className="w-24 h-8 text-center text-xs bg-purple-50"
                    title="Peso desta receita usado nesta etapa"
                  />
                </TableCell>
              ) : (
                <TableCell className="px-4 py-2 bg-blue-50/20">
                  <div className="text-xs text-center text-gray-400">-</div>
                </TableCell>
              )}
              <TableCell className="text-center px-4 py-2 bg-blue-50/20">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  0.0%
                </Badge>
              </TableCell>
            </React.Fragment>
          );

        case 'cleaning':
          // 3 colunas: Peso Entrada/Bruto, Pós Limpeza, Perda
          const hasDefrosting = hasProcess('defrosting');
          return (
            <React.Fragment key={processId}>
              <TableCell className="px-4 py-2 bg-green-50/20">
                <div className="text-xs text-center text-gray-400">-</div>
              </TableCell>
              {isLastProcess ? (
                <TableCell className="px-4 py-2">
                  <Input
                    type="text"
                    value={recipe.used_weight || ''}
                    onChange={(e) => updateRecipeField('used_weight', e.target.value)}
                    placeholder="0,000"
                    className="w-24 h-8 text-center text-xs bg-purple-50"
                    title="Peso desta receita usado nesta etapa"
                  />
                </TableCell>
              ) : (
                <TableCell className="px-4 py-2 bg-green-50/20">
                  <div className="text-xs text-center text-gray-400">-</div>
                </TableCell>
              )}
              <TableCell className="text-center px-4 py-2 bg-green-50/20">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  0.0%
                </Badge>
              </TableCell>
            </React.Fragment>
          );

        case 'cooking':
          // 3 colunas: Pré Cocção, Pós Cocção, Perda
          return (
            <React.Fragment key={processId}>
              <TableCell className="px-4 py-2 bg-orange-50/20">
                <div className="text-xs text-center text-gray-400">-</div>
              </TableCell>
              {isLastProcess ? (
                <TableCell className="px-4 py-2">
                  <Input
                    type="text"
                    value={recipe.used_weight || ''}
                    onChange={(e) => updateRecipeField('used_weight', e.target.value)}
                    placeholder="0,000"
                    className="w-24 h-8 text-center text-xs bg-purple-50"
                    title="Peso desta receita usado nesta etapa"
                  />
                </TableCell>
              ) : (
                <TableCell className="px-4 py-2 bg-orange-50/20">
                  <div className="text-xs text-center text-gray-400">-</div>
                </TableCell>
              )}
              <TableCell className="text-center px-4 py-2 bg-orange-50/20">
                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                  0.0%
                </Badge>
              </TableCell>
            </React.Fragment>
          );

        case 'portioning':
          // 2 ou 3 colunas dependendo se tem outros processos
          const isPortioningOnly = !hasProcess('defrosting') &&
                                   !hasProcess('cleaning') &&
                                   !hasProcess('cooking');

          if (isPortioningOnly) {
            // 3 colunas: Peso Bruto, Pós Porcionamento, Perda
            return (
              <React.Fragment key={processId}>
                <TableCell className="px-4 py-2 bg-teal-50/20">
                  <div className="text-xs text-center text-gray-400">-</div>
                </TableCell>
                <TableCell className="px-4 py-2">
                  <Input
                    type="text"
                    value={recipe.used_weight || ''}
                    onChange={(e) => updateRecipeField('used_weight', e.target.value)}
                    placeholder="0,000"
                    className="w-24 h-8 text-center text-xs bg-purple-50"
                    title="Peso desta receita usado nesta etapa"
                  />
                </TableCell>
                <TableCell className="text-center px-4 py-2 bg-teal-50/20">
                  <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                    0.0%
                  </Badge>
                </TableCell>
              </React.Fragment>
            );
          } else {
            // 2 colunas: Pós Porcionamento, Perda
            return (
              <React.Fragment key={processId}>
                {isLastProcess ? (
                  <TableCell className="px-4 py-2">
                    <Input
                      type="text"
                      value={recipe.used_weight || ''}
                      onChange={(e) => updateRecipeField('used_weight', e.target.value)}
                      placeholder="0,000"
                      className="w-24 h-8 text-center text-xs bg-purple-50"
                      title="Peso desta receita usado nesta etapa"
                    />
                  </TableCell>
                ) : (
                  <TableCell className="px-4 py-2 bg-teal-50/20">
                    <div className="text-xs text-center text-gray-400">-</div>
                  </TableCell>
                )}
                <TableCell className="text-center px-4 py-2 bg-teal-50/20">
                  <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                    0.0%
                  </Badge>
                </TableCell>
              </React.Fragment>
            );
          }

        default:
          return null;
      }
    });
  };

  // Calcular preço/kg líquido (já é o cost_per_kg_yield da receita)
  const liquidPrice = recipeCostPerKgYield;

  return (
    <TableRow className="border-b border-gray-50 hover:bg-purple-50/30 bg-purple-50/10">
      {/* Nome da receita */}
      <TableCell className="font-medium px-4 py-2">
        <span className="text-purple-800">{recipe.name}</span>
      </TableCell>

      {/* Preço bruto - na verdade é o yield da receita */}
      <TableCell className="text-center px-4 py-2">
        <span className="text-xs text-gray-500">
          {formatCurrency(recipeCostPerKgYield)}
        </span>
      </TableCell>

      {/* Preço líquido (igual ao bruto para receitas já processadas) */}
      <TableCell className="text-center px-4 py-2 font-medium">
        {formatCurrency(liquidPrice)}
      </TableCell>

      {/* Se é apenas processo de receita, adicionar coluna de peso usado */}
      {isRecipeOnly ? (
        <TableCell className="px-4 py-2 text-center" colSpan={1}>
          <Input
            type="text"
            value={recipe.used_weight || ''}
            onChange={(e) => updateRecipeField('used_weight', e.target.value)}
            placeholder="0,000"
            className="w-28 h-9 text-center text-sm bg-purple-50 border-purple-200 mx-auto"
            title="Peso desta receita usado nesta etapa"
          />
        </TableCell>
      ) : (
        /* Colunas de todos os processos ativos */
        renderAllProcessColumns()
      )}

      {/* Rendimento - sempre 100% para receitas */}
      <TableCell className="text-center px-4 py-2">
        <Badge variant="default" className="bg-purple-600">
          100%
        </Badge>
      </TableCell>

      {/* Ações */}
      <TableCell className="px-4 py-2">
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveRecipe(prepIndex, recipeIndex)}
            className="h-7 w-7 rounded-full hover:bg-red-50"
            title="Remover receita"
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(RecipeRow);
