import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Printer } from "lucide-react";
import { RecipeCalculator } from '@/components/utils/recipeCalculator';

export default function RecipeTechnicalPrintDialog({
  recipe,
  preparations,
  isOpen,
  onClose
}) {
  const handlePrint = () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const formatWeightPrint = (weight) => {
      if (weight === null || weight === undefined || String(weight).trim() === "" || isNaN(parseFloat(String(weight).replace(',','.')))) return "—";
      const numWeight = parseFloat(String(weight).replace(',','.'));
      return `${numWeight.toFixed(3).replace('.', ',')}`;
    };

    const formatCurrencyPrint = (value) => {
      if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
      const numValue = parseFloat(value);
      return `R$ ${numValue.toFixed(2).replace('.', ',')}`;
    };

    const formatPercentPrint = (value) => {
      if (value === null || value === undefined || isNaN(value) || String(value).trim() === "") return "0,00%";
      const numValue = parseFloat(value);
      return `${numValue.toFixed(2).replace('.', ',')}%`;
    };

    const formatInstructions = (instructions) => {
      if (!instructions || instructions === 'Não especificado') return 'Não especificado';

      const instructionsStr = Array.isArray(instructions)
        ? instructions.map(i => typeof i === 'object' ? (i.text || i.content || i.description || '') : String(i)).join('\n')
        : String(instructions);

      if (!instructionsStr.trim()) return 'Não especificado';

      // Dividir em linhas
      const lines = instructionsStr.split('\n').map(l => l.trim()).filter(l => l);

      let html = '';

      lines.forEach(line => {
        // Títulos principais (## ou linhas que terminam com :)
        if (line.startsWith('##') || (line.endsWith(':') && line.length < 60 && !line.startsWith('-'))) {
          const title = line.replace(/^##\s*/, '').replace(/\*\*/g, '');
          html += `<div class="instruction-title">${title}</div>`;
        }
        // Subtítulos (linhas curtas com * ou negrito)
        else if (line.match(/^\*.*\*:?$/) || line.match(/^\d+\.\s*\*/)) {
          const subtitle = line.replace(/\*/g, '').replace(/^\d+\.\s*/, '');
          html += `<div class="instruction-subtitle">${subtitle}</div>`;
        }
        // Bullets (começam com -)
        else if (line.startsWith('-')) {
          const bulletText = line.replace(/^-\s*/, '').replace(/\*\*/g, '<strong>').replace(/\*/g, '');
          html += `<div class="instruction-bullet">• ${bulletText}</div>`;
        }
        // Numeração explícita (1., 2., etc no início)
        else if (line.match(/^\d+\.\s+/)) {
          html += `<div class="instruction-numbered">${line}</div>`;
        }
        // Texto normal (parágrafos)
        else {
          const formattedText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          html += `<div class="instruction-paragraph">${formattedText}</div>`;
        }
      });

      return html || 'Não especificado';
    };

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ficha Técnica - ${recipe.name}</title>
        <style>
          @page {
            margin: 10mm;
            size: A4;
          }

          @media print {
            @page {
              margin: 10mm;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }

          * { box-sizing: border-box; }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.3;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #2d3748;
            font-size: 9pt;
          }

          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding: 0.75rem 1rem;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border-radius: 6px;
          }

          .page-header .title {
            font-size: 1.3rem;
            font-weight: 700;
            margin: 0;
          }

          .page-header .datetime {
            font-size: 0.8rem;
            opacity: 0.9;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 1px;
            background: #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            margin-bottom: 1rem;
          }

          .info-item {
            background: white;
            padding: 0.6rem;
            text-align: center;
          }

          .info-label {
            font-size: 0.65rem;
            color: #4a5568;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 0.15rem;
          }

          .info-value {
            font-size: 0.85rem;
            font-weight: 600;
            color: #1a202c;
          }

          .process-section {
            margin-bottom: 1rem;
            break-inside: avoid;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }

          .process-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: white;
            padding: 0.6rem 0.8rem;
            margin: 0;
            background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
          }

          .process-title.portioning {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
          }

          .process-title.assembly {
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            font-size: 0.7rem;
            background: white;
          }

          th, td {
            border: 1px solid #e2e8f0;
            padding: 0.3rem 0.3rem;
            text-align: center;
            vertical-align: middle;
            word-break: break-word;
          }

          th {
            background: #f7fafc;
            font-weight: 600;
            color: #2d3748;
            font-size: 0.65rem;
            text-transform: uppercase;
            white-space: normal;
          }

          .ingredient-cell {
            text-align: left !important;
            font-weight: 500;
            color: #1a202c;
            min-width: 80px;
            max-width: 120px;
          }

          .currency-cell, .weight-cell, .percentage-cell {
            font-weight: 500;
            color: #2d3748;
            white-space: nowrap;
          }

          .percentage-good { color: #2f855a; }
          .percentage-warning { color: #dd6b20; }
          .percentage-bad { color: #c53030; }


          .section-header {
            background: #e9d8fd !important;
            color: #5b21b6 !important;
            font-weight: 700;
            font-size: 0.65rem;
          }
          .section-header.ingredients { background: #c6f6d5 !important; color: #22543d !important; }
          .section-header.defrosting { background: #bee3f8 !important; color: #2c5282 !important; }
          .section-header.cleaning { background: #fefcbf !important; color: #975a16 !important; }
          .section-header.cooking { background: #fed7d7 !important; color: #9b2c2c !important; }
          .section-header.portioning { background: #c6f6d5 !important; color: #22543d !important; }
          .section-header.yield { background: #e9d8fd !important; color: #5b21b6 !important; }

          .instructions {
            background: #fdfdfe;
            padding: 0.75rem;
            margin: 0;
            border-top: 1px solid #e2e8f0;
            min-height: 40px;
          }

          .instructions-title {
            font-weight: 600;
            margin-bottom: 0.3rem;
            color: #2d3748;
            font-size: 0.75rem;
            text-transform: uppercase;
          }

          .instructions-content {
            color: #4a5568;
            font-size: 0.75rem;
            line-height: 1.5;
          }

          .instruction-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: #2563eb;
            margin-top: 0.75rem;
            margin-bottom: 0.4rem;
            padding-bottom: 0.2rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .instruction-title:first-child {
            margin-top: 0;
          }

          .instruction-subtitle {
            font-size: 0.75rem;
            font-weight: 600;
            color: #1f2937;
            margin-top: 0.5rem;
            margin-bottom: 0.3rem;
          }

          .instruction-bullet {
            margin-left: 1rem;
            margin-bottom: 0.25rem;
            line-height: 1.4;
            color: #4a5568;
          }

          .instruction-bullet strong {
            color: #1f2937;
            font-weight: 600;
          }

          .instruction-numbered {
            margin-left: 0.5rem;
            margin-bottom: 0.3rem;
            line-height: 1.4;
            color: #4a5568;
          }

          .instruction-paragraph {
            margin-bottom: 0.4rem;
            line-height: 1.4;
            color: #4a5568;
          }

          .instruction-paragraph strong {
            color: #1f2937;
            font-weight: 600;
          }

          .empty-state {
            text-align: center;
            color: #718096;
            font-style: italic;
            padding: 1rem;
            font-size: 0.75rem;
          }

          .footer {
            text-align: center;
            font-size: 0.65rem;
            color: #718096;
            margin-top: 1.5rem;
            padding-top: 0.75rem;
            border-top: 1px solid #e2e8f0;
          }

          .footer-brand {
            color: #4f46e5;
            font-weight: 600;
          }

          .process-section { page-break-inside: avoid; }
          .process-title { page-break-after: avoid; }
          .instructions { page-break-before: avoid; }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          <div class="page-header">
            <h1 class="title">Ficha Técnica - ${recipe.name}</h1>
            <div class="datetime">${format(futureDate, 'dd/MM/yyyy, HH:mm', { locale: ptBR })}</div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">DATA</div>
              <div class="info-value">${format(futureDate, 'dd/MM/yyyy', { locale: ptBR })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">CATEGORIA</div>
              <div class="info-value">${recipe.category || 'Padrão'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">TEMPO DE PREPARO</div>
              <div class="info-value">${recipe.prep_time || 0} min</div>
            </div>
            <div class="info-item">
              <div class="info-label">PESO TOTAL (BRUTO)</div>
              <div class="info-value">${formatWeightPrint(recipe.total_weight)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">PESO TOTAL (REND.)</div>
              <div class="info-value">${formatWeightPrint(recipe.yield_weight)}</div>
            </div>
          </div>
    `;

    preparations.forEach((prep, prepIndex) => {
      const hasDefrosting = prep.processes?.includes('defrosting');
      const hasCleaning = prep.processes?.includes('cleaning');
      const hasCooking = prep.processes?.includes('cooking');
      const hasPortioningProcess = prep.processes?.includes('portioning');

      const isOnlyPortioningSubComponents = hasPortioningProcess && prep.sub_components?.length > 0 && (!prep.ingredients || prep.ingredients.length === 0) && !hasDefrosting && !hasCleaning && !hasCooking;
      const isOnlyAssembly = prep.processes?.includes('assembly') && prep.sub_components?.length > 0 && (!prep.ingredients || prep.ingredients.length === 0) && !hasDefrosting && !hasCleaning && !hasCooking && !hasPortioningProcess;

      let titleClass = '';
      if (isOnlyPortioningSubComponents) titleClass = 'portioning';
      else if (isOnlyAssembly) titleClass = 'assembly';

      printContent += `
        <div class="process-section">
          <h2 class="process-title ${titleClass}">${prepIndex + 1}º Etapa: ${prep.title}</h2>
      `;

      if (isOnlyAssembly) {
        printContent += `
          <table>
            <thead>
              <tr>
                <th class="section-header">Item (Preparo/Receita)</th>
                <th class="section-header yield">Peso Total (Rendimento)</th>
                <th class="section-header yield">Rendimento (%)</th>
                <th class="section-header yield">Custo</th>
              </tr>
            </thead>
            <tbody>
        `;
        if (!prep.sub_components || prep.sub_components.length === 0) {
          printContent += `<tr><td colspan="4" class="empty-state">Nenhum item para montagem</td></tr>`;
        } else {
          prep.sub_components.forEach(sc => {
            const yieldWeight = RecipeCalculator.parseNumericValue(sc.yield_weight);
            const inputWeight = RecipeCalculator.parseNumericValue(sc.input_yield_weight);
            const totalCost = RecipeCalculator.parseNumericValue(sc.total_cost) || 0;
            const yieldPercent = inputWeight > 0 ? (yieldWeight / inputWeight) * 100 : 100;
            const yieldClass = yieldPercent >= 95 ? 'percentage-good' : yieldPercent >= 85 ? 'percentage-warning' : 'percentage-bad';
            printContent += `
              <tr>
                <td class="ingredient-cell">${sc.name}</td>
                <td class="weight-cell">${formatWeightPrint(yieldWeight)}</td>
                <td class="percentage-cell ${yieldClass}">${formatPercentPrint(yieldPercent)}</td>
                <td class="currency-cell">${formatCurrencyPrint(totalCost)}</td>
              </tr>
            `;
          });
        }
        printContent += `</tbody></table>`;
      }
      else if (isOnlyPortioningSubComponents) {
        printContent += `
          <table>
            <thead>
              <tr>
                <th class="section-header">Produto de Entrada</th>
                <th class="section-header portioning">Peso Entrada</th>
                <th class="section-header portioning">Peso Pós Porcionamento</th>
                <th class="section-header portioning">Perda (%)</th>
                <th class="section-header yield">Rendimento (%)</th>
                <th class="section-header yield">Custo</th>
              </tr>
            </thead>
            <tbody>
        `;
        if (!prep.sub_components || prep.sub_components.length === 0) {
          printContent += `<tr><td colspan="6" class="empty-state">Nenhum produto para porcionar</td></tr>`;
        } else {
          prep.sub_components.forEach(sc => {
            const inputWeight = RecipeCalculator.parseNumericValue(sc.input_yield_weight);
            const portionedWeight = RecipeCalculator.parseNumericValue(sc.weight_portioned) || inputWeight;
            const totalCost = RecipeCalculator.parseNumericValue(sc.total_cost) || 0;
            const portioningLoss = inputWeight > 0 && portionedWeight >= 0 ? ((inputWeight - portionedWeight) / inputWeight) * 100 : 0;
            const yieldPercent = inputWeight > 0 ? (portionedWeight / inputWeight) * 100 : 100;
            const lossClass = portioningLoss <= 2 ? 'percentage-good' : portioningLoss <= 5 ? 'percentage-warning' : 'percentage-bad';
            const yieldClass = yieldPercent >= 95 ? 'percentage-good' : yieldPercent >= 90 ? 'percentage-warning' : 'percentage-bad';
            printContent += `
              <tr>
                <td class="ingredient-cell">${sc.name}</td>
                <td class="weight-cell">${formatWeightPrint(inputWeight)}</td>
                <td class="weight-cell">${formatWeightPrint(portionedWeight)}</td>
                <td class="percentage-cell ${lossClass}">${formatPercentPrint(portioningLoss)}</td>
                <td class="percentage-cell ${yieldClass}">${formatPercentPrint(yieldPercent)}</td>
                <td class="currency-cell">${formatCurrencyPrint(totalCost)}</td>
              </tr>
            `;
          });
        }
        printContent += `</tbody></table>`;
      }
      else {
        let colCount = 3;
        if (hasDefrosting) colCount +=3;
        if (hasCleaning) colCount += hasDefrosting ? 2 : 3;
        if (hasCooking) colCount +=3;
        if (hasPortioningProcess) colCount +=2;
        colCount +=2;

        printContent += `
          <table>
            <thead>
              <tr>
                <th colspan="3" class="section-header ingredients">Dados Ingredientes</th>
                ${hasDefrosting ? '<th colspan="3" class="section-header defrosting">Descongelamento</th>' : ''}
                ${hasCleaning ? `<th colspan="${hasDefrosting ? '2' : '3'}" class="section-header cleaning">Limpeza</th>` : ''}
                ${hasCooking ? '<th colspan="3" class="section-header cooking">Cocção</th>' : ''}
                ${hasPortioningProcess ? '<th colspan="2" class="section-header portioning">Porcionamento (Ing.)</th>' : ''}
                <th colspan="2" class="section-header yield">Dados Rendimento</th>
              </tr>
              <tr>
                <th>Ingrediente</th>
                <th>Preço/kg (Bruto)</th>
                <th>Preço/kg (Líquido)</th>
                ${hasDefrosting ? `<th>Peso Cong.</th><th>Peso Resf.</th><th>Perda Desc.(%)</th>` : ''}
                ${hasCleaning ? `${!hasDefrosting ? '<th>Peso Bruto</th>' : ''}<th>Pós Limp.</th><th>Perda Limp.(%)</th>` : ''}
                ${hasCooking ? `<th>Peso Pré Cozinhar</th><th>Peso Cozido</th><th>Perda Coz.(%)</th>` : ''}
                ${hasPortioningProcess ? `<th>Pós Porc. (Ing.)</th><th>Perda Porc.(%) (Ing.)</th>` : ''}
                <th>Rendimento Final(%)</th>
                <th>Custo</th>
              </tr>
            </thead>
            <tbody>
        `;

        if (!prep.ingredients || prep.ingredients.length === 0) {
          printContent += `<tr><td colspan="${colCount}" class="empty-state">Nenhum ingrediente</td></tr>`;
        } else {
          prep.ingredients.forEach(ing => {
            const thawingLoss = RecipeCalculator.calculateThawingLoss(ing);
            const cleaningLoss = RecipeCalculator.calculateCleaningLoss(ing);
            const cookingLoss = RecipeCalculator.calculateCookingLoss(ing);
            const portioningLossIng = RecipeCalculator.calculatePortioningLoss(ing);
            const yieldPercent = RecipeCalculator.calculateItemYieldPercent(ing);
            const netPrice = RecipeCalculator.calculateItemNetPricePerKg(ing);
            const ingredientCost = RecipeCalculator.parseNumericValue(ing.total_cost) || 0;
            const currentPrice = RecipeCalculator.parseNumericValue(ing.current_price) || 0;

            const thawingClass = thawingLoss <= 5 ? 'percentage-good' : thawingLoss <= 10 ? 'percentage-warning' : 'percentage-bad';
            const cleaningClass = cleaningLoss <= 10 ? 'percentage-good' : cleaningLoss <= 15 ? 'percentage-warning' : 'percentage-bad';
            const cookingClass = cookingLoss <= 15 ? 'percentage-good' : cookingLoss <= 25 ? 'percentage-warning' : 'percentage-bad';
            const portioningIngClass = portioningLossIng <= 2 ? 'percentage-good' : portioningLossIng <= 5 ? 'percentage-warning' : 'percentage-bad';
            const yieldClass = yieldPercent >= 70 ? 'percentage-good' : yieldPercent >= 60 ? 'percentage-warning' : 'percentage-bad';

            printContent += `
              <tr>
                <td class="ingredient-cell">${ing.name}</td>
                <td class="currency-cell">${formatCurrencyPrint(currentPrice)}</td>
                <td class="currency-cell">${formatCurrencyPrint(netPrice)}</td>
                ${hasDefrosting ? `
                  <td class="weight-cell">${formatWeightPrint(ing.weight_frozen)}</td>
                  <td class="weight-cell">${formatWeightPrint(ing.weight_thawed)}</td>
                  <td class="percentage-cell ${thawingClass}">${formatPercentPrint(thawingLoss)}</td>
                ` : ''}
                ${hasCleaning ? `
                  ${!hasDefrosting ? `<td class="weight-cell">${formatWeightPrint(ing.weight_raw)}</td>` : ''}
                  <td class="weight-cell">${formatWeightPrint(ing.weight_clean)}</td>
                  <td class="percentage-cell ${cleaningClass}">${formatPercentPrint(cleaningLoss)}</td>
                ` : ''}
                ${hasCooking ? `
                  <td class="weight-cell">${formatWeightPrint(ing.weight_pre_cooking || ing.weight_clean || ing.weight_thawed || ing.weight_raw)}</td>
                  <td class="weight-cell">${formatWeightPrint(ing.weight_cooked)}</td>
                  <td class="percentage-cell ${cookingClass}">${formatPercentPrint(cookingLoss)}</td>
                ` : ''}
                ${hasPortioningProcess ? `
                  <td class="weight-cell">${formatWeightPrint(ing.weight_portioned)}</td>
                  <td class="percentage-cell ${portioningIngClass}">${formatPercentPrint(portioningLossIng)}</td>
                ` : ''}
                <td class="percentage-cell ${yieldClass}">${formatPercentPrint(yieldPercent)}</td>
                <td class="currency-cell">${formatCurrencyPrint(ingredientCost)}</td>
              </tr>
            `;
          });
        }
        printContent += `</tbody></table>`;
      }

      printContent += `
        <div class="instructions">
          <div class="instructions-title">Modo de Preparo desta Etapa:</div>
          <div class="instructions-content">${formatInstructions(prep.instructions)}</div>
        </div>
      </div>
      `;
    });

    printContent += `
        <div class="footer">
          Ficha técnica gerada por <span class="footer-brand">Cozinha e Afeto</span> - ${format(futureDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 750);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Ficha Técnica Completa</h3>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            Design otimizado para impressão. Certifique-se de que a escala de impressão esteja em 100% e o layout em Retrato.
          </div>
          <div className="flex justify-center">
            <Button onClick={handlePrint} className="w-full">
              <Printer className="mr-2 h-4 w-4" />
              Gerar Ficha Técnica para Impressão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
