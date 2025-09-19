import React, { useCallback } from 'react';
import RecipeCalculator from '@/lib/recipeCalculator';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Trash2 } from "lucide-react";
import { formatWeight, formatCurrency, parseNumericValue } from "@/lib/formatUtils";

const AssemblySubComponents = ({
  subComponents = [],
  onUpdateSubComponents,
  preparationsData = [],
  assemblyConfig = {},
  onAssemblyConfigChange,
  totalYieldWeight = 0,
  onRemoveSubComponent,
  showAssemblyConfig = false
}) => {
  
  // Calculate total assembly weight from sub-components
  const calculateTotalWeight = useCallback((components) => {
    if (!components || components.length === 0) return 0;
    
    return components.reduce((total, sc) => {
      const weight = parseNumericValue(sc.assembly_weight_kg) || 0;
      return total + weight;
    }, 0);
  }, []);

  // Handle weight change for individual sub-components
  const handleWeightChange = useCallback((subComponentId, newWeight) => {
    const updatedComponents = subComponents.map(sc => {
      if (sc.id === subComponentId) {
        return { ...sc, assembly_weight_kg: newWeight };
      }
      return sc;
    });
    
    onUpdateSubComponents(updatedComponents);
  }, [subComponents, onUpdateSubComponents]);

  const totalAssemblyWeight = calculateTotalWeight(subComponents);

  // Empty state when no sub-components
  if (!subComponents || subComponents.length === 0) {
    return (
      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100 text-center">
        <div className="flex flex-col items-center gap-3">
          <Layers className="h-10 w-10 text-indigo-500" />
          <h3 className="text-lg font-medium text-indigo-800">
            Adicione Componentes de Montagem
          </h3>
          <p className="text-indigo-600 max-w-md mx-auto">
            Clique em "+ Adicionar Preparo/Receita" para incluir etapas anteriores 
            ou receitas externas nesta montagem.
          </p>
        </div>
      </div>
    );
  }

  // Calculate proportional costs and percentages for each component
  
  const componentsWithCalculations = subComponents.map((sc, index) => {
    const componentWeightNumeric = parseNumericValue(sc.assembly_weight_kg) || 0;
    const percentage = totalAssemblyWeight > 0 ? (componentWeightNumeric / totalAssemblyWeight) * 100 : 0;
    
    let proportionalCost = 0;
    
    const sourcePrep = preparationsData.find(p => p.id === sc.source_id);

    if (sourcePrep) {
      // Recalcula as métricas da preparação dinamicamente para obter os valores mais recentes
      const sourceMetrics = RecipeCalculator.calculatePreparationMetrics(sourcePrep, preparationsData);
      let sourceYieldWeight = sourceMetrics.totalYieldWeight;
      let sourceTotalCost = sourceMetrics.totalCost;

      // PATCH: Se o custo da preparação for zero, verifique se é um ingrediente simples.
      // Isso corrige o problema de ingredientes (ex: Mussarela) adicionados como "Etapas" sem custo.
      if (sourceTotalCost === 0 && sourcePrep.ingredients?.length === 1 && (!sourcePrep.sub_components || sourcePrep.sub_components.length === 0)) {
        const singleIngredient = sourcePrep.ingredients[0];
        const unitPrice = RecipeCalculator.getUnitPrice(singleIngredient);
        
        if (unitPrice > 0) {
          // Usa o preço do ingrediente para calcular o custo proporcional
          proportionalCost = componentWeightNumeric * unitPrice;
        }
      } else {
         if (sourceYieldWeight > 0) {
          proportionalCost = (componentWeightNumeric / sourceYieldWeight) * sourceTotalCost;
        } else {
          proportionalCost = 0; // Evita divisão por zero e usa 0 se não houver rendimento
        }
      }
    } else { // This 'else' block is for when sourcePrep is NOT found (i.e., it's not a preparation)
      // External recipe or fresh ingredient
      const inputYieldWeightNumeric = parseNumericValue(sc.input_yield_weight) || 0;
      const inputTotalCostNumeric = parseNumericValue(sc.input_total_cost) || 0;

      // Handle raw ingredients added directly to assembly
      if (sc.type === 'ingredient' && sc.current_price) {
        proportionalCost = componentWeightNumeric * parseNumericValue(sc.current_price);
      } else if (inputYieldWeightNumeric > 0) {
          proportionalCost = (componentWeightNumeric / inputYieldWeightNumeric) * inputTotalCostNumeric;
      } else {
          proportionalCost = inputTotalCostNumeric; // Fallback if no yield weight
      }
    }

    return {
      ...sc,
      percentage,
      proportionalCost,
      componentWeightNumeric
    };
  });

  const totalCost = componentsWithCalculations.reduce((sum, sc) => sum + (sc.proportionalCost || 0), 0);

  return (
    <div className="space-y-4">
      {/* Assembly Configuration */}
      {showAssemblyConfig && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
          <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
            <Layers className="h-5 w-5 mr-2" />
            Configuração do Porcionamento
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-indigo-700">
                Tipo de Porcionamento
              </Label>
              <Select
                value={assemblyConfig.container_type || 'cuba'}
                onValueChange={(value) => onAssemblyConfigChange('container_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cupa-p">Cupa P</SelectItem>
                  <SelectItem value="cuba-g">Cuba G</SelectItem>
                  <SelectItem value="descartavel">Embalagem Descartável</SelectItem>
                  <SelectItem value="Unid.">Porção Individual</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                  <SelectItem value="Porção">Porção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-indigo-700">
                Peso Total (kg)
              </Label>
              <Input
                type="text"
                value={String(totalAssemblyWeight).replace('.', ',')}
                readOnly
                className="text-center bg-gray-50 cursor-not-allowed"
                title="Este peso é calculado automaticamente a partir dos componentes da montagem."
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium text-indigo-700">
                Quantidade de Unidades
              </Label>
              <Input
                type="text"
                value={assemblyConfig.units_quantity || ''}
                onChange={(e) => onAssemblyConfigChange('units_quantity', e.target.value)}
                placeholder="1"
                className="text-center"
              />
            </div>
          </div>
          
          <div className="mt-3">
            <Label className="text-sm font-medium text-indigo-700">
              Observações do Porcionamento
            </Label>
            <Textarea
              value={assemblyConfig.notes || ''}
              onChange={(e) => onAssemblyConfigChange('notes', e.target.value)}
              placeholder="Ex: Escondidinho - 1,6kg de massa + 0,4kg de recheio"
              className="h-20 resize-none"
            />
          </div>
        </div>
      )}

      {/* Sub-Components Table */}
      <div className="bg-white rounded-xl overflow-x-auto shadow-lg">
        <div className="bg-indigo-50 px-4 py-3 border-b rounded-t-xl">
          <h5 className="font-semibold text-indigo-800">Componentes da Montagem</h5>
          <p className="text-sm text-indigo-600 mt-1">
            Defina o peso específico de cada componente que será usado nesta montagem
          </p>
        </div>
        
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-left">
                Componente
              </th>
              <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">
                Peso na Montagem
              </th>
              <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">
                % do Total
              </th>
              <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">
                Custo Proporcional
              </th>
              <th className="px-4 py-3 bg-indigo-50/50 font-medium text-indigo-600 text-center">
                Ações
              </th>
            </tr>
          </thead>
          
          <tbody>
            {componentsWithCalculations.map((sc, index) => (
              <tr key={sc.id || index} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-left min-w-[200px]">
                  <div className="font-medium">{sc.name}</div>
                  <Badge 
                    variant="outline" 
                    className={`w-fit text-xs mt-1 ${
                      sc.type === 'recipe' 
                        ? 'border-green-300 text-green-700' 
                        : 'border-purple-300 text-purple-700'
                    }`}
                  >
                    {sc.type === 'recipe' ? 'Receita Externa' : 'Etapa Anterior'}
                  </Badge>
                </td>
                
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Input
                      type="text"
                      value={sc.assembly_weight_kg || ''}
                      onChange={(e) => handleWeightChange(sc.id, e.target.value)}
                      className="w-20 h-8 text-center text-xs"
                      placeholder="0,000"
                    />
                    <span className="text-xs text-gray-400">kg</span>
                  </div>
                </td>
                
                <td className="px-4 py-3 text-center">
                  <div className="font-medium text-indigo-600">
                    {sc.percentage.toFixed(1).replace('.', ',')}%
                  </div>
                </td>
                
                <td className="px-4 py-3 text-center">
                  <div className="font-medium text-green-600">
                    {formatCurrency(sc.proportionalCost)}
                  </div>
                </td>
                
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveSubComponent(index)}
                    className="h-7 w-7 rounded-full hover:bg-red-50"
                    title="Remover componente"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Assembly Summary */}
        <div className="bg-indigo-50 px-4 py-3 border-t rounded-b-xl">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-indigo-800">Total da Montagem:</span>
            <div className="flex gap-4">
              <span className="text-indigo-600">
                Peso: {formatWeight(totalAssemblyWeight * 1000)}
              </span>
              <span className="text-green-600 font-medium">
                Custo: {formatCurrency(totalCost)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssemblySubComponents;