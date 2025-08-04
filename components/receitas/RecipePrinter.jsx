import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Printer } from "lucide-react";

const RecipePrinter = ({ recipe, isOpen, onClose }) => {
  const [adjustmentType, setAdjustmentType] = React.useState("weight");
  const [adjustmentValue, setAdjustmentValue] = React.useState("");
  const [cubaWeight, setCubaWeight] = React.useState("3.5");

  // Funções utilitárias
  const parseNumber = (value) => {
    if (!value) return 0;
    return parseFloat(String(value).replace(',', '.'));
  };

  const formatWeight = (weight) => {
    if (!weight) return "0,000 kg";
    return `${parseFloat(weight).toFixed(3).replace('.', ',')} kg`;
  };

  const formatCurrency = (value) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateAdjustmentFactor = () => {
    const baseYield = parseNumber(recipe.yield_weight);
    if (!baseYield) return 1;

    if (adjustmentType === "weight") {
      const targetWeight = parseNumber(adjustmentValue);
      return targetWeight / baseYield;
    } else { // cubas
      const numberOfCubas = parseNumber(adjustmentValue);
      const cubaWeightValue = parseNumber(cubaWeight);
      const targetWeight = numberOfCubas * cubaWeightValue;
      return targetWeight / baseYield;
    }
  };

  const handleGeneratePrint = () => {
    const adjustmentFactor = calculateAdjustmentFactor();
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);

    // Calcular totais ajustados
    let totalBrutoWeight = 0;
    let totalCost = 0;

    if (recipe.ingredients) {
      recipe.ingredients.forEach(ing => {
        const adjustedQuantity = parseNumber(ing.quantity) * adjustmentFactor;
        totalBrutoWeight += adjustedQuantity;
        totalCost += adjustedQuantity * parseNumber(ing.unit_price);
      });
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receita - ${recipe.name}</title>
        <style>
          @page { margin: 15mm; size: A4; }
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.3; 
            margin: 0; 
            padding: 15mm;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #333;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 14px;
            color: #666;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .info-box {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }
          .info-value {
            font-size: 16px;
            font-weight: bold;
            margin-top: 5px;
          }
          .step {
            margin-bottom: 30px;
          }
          .step-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #ddd;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background: #f5f5f5;
          }
          .instructions {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Receita - ${recipe.name}</div>
          <div class="subtitle">
            Ajustado para: ${
              adjustmentType === "cubas" 
                ? `${adjustmentValue} cuba(s) de ${formatWeight(parseNumber(cubaWeight))}`
                : formatWeight(parseNumber(adjustmentValue))
            }
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Data</div>
            <div class="info-value">${date.toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Categoria</div>
            <div class="info-value">${recipe.category || 'Não especificada'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Tempo de Preparo</div>
            <div class="info-value">${recipe.prep_time || 0} minutos</div>
          </div>
          <div class="info-box">
            <div class="info-label">Peso Total (Bruto)</div>
            <div class="info-value">${formatWeight(totalBrutoWeight)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Peso Total (Rendimento)</div>
            <div class="info-value">${formatWeight(parseNumber(recipe.yield_weight) * adjustmentFactor)}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Custo por Kg (Rendimento)</div>
            <div class="info-value">${formatCurrency(totalCost / (parseNumber(recipe.yield_weight) * adjustmentFactor))}</div>
          </div>
        </div>

        ${recipe.processes?.map((process, idx) => `
          <div class="step">
            <div class="step-title">${process.hasIngredients ? `${idx + 1}° ETAPA: ` : ''}${process.title}</div>
            ${process.ingredients ? `
              <table>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Peso</th>
                    <th>Preço/kg (Bruto)</th>
                    <th>Preço/kg (Líquido)</th>
                    <th>Rendimento</th>
                  </tr>
                </thead>
                <tbody>
                  ${process.ingredients.map(ing => `
                    <tr>
                      <td>${ing.name}</td>
                      <td>${formatWeight(parseNumber(ing.quantity) * adjustmentFactor)}</td>
                      <td>${formatCurrency(ing.unit_price)}</td>
                      <td>${formatCurrency(ing.unit_price)}</td>
                      <td>100,0%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
            <div class="instructions">
              <strong>Modo de Preparo desta Etapa:</strong>
              <p>${process.instructions || 'Não especificado'}</p>
            </div>
          </div>
        `).join('')}

        <div class="footer">
          Receita gerada por Cozinha e Afeto - ${date.toLocaleDateString('pt-BR')}
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
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Imprimir Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          
          <RadioGroup
            value={adjustmentType}
            onValueChange={setAdjustmentType}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cubas" id="cubas" />
              <Label htmlFor="cubas">Por Cubas</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weight" id="weight" />
              <Label htmlFor="weight">Por Peso</Label>
            </div>
          </RadioGroup>

          {adjustmentType === "cubas" ? (
            <div className="space-y-4">
              <div>
                <Label>Número de Cubas</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                />
              </div>
              <div>
                <Label>Peso por Cuba (kg)</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={cubaWeight}
                  onChange={(e) => setCubaWeight(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <Label>Peso Total Desejado (kg)</Label>
              <Input
                type="number"
                min="0.1"
                step="0.1"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleGeneratePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Gerar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipePrinter;