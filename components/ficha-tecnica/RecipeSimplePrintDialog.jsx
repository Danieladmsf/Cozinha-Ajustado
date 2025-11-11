
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";
import { RecipeCalculator } from '@/components/utils/recipeCalculator';

// Constantes
const DEFAULT_CUBA_WEIGHT = 3.5;

// Componentes auxiliares
const AdjustmentTypeSelector = ({ value, onChange }) => (
  <div>
    <Label htmlFor="adjustment-type">Ajustar por</Label>
    <RadioGroup
      id="adjustment-type"
      value={value}
      onValueChange={onChange}
      className="grid grid-cols-2 gap-2 mt-2"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="yield_weight" id="yield_weight" />
        <Label htmlFor="yield_weight" className="cursor-pointer">Peso de Rendimento Total</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="cuba" id="cuba" />
        <Label htmlFor="cuba" className="cursor-pointer">Número de Cubas</Label>
      </div>
    </RadioGroup>
  </div>
);

const WeightInput = ({ value, onChange, label, placeholder }) => (
  <div className="space-y-2">
    <Label htmlFor="adjustment-value">{label}</Label>
    <Input
      id="adjustment-value"
      type="number"
      step="0.001"
      min="0.1"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(',', '.'))}
      placeholder={placeholder}
    />
  </div>
);

const CubaInputs = ({ count, weight, onCountChange, onWeightChange }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="cuba-count">Número de Cubas</Label>
      <Input
        id="cuba-count"
        type="number"
        min="1"
        step="1"
        value={count}
        onChange={(e) => onCountChange(e.target.value)}
        placeholder="Ex: 3"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="cuba-weight">Peso por Cuba (kg)</Label>
      <Input
        id="cuba-weight"
        type="number"
        step="0.1"
        min="0.5"
        value={weight}
        onChange={(e) => onWeightChange(e.target.value.replace(',', '.'))}
        placeholder="Ex: 3,5"
      />
    </div>
  </div>
);

// Funções utilitárias
const parseNumber = (value) => {
  if (!value && value !== 0) return 0;
  const num = parseFloat(String(value).replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

const formatWeight = (weight) => {
  if (!weight && weight !== 0) return "0,000 kg";
  return `${parseNumber(weight).toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })} kg`;
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return "R$ 0,00";
  return parseNumber(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

const formatPercent = (value) => {
  if (!value && value !== 0) return "0,00%";
  return `${parseNumber(value).toFixed(2).replace('.', ',')}%`;
};

// Função para calcular dados ajustados - CORRIGIDA
const calculateAdjustedRecipeData = (recipe, preparations, adjustmentFactor) => {
  const adjustedData = {
    totalRawWeight: 0,
    totalYieldWeight: 0,
    totalCost: 0,
    processes: []
  };

  preparations.forEach(prep => {
    const adjustedProcess = {
      id: prep.id,
      title: prep.title,
      instructions: prep.instructions || "Não especificado",
      ingredients: [],
      subComponents: []
    };

    // Processar ingredientes
    if (prep.ingredients && prep.ingredients.length > 0) {
      prep.ingredients.forEach(ing => {
        // LÓGICA CORRIGIDA: Identificar peso bruto inicial
        // Prioridade de pesos para determinar o peso bruto:
        // 1. weight_frozen (se existir e > 0)
        // 2. weight_raw (se existir e > 0)
        // 3. weight_pre_cooking (para ingredientes que entram direto na cocção)
        // 4. quantity (fallback)
        let rawWeight = 0;

        if (parseNumber(ing.weight_frozen) > 0) {
          rawWeight = parseNumber(ing.weight_frozen);
        } else if (parseNumber(ing.weight_raw) > 0) {
          rawWeight = parseNumber(ing.weight_raw);
        } else if (parseNumber(ing.weight_pre_cooking) > 0) {
          rawWeight = parseNumber(ing.weight_pre_cooking);
        } else if (parseNumber(ing.quantity) > 0) {
          rawWeight = parseNumber(ing.quantity);
        }

        // Se ainda não encontrou peso bruto, usar o primeiro peso disponível
        if (rawWeight === 0) {
          rawWeight = parseNumber(ing.weight_thawed) ||
                     parseNumber(ing.weight_clean) ||
                     parseNumber(ing.weight_cooked) ||
                     parseNumber(ing.weight_portioned) || 0;
        }

        const adjustedRawWeight = rawWeight * adjustmentFactor;

        // Calcular pesos intermediários baseados nos dados originais da ficha técnica
        const originalWeightFrozen = parseNumber(ing.weight_frozen) || rawWeight;
        const originalWeightThawed = parseNumber(ing.weight_thawed) || originalWeightFrozen;
        const originalWeightClean = parseNumber(ing.weight_clean) || originalWeightThawed;
        const originalWeightPreCooking = parseNumber(ing.weight_pre_cooking) || originalWeightClean;
        const originalWeightCooked = parseNumber(ing.weight_cooked) || originalWeightPreCooking;
        const originalWeightPortioned = parseNumber(ing.weight_portioned) || originalWeightCooked;

        // Calcular percentuais de perda baseados nos pesos originais
        const thawingLoss = originalWeightFrozen > 0 ?
          ((originalWeightFrozen - originalWeightThawed) / originalWeightFrozen) * 100 : 0;
        const cleaningLoss = originalWeightThawed > 0 ?
          ((originalWeightThawed - originalWeightClean) / originalWeightThawed) * 100 : 0;
        const cookingLoss = originalWeightPreCooking > 0 ?
          ((originalWeightPreCooking - originalWeightCooked) / originalWeightPreCooking) * 100 : 0;

        // Peso final (rendimento) - usar o último peso disponível na cadeia
        let finalWeightOriginal = originalWeightPortioned || originalWeightCooked || originalWeightPreCooking || originalWeightClean || originalWeightThawed || rawWeight;
        const adjustedFinalWeight = finalWeightOriginal * adjustmentFactor;

        // Rendimento total do ingrediente
        const totalYieldPercent = rawWeight > 0 ? (finalWeightOriginal / rawWeight) * 100 : 100;
        const totalLossPercent = 100 - totalYieldPercent;

        // Preços e custos
        const brutoPricePerKg = parseNumber(ing.current_price) || parseNumber(ing.unit_price) || 0;
        const liquidoPricePerKg = totalYieldPercent > 0 ? brutoPricePerKg / (totalYieldPercent / 100) : brutoPricePerKg;
        const totalCost = adjustedRawWeight * brutoPricePerKg;

        adjustedProcess.ingredients.push({
          name: ing.name,
          rawWeight: adjustedRawWeight,
          finalWeight: adjustedFinalWeight,
          totalLossPercent,
          thawingLossPercent: thawingLoss,
          cleaningLossPercent: cleaningLoss,
          cookingLossPercent: cookingLoss,
          totalYieldPercent,
          brutoPricePerKg,
          liquidoPricePerKg,
          totalCost
        });

        adjustedData.totalRawWeight += adjustedRawWeight;
        adjustedData.totalYieldWeight += adjustedFinalWeight;
        adjustedData.totalCost += totalCost;
      });
    }

    // Processar sub-componentes (porcionamento/montagem)
    if (prep.sub_components && prep.sub_components.length > 0) {
      prep.sub_components.forEach(sub => {
        const inputWeight = parseNumber(sub.input_yield_weight) * adjustmentFactor;
        const outputWeight = parseNumber(sub.weight_portioned) * adjustmentFactor;
        const lossPercent = inputWeight > 0 ? ((inputWeight - outputWeight) / inputWeight) * 100 : 0;
        const yieldPercent = 100 - lossPercent;
        const cost = parseNumber(sub.input_total_cost) * adjustmentFactor;

        adjustedProcess.subComponents.push({
          name: sub.name,
          inputWeight,
          outputWeight,
          lossPercent,
          yieldPercent,
          cost
        });
      });
    }

    adjustedData.processes.push(adjustedProcess);
  });

  return adjustedData;
};

// CSS para impressão
const printStyles = `
  @page {
    margin: 8mm;
    size: A4 portrait;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.2;
    margin: 0;
    padding: 0;
    color: #2d3748;
    font-size: 8pt;
    background: #fff;
  }

  .recipe-header {
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 8px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .recipe-title {
    font-size: 14pt;
    font-weight: 700;
    color: #2d3748;
  }

  .recipe-subtitle {
    font-size: 9pt;
    color: #718096;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .info-item {
    background: white;
    padding: 6px;
    text-align: center;
  }

  .info-label {
    font-size: 7pt;
    color: #718096;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 2px;
    line-height: 1.1;
  }

  .info-value {
    font-size: 8pt;
    font-weight: 600;
    color: #2d3748;
  }

  .process-section {
    margin-bottom: 16px;
    page-break-inside: avoid;
  }

  .process-title {
    font-size: 10pt;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #e2e8f0;
  }

  .ingredients-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 7pt;
    background: white;
    border: 1px solid #e2e8f0;
  }

  .ingredients-table th {
    background: #f7fafc;
    padding: 4px 2px;
    text-align: center;
    font-weight: 600;
    font-size: 6pt;
    color: #4a5568;
    border: 1px solid #e2e8f0;
    line-height: 1.1;
  }

  .ingredients-table td {
    padding: 4px 2px;
    text-align: center;
    border: 1px solid #e2e8f0;
    font-size: 7pt;
    line-height: 1.1;
  }

  .ingredients-table .ingredient-name {
    text-align: left;
    font-weight: 500;
    max-width: 80px;
  }

  .group-header {
    background: #edf2f7 !important;
    font-weight: 600;
    font-size: 6pt;
    color: #4a5568;
  }

  .sub-header {
    font-size: 5pt;
    line-height: 1;
    color: #718096;
  }

  .instructions {
    margin-top: 8px;
    padding: 6px;
    background: #f7fafc;
    border-left: 3px solid #4299e1;
    border-radius: 0 4px 4px 0;
  }

  .instructions-title {
    font-size: 7pt;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 2px;
  }

  .instructions-text {
    font-size: 7pt;
    color: #2d3748;
    line-height: 1.3;
  }

  .footer {
    margin-top: 16px;
    text-align: center;
    font-size: 6pt;
    color: #718096;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
  }

  /* Cores para percentuais */
  .loss-high { color: #e53e3e; font-weight: 600; }
  .loss-medium { color: #d69e2e; font-weight: 600; }
  .loss-low { color: #38a169; font-weight: 600; }

  /* Cores para rendimento */
  .yield-high { color: #38a169; font-weight: 600; }
  .yield-medium { color: #d69e2e; font-weight: 600; }
  .yield-low { color: #e53e3e; font-weight: 600; }
`;

export default function RecipeSimplePrintDialog({
  recipe,
  preparations = [],
  isOpen,
  onClose
}) {
  const [adjustmentType, setAdjustmentType] = useState("yield_weight");
  const [adjustmentValue, setAdjustmentValue] = useState(
    recipe?.yield_weight ? String(parseNumber(recipe.yield_weight).toFixed(3)) : "1.000"
  );
  const [cubaCountForAdjustment, setCubaCountForAdjustment] = useState("1");
  const [cubaWeightForAdjustment, setCubaWeightForAdjustment] = useState(
    recipe?.cuba_weight ? String(parseNumber(recipe.cuba_weight).toFixed(3)) : String(DEFAULT_CUBA_WEIGHT.toFixed(3))
  );

  useEffect(() => {
    if (recipe?.yield_weight && adjustmentType === "yield_weight") {
      setAdjustmentValue(String(parseNumber(recipe.yield_weight).toFixed(3)));
    }
  }, [recipe, adjustmentType]);

  const handlePrint = () => {
    if (!recipe || !preparations.length) {
      console.error("Dados insuficientes para gerar a receita");
      return;
    }

    // Calcular fator de ajuste
    let adjustmentFactor = 1;
    let targetYieldWeight = parseNumber(recipe.yield_weight);

    if (adjustmentType === "yield_weight") {
      const inputYieldWeight = parseNumber(adjustmentValue);
      if (inputYieldWeight > 0 && targetYieldWeight > 0) {
        adjustmentFactor = inputYieldWeight / targetYieldWeight;
        targetYieldWeight = inputYieldWeight;
      }
    } else if (adjustmentType === "cuba") {
      const cubaCount = parseNumber(cubaCountForAdjustment);
      const cubaWeight = parseNumber(cubaWeightForAdjustment);
      if (cubaCount > 0 && cubaWeight > 0 && targetYieldWeight > 0) {
        const totalCubaWeight = cubaCount * cubaWeight;
        adjustmentFactor = totalCubaWeight / targetYieldWeight;
        targetYieldWeight = totalCubaWeight;
      }
    }

    // Calcular dados ajustados
    const adjustedData = calculateAdjustedRecipeData(recipe, preparations, adjustmentFactor);
    const costPerKgYield = adjustedData.totalYieldWeight > 0 ? adjustedData.totalCost / adjustedData.totalYieldWeight : 0;

    // Gerar HTML
    const currentDate = format(new Date(), "dd/MM/yyyy", { locale: ptBR });

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receita - ${recipe.name}</title>
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="recipe-header">
          <div class="recipe-title">Receita - ${recipe.name}</div>
          <div class="recipe-subtitle">Ajustado para: Rendimento de ${formatWeight(targetYieldWeight)}</div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">DATA</div>
            <div class="info-value">${currentDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">CATEGORIA</div>
            <div class="info-value">${recipe.category || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">TEMPO DE PREPARO</div>
            <div class="info-value">${recipe.prep_time || 0} min</div>
          </div>
          <div class="info-item">
            <div class="info-label">PESO BRUTO</div>
            <div class="info-value">${formatWeight(adjustedData.totalRawWeight)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">RENDIMENTO</div>
            <div class="info-value">${formatWeight(adjustedData.totalYieldWeight)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">CUSTO/KG REND.</div>
            <div class="info-value">${formatCurrency(costPerKgYield)}</div>
          </div>
        </div>
    `;

    // Gerar seções de processo
    adjustedData.processes.forEach(process => {
      htmlContent += `<div class="process-section">`;
      htmlContent += `<div class="process-title">${process.title}</div>`;

      // Tabela de ingredientes (se houver)
      if (process.ingredients.length > 0) {
        htmlContent += `
          <table class="ingredients-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 80px;">INGREDIENTE</th>
                <th colspan="2" class="group-header">QUANTIDADES</th>
                <th colspan="4" class="group-header">PERDAS (%)</th>
                <th rowspan="2" class="group-header">RENDIMENTO (%)<br><span class="sub-header">Final Ing.</span></th>
                <th rowspan="2" class="group-header">PREÇO/KG<br><span class="sub-header">(BRUTO)</span></th>
                <th rowspan="2" class="group-header">PREÇO/KG<br><span class="sub-header">(LÍQUIDO)</span></th>
                <th rowspan="2" class="group-header">CUSTO</th>
              </tr>
              <tr>
                <th class="sub-header">Peso Bruto<br>(Compra)</th>
                <th class="sub-header">Peso Rend.<br>(Etapa)</th>
                <th class="sub-header">Total Ing.</th>
                <th class="sub-header">Descong.</th>
                <th class="sub-header">Limpeza</th>
                <th class="sub-header">Cocção</th>
              </tr>
            </thead>
            <tbody>
        `;

        process.ingredients.forEach(ing => {
          const lossClass = ing.totalLossPercent > 20 ? 'loss-high' : ing.totalLossPercent > 10 ? 'loss-medium' : 'loss-low';
          const yieldClass = ing.totalYieldPercent >= 80 ? 'yield-high' : ing.totalYieldPercent >= 60 ? 'yield-medium' : 'yield-low';

          htmlContent += `
            <tr>
              <td class="ingredient-name">${ing.name}</td>
              <td>${formatWeight(ing.rawWeight)}</td>
              <td>${formatWeight(ing.finalWeight)}</td>
              <td class="${lossClass}">${formatPercent(ing.totalLossPercent)}</td>
              <td class="${lossClass}">${formatPercent(ing.thawingLossPercent)}</td>
              <td class="${lossClass}">${formatPercent(ing.cleaningLossPercent)}</td>
              <td class="${lossClass}">${formatPercent(ing.cookingLossPercent)}</td>
              <td class="${yieldClass}">${formatPercent(ing.totalYieldPercent)}</td>
              <td>${formatCurrency(ing.brutoPricePerKg)}</td>
              <td>${formatCurrency(ing.liquidoPricePerKg)}</td>
              <td>${formatCurrency(ing.totalCost)}</td>
            </tr>
          `;
        });

        htmlContent += `
            </tbody>
          </table>
        `;
      }

      // Tabela de sub-componentes (porcionamento/montagem)
      if (process.subComponents.length > 0) {
        htmlContent += `
          <table class="ingredients-table">
            <thead>
              <tr>
                <th style="width: 120px;">ITEM (PREPARO DE ENTRADA)</th>
                <th colspan="2" class="group-header">QUANTIDADES</th>
                <th colspan="2" class="group-header">RENDIMENTO (%)</th>
                <th rowspan="2" class="group-header">CUSTO</th>
              </tr>
              <tr>
                <th></th>
                <th class="sub-header">Peso Entrada (Rend.)</th>
                <th class="sub-header">Peso Pós Processo</th>
                <th class="sub-header">Perca</th>
                <th class="sub-header">Final</th>
              </tr>
            </thead>
            <tbody>
        `;

        process.subComponents.forEach(sub => {
          const lossClass = sub.lossPercent > 10 ? 'loss-high' : sub.lossPercent > 5 ? 'loss-medium' : 'loss-low';
          const yieldClass = sub.yieldPercent >= 95 ? 'yield-high' : sub.yieldPercent >= 90 ? 'yield-medium' : 'yield-low';

          htmlContent += `
            <tr>
              <td class="ingredient-name">${sub.name}</td>
              <td>${formatWeight(sub.inputWeight)}</td>
              <td>${formatWeight(sub.outputWeight)}</td>
              <td class="${lossClass}">${formatPercent(sub.lossPercent)}</td>
              <td class="${yieldClass}">${formatPercent(sub.yieldPercent)}</td>
              <td>${formatCurrency(sub.cost)}</td>
            </tr>
          `;
        });

        htmlContent += `
            </tbody>
          </table>
        `;
      }

      // Instruções
      htmlContent += `
        <div class="instructions">
          <div class="instructions-title">MODO DE PREPARO DESTA ETAPA:</div>
          <div class="instructions-text">${process.instructions}</div>
        </div>
      `;

      htmlContent += `</div>`;
    });

    htmlContent += `
        <div class="footer">
          Ficha técnica gerada por Cozinha e Afeto - ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </div>
      </body>
      </html>
    `;

    // Abrir em nova janela e imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    } else {
      console.error("Não foi possível abrir a janela de impressão");
    }
  };

  if (!recipe) {
    return null;
  }

  const originalYieldWeight = parseNumber(recipe.yield_weight);
  const originalCostPerKg = parseNumber(recipe.cost_per_kg_yield);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Configurar Impressão da Receita</h2>
            <p className="text-sm text-gray-600">
              Ajuste a receita <strong>{recipe.name}</strong> para a quantidade desejada.
              O sistema calculará os pesos brutos necessários e as perdas proporcionais.
            </p>
          </div>

          <AdjustmentTypeSelector
            value={adjustmentType}
            onChange={setAdjustmentType}
          />

          {adjustmentType === "yield_weight" ? (
            <WeightInput
              value={adjustmentValue}
              onChange={setAdjustmentValue}
              label="Peso de Rendimento Total Desejado (kg)"
              placeholder="Ex: 9,000"
            />
          ) : (
            <CubaInputs
              count={cubaCountForAdjustment}
              weight={cubaWeightForAdjustment}
              onCountChange={setCubaCountForAdjustment}
              onWeightChange={setCubaWeightForAdjustment}
            />
          )}

          <div className="bg-gray-50 p-3 rounded-lg text-xs">
            <div className="font-medium text-gray-700 mb-1">Ficha Técnica Original:</div>
            <div className="space-y-1">
              <div>Rendimento: <span className="font-medium">{formatWeight(originalYieldWeight)}</span></div>
              <div>Custo/kg Rend.: <span className="font-medium">{formatCurrency(originalCostPerKg)}</span></div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              Gerar Impressão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
