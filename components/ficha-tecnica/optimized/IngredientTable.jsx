import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AssemblySubComponents from '../AssemblySubComponents';
import IngredientRow from './IngredientRow';
import { processTypes } from '@/lib/recipeConstants';

const IngredientTable = ({
  prep,
  prepIndex,
  onOpenIngredientModal,
  onOpenAddAssemblyItemModal,
  onUpdatePreparation,
  ...rest
}) => {
  const processes = prep.processes || [];
  const hasProcess = (processName) => processes.includes(processName);
  const ingredients = prep.ingredients || [];

  const isAssemblyOnly = hasProcess('assembly') &&
    !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking');

  const isPortioningOnly = hasProcess('portioning') &&
    !hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && !hasProcess('assembly');

  if (isAssemblyOnly || isPortioningOnly) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenAddAssemblyItemModal(prepIndex)}
            className={`border-dashed transition-all duration-200 ${isAssemblyOnly ? 'border-indigo-300 text-indigo-600 hover:bg-indigo-50' :
              'border-teal-300 text-teal-600 hover:bg-teal-50'
              }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isAssemblyOnly ? 'Adicionar Preparo/Receita' : 'Adicionar Produto para Porcionar'}
          </Button>
        </div>

        <AssemblySubComponents
          subComponents={prep.sub_components || []}
          onUpdateSubComponents={(components) => {
            onUpdatePreparation(prepIndex, 'sub_components', components);
          }}
          preparationsData={rest.preparations}
          assemblyConfig={prep.assembly_config || {}}
          onAssemblyConfigChange={(field, value) => {
            const newConfig = { ...prep.assembly_config, [field]: value };
            onUpdatePreparation(prepIndex, 'assembly_config', newConfig);
          }}
          totalYieldWeight={prep.total_yield_weight_prep || 0}
          onRemoveSubComponent={(index) => {
            const newSubComponents = [...prep.sub_components];
            newSubComponents.splice(index, 1);
            onUpdatePreparation(prepIndex, 'sub_components', newSubComponents);
          }}
        />

        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">
            Modo de Preparo desta Etapa
          </label>
          <textarea
            value={prep.instructions || ''}
            onChange={(e) => {
              onUpdatePreparation(prepIndex, 'instructions', e.target.value);
            }}
            placeholder="Descreva o modo de preparo desta etapa..."
            className="w-full p-3 border border-gray-200 rounded-lg resize-none min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    );
  }

  const processColors = {
    'defrosting': { bg: 'bg-blue-50/50', text: 'text-blue-600' },
    'cleaning': { bg: 'bg-green-50/50', text: 'text-green-600' },
    'cooking': { bg: 'bg-orange-50/50', text: 'text-orange-600' },
    'portioning': { bg: 'bg-teal-50/50', text: 'text-teal-600' }
  };

  const orderedActiveProcesses = ['defrosting', 'cleaning', 'cooking', 'portioning']
    .filter(p => hasProcess(p));

  if (ingredients.length === 0 && prep.sub_components?.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-500 mb-3">
          Nenhum ingrediente adicionado ainda
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenIngredientModal(prepIndex)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Ingrediente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenIngredientModal(prepIndex)}
          className="border-dashed hover:bg-blue-50 hover:border-blue-200 transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Ingrediente
        </Button>
      </div>

      <div className="bg-white rounded-xl overflow-x-auto shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead colSpan="3" className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center border-b">
                Dados Ingrediente
              </TableHead>
              {orderedActiveProcesses.map(processId => {
                const processInfo = processTypes[processId];
                const colors = processColors[processId] || { bg: 'bg-gray-50/50', text: 'text-gray-600' };
                let colSpan = 2;

                if (processId === 'defrosting') {
                  colSpan = 3;
                } else if (processId === 'cleaning') {
                  colSpan = hasProcess('defrosting') ? 3 : 3;
                } else if (processId === 'cooking') {
                  colSpan = 3;
                } else if (processId === 'portioning') {
                  if (!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking')) {
                    colSpan = 3;
                  } else {
                    colSpan = 2;
                  }
                }

                return (
                  <TableHead
                    key={processId}
                    colSpan={colSpan}
                    className={`px-4 py-2 ${colors.bg} font-medium ${colors.text} text-center border-b`}
                  >
                    {processInfo.label}
                  </TableHead>
                );
              })}
              <TableHead colSpan="2" className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center border-b">
                Dados Rendimento
              </TableHead>
            </TableRow>

            <TableRow>
              <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-left whitespace-nowrap">
                Ingrediente
              </TableHead>
              <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">
                Preço/kg (Bruto)
              </TableHead>
              <TableHead className="px-4 py-2 bg-emerald-50/50 font-medium text-emerald-600 text-center whitespace-nowrap">
                Preço/kg (Líquido)
              </TableHead>

              {hasProcess('defrosting') && (
                <>
                  <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                    Peso Congelado
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                    Peso Resfriado
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-blue-50/50 font-medium text-blue-600 text-center whitespace-nowrap">
                    Perda Desc.(%)
                  </TableHead>
                </>
              )}

              {hasProcess('cleaning') && (
                <>
                  {!hasProcess('defrosting') && (
                    <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                      Peso Bruto (Limpeza)
                    </TableHead>
                  )}
                  {hasProcess('defrosting') && (
                    <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                      Peso Entrada (Limpeza)
                    </TableHead>
                  )}
                  <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                    Pós Limpeza
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-green-50/50 font-medium text-green-600 text-center whitespace-nowrap">
                    Perda Limpeza(%)                  </TableHead>
                </>
              )}

              {hasProcess('cooking') && (
                <>
                  <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                    Pré Cocção
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                    Pós Cocção
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-orange-50/50 font-medium text-orange-600 text-center whitespace-nowrap">
                    Perda Cocção(%)                  </TableHead>
                </>
              )}

              {hasProcess('portioning') && (
                <>
                  {!hasProcess('defrosting') && !hasProcess('cleaning') && !hasProcess('cooking') && (
                    <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                      Peso Bruto (Porc.)
                    </TableHead>
                  )}
                  <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                    Pós Porcionamento
                  </TableHead>
                  <TableHead className="px-4 py-2 bg-teal-50/50 font-medium text-teal-600 text-center whitespace-nowrap">
                    Perda Porcion.(%)                  </TableHead>
                </>
              )}

              <TableHead className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center whitespace-nowrap">
                Rendimento(%)
              </TableHead>
              <TableHead className="px-4 py-2 bg-purple-50/50 font-medium text-purple-600 text-center">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {ingredients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="h-8 w-8 text-gray-400" />
                    <span>Nenhum ingrediente adicionado</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              ingredients.map((ingredient, ingredientIndex) =>
                <IngredientRow key={ingredient.id || ingredientIndex} ingredient={ingredient} prepIndex={prepIndex} ingredientIndex={ingredientIndex} prep={prep} {...rest} />
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default React.memo(IngredientTable);
