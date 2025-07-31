
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  Calculator 
} from "lucide-react";
import RecipeTechnicalPrintDialog from "./RecipeTechnicalPrintDialog";
import { RecipeValidator } from "@/components/utils/recipeValidator";
import { RecipeCalculator } from "@/components/utils/recipeCalculator";

export default function RecipeTechnicalDisplay({ recipe, preparations = [] }) {
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [validatedData, setValidatedData] = useState(null);
  const [showWarnings, setShowWarnings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [recalculationResult, setRecalculationResult] = useState(null);

  useEffect(() => {
    if (recipe && preparations.length > 0) {
      validateAndFixRecipe();
    }
  }, [recipe, preparations]);

  const validateAndFixRecipe = () => {
    try {
      // Primeiro calcular métricas precisas (considerando todos os ingredientes)
      const preciseMetrics = RecipeCalculator.calculatePreciseMetrics(recipe, preparations);
      
      // Criar objeto com valores corrigidos
      const metricsFixedRecipe = {
        ...recipe,
        total_weight: preciseMetrics.totalBrutWeight,
        yield_weight: preciseMetrics.totalYieldWeight,
        total_cost: preciseMetrics.totalCost,
        cost_per_kg_raw: preciseMetrics.costPerKgRaw,
        cost_per_kg_yield: preciseMetrics.costPerKgYield,
        cuba_cost: preciseMetrics.cubaCost
      };
      
      // Identificar problemas
      const issues = [];
      
      // Verificar se o peso bruto inclui todos os ingredientes
      if (Math.abs(metricsFixedRecipe.total_weight - recipe.total_weight) > 0.1) {
        issues.push({
          type: 'error',
          message: `Peso bruto incorreto: ${formatWeight(recipe.total_weight)} não inclui todos os ingredientes`,
          fix: `Corrigido para ${formatWeight(metricsFixedRecipe.total_weight)}`
        });
      }
      
      // Verificar se o rendimento é realista
      if (metricsFixedRecipe.yield_weight > metricsFixedRecipe.total_weight) {
        issues.push({
          type: 'error',
          message: `Rendimento impossível: ${formatWeight(metricsFixedRecipe.yield_weight)} excede o peso bruto ${formatWeight(metricsFixedRecipe.total_weight)}`,
          fix: `Verifique se há erros nos pesos de processo`
        });
      }
      
      // Verificar custo por kg bruto
      if (Math.abs(metricsFixedRecipe.cost_per_kg_raw - recipe.cost_per_kg_raw) / recipe.cost_per_kg_raw > 0.05) {
        issues.push({
          type: 'error',
          message: `Custo por kg bruto incorreto: ${formatCurrency(recipe.cost_per_kg_raw)} ≠ ${formatCurrency(metricsFixedRecipe.cost_per_kg_raw)}`,
          fix: `Corrigido para ${formatCurrency(metricsFixedRecipe.cost_per_kg_raw)}`
        });
      }
      
      // Verificar custo por kg rendimento
      if (Math.abs(metricsFixedRecipe.cost_per_kg_yield - recipe.cost_per_kg_yield) / recipe.cost_per_kg_yield > 0.05) {
        issues.push({
          type: 'warning',
          message: `Custo por kg rendimento com diferença: ${formatCurrency(recipe.cost_per_kg_yield)} ≠ ${formatCurrency(metricsFixedRecipe.cost_per_kg_yield)}`,
          fix: `Ajustado para ${formatCurrency(metricsFixedRecipe.cost_per_kg_yield)}`
        });
      }
      
      // Verificar detalhes dos ingredientes para possíveis problemas
      preciseMetrics.ingredientDetails.forEach(ing => {
        // Verificar ingredientes sem peso
        if (ing.initialWeight === 0 && ing.name) {
          issues.push({
            type: 'warning',
            message: `Ingrediente "${ing.name}" não tem peso inicial definido`,
            suggestion: 'Defina um peso para este ingrediente'
          });
        }
        
        // Verificar rendimentos anormalmente altos
        if (ing.initialWeight > 0 && ing.yieldRate > 105) {
          issues.push({
            type: 'warning', 
            message: `Ingrediente "${ing.name}" tem rendimento maior que 100%: ${ing.yieldRate.toFixed(1)}%`,
            suggestion: 'Verifique se os pesos de processo estão corretos'
          });
        }
      });
      
      // Após cálculos precisos, validar outros aspectos
      // Depois validar outros aspectos
      const { recipe: validatedRecipe, preparations: validatedPreparations, issues: validationIssues } = 
        RecipeValidator.validateAndCorrect(metricsFixedRecipe, preparations);
      
      // Combinar todos os problemas
      const allIssues = [...issues, ...validationIssues];
      
      setValidatedData({ 
        recipe: metricsFixedRecipe, 
        preparations,
        issues: allIssues,
        originalRecipe: { ...recipe },
        originalPreparations: [...preparations]
      });
      
      setRecalculationResult({
        recipe: metricsFixedRecipe,
        metrics: preciseMetrics
      });
      
    } catch (error) {setValidatedData({
        recipe: { ...recipe },
        preparations: [...preparations],
        issues: [{
          severity: 'error',
          message: 'Erro durante a validação dos dados: ' + error.message
        }],
        originalRecipe: { ...recipe },
        originalPreparations: [...preparations]
      });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatWeight = (weight) => {
    if (!weight && weight !== 0) return "0,000 kg";
    return `${parseFloat(weight).toLocaleString('pt-BR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    })} kg`;
  };

  // Filtrar problemas críticos (erros) e avisos
  const getErrorIssues = () => {
    return validatedData?.issues.filter(
      issue => issue.severity === 'error' || issue.type === 'error'
    ) || [];
  };

  const getWarningIssues = () => {
    return validatedData?.issues.filter(
      issue => issue.severity === 'warning' || issue.type === 'warning'
    ) || [];
  };

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const handleRecalculate = () => {
    validateAndFixRecipe();
  };

  // Função para detectar diferenças significativas
  const isDifferent = (original, validated, field) => {
    if (!original || !validated) return false;
    
    if (field === 'total_weight' || field === 'yield_weight') {
      const diff = Math.abs((original[field] - validated[field]) / original[field]);
      return diff > 0.05; // 5% de diferença é significativo
    }
    
    if (field === 'cost_per_kg_raw' || field === 'cost_per_kg_yield') {
      const diff = Math.abs((original[field] - validated[field]) / original[field]);
      return diff > 0.1; // 10% de diferença é significativo
    }
    
    return false;
  };

  if (!validatedData) {
    return <div className="text-center p-4">Carregando dados da receita...</div>;
  }

  const { recipe: validatedRecipe, originalRecipe } = validatedData;
  const errorIssues = getErrorIssues();
  const warningIssues = getWarningIssues();

  // Determinar se há diferenças significativas
  const hasDifferences = isDifferent(originalRecipe, validatedRecipe, 'total_weight') || 
                         isDifferent(originalRecipe, validatedRecipe, 'yield_weight') ||
                         isDifferent(originalRecipe, validatedRecipe, 'cost_per_kg_raw') ||
                         isDifferent(originalRecipe, validatedRecipe, 'cost_per_kg_yield');

  return (
    <div className="space-y-6">
      {/* Alertas sobre inconsistências críticas */}
      {errorIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>Inconsistências críticas detectadas</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-white text-white hover:bg-red-600 hover:text-white flex items-center gap-1"
                onClick={handleRecalculate}
              >
                <Calculator className="h-3 w-3" />
                Recalcular
              </Button>
              
              {hasDifferences && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-white text-white hover:bg-red-600 hover:text-white flex items-center gap-1"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showDetails ? "Ocultar" : "Detalhes"}
                </Button>
              )}
            </div>
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              {errorIssues.slice(0, showDetails ? errorIssues.length : 3).map((issue, idx) => (
                <li key={idx}>
                  {issue.message}
                  {issue.fix && <span className="text-yellow-300 ml-1">→ {issue.fix}</span>}
                </li>
              ))}
              {!showDetails && errorIssues.length > 3 && (
                <li className="list-none text-right">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-white hover:text-white/80 p-0"
                    onClick={() => setShowDetails(true)}
                  >
                    + {errorIssues.length - 3} mais problemas
                  </Button>
                </li>
              )}
            </ul>

            {showDetails && hasDifferences && (
              <div className="mt-4 p-3 bg-white/10 rounded border border-white/20">
                <h4 className="font-medium text-sm mb-2">Valores Corrigidos</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="opacity-80">Peso Bruto Original:</p>
                    <p className="font-bold">{formatWeight(originalRecipe.total_weight)}​</p>
                  </div>
                  <div>
                    <p className="opacity-80">Peso Bruto Corrigido:</p>
                    <p className="font-bold">{formatWeight(validatedRecipe.total_weight)}​</p>
                  </div>
                  <div>
                    <p className="opacity-80">Rendimento Original:</p>
                    <p className="font-bold">{formatWeight(originalRecipe.yield_weight)}​</p>
                  </div>
                  <div>
                    <p className="opacity-80">Rendimento Corrigido:</p>
                    <p className="font-bold">{formatWeight(validatedRecipe.yield_weight)}​</p>
                  </div>
                  <div>
                    <p className="opacity-80">Custo/kg (Bruto) Original:</p>
                    <p className="font-bold">{formatCurrency(originalRecipe.cost_per_kg_raw)}​</p>
                  </div>
                  <div>
                    <p className="opacity-80">Custo/kg (Bruto) Corrigido:</p>
                    <p className="font-bold">{formatCurrency(validatedRecipe.cost_per_kg_raw)}​</p>
                  </div>
                  <div>
                    <p className="opacity-80">Custo/kg (Rendimento) Original:</p>
                    <p className="font-bold">{formatCurrency(originalRecipe.cost_per_kg_yield)}​</p>
                  </div>
                  <div>
                    <p className="opacity-80">Custo/kg (Rendimento) Corrigido:</p>
                    <p className="font-bold">{formatCurrency(validatedRecipe.cost_per_kg_yield)}​</p>
                  </div>
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Alertas de avisos */}
      {warningIssues.length > 0 && (
        <Alert variant="warning" className="bg-amber-50 text-amber-900 border-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="flex items-center justify-between">
            <span>Avisos sobre os dados da receita</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-amber-700 hover:text-amber-900"
              onClick={() => setShowWarnings(!showWarnings)}
            >
              {showWarnings ? "Ocultar detalhes" : "Ver detalhes"}
            </Button>
          </AlertTitle>
          {showWarnings && (
            <AlertDescription>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                {warningIssues.map((issue, idx) => (
                  <li key={idx}>{issue.message}</li>
                ))}
              </ul>
            </AlertDescription>
          )}
        </Alert>
      )}

      {/* Cartão de informações da receita */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle>Informações de Custo e Peso</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={handleRecalculate}
              >
                <Calculator className="h-4 w-4" />
                Recalcular
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Imprimir Ficha Técnica
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Peso Total (Bruto)</h3>
              <p className="text-lg font-bold">{formatWeight(validatedRecipe.total_weight)}</p>
              {isDifferent(originalRecipe, validatedRecipe, 'total_weight') && (
                <Badge variant="outline" className="mt-1 border-orange-500 text-orange-700">
                  Valor ajustado
                </Badge>
              )}
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-700">Peso Total (Rendimento)</h3>
              <p className="text-lg font-bold">{formatWeight(validatedRecipe.yield_weight)}</p>
              {validatedRecipe.yield_weight > 0 && validatedRecipe.total_weight > 0 && (
                <Badge 
                  className={validatedRecipe.yield_weight <= validatedRecipe.total_weight * 1.05 
                    ? "bg-green-100 text-green-800" 
                    : "bg-amber-100 text-amber-800"}
                >
                  {Math.round((validatedRecipe.yield_weight / validatedRecipe.total_weight) * 100)}% do peso bruto
                </Badge>
              )}
              {isDifferent(originalRecipe, validatedRecipe, 'yield_weight') && (
                <Badge variant="outline" className="mt-1 border-orange-500 text-orange-700">
                  Valor ajustado
                </Badge>
              )}
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-green-700">Custo Total</h3>
              <p className="text-lg font-bold">{formatCurrency(validatedRecipe.total_cost)}</p>
              {recalculationResult && (
                <div className="text-xs text-green-600 mt-1">
                  ({formatWeight(validatedRecipe.total_weight)} a {formatCurrency(validatedRecipe.cost_per_kg_raw)}/kg)
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600">Custo por Kg (Bruto)</h3>
              <p className="text-lg font-bold">{formatCurrency(validatedRecipe.cost_per_kg_raw)}</p>
              {isDifferent(originalRecipe, validatedRecipe, 'cost_per_kg_raw') && (
                <Badge variant="outline" className="mt-1 border-orange-500 text-orange-700">
                  Valor ajustado
                </Badge>
              )}
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h3 className="text-sm font-medium text-indigo-700">Custo por Kg (Rendimento)</h3>
              <p className="text-lg font-bold">{formatCurrency(validatedRecipe.cost_per_kg_yield)}</p>
              {isDifferent(originalRecipe, validatedRecipe, 'cost_per_kg_yield') && (
                <Badge variant="outline" className="mt-1 border-orange-500 text-orange-700">
                  Valor ajustado
                </Badge>
              )}
            </div>
            {validatedRecipe.cuba_weight > 0 && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="text-sm font-medium text-purple-700">Custo da Cuba</h3>
                <p className="text-lg font-bold">
                  {formatCurrency(validatedRecipe.cuba_weight * validatedRecipe.cost_per_kg_yield)}
                </p>
                <span className="text-xs text-purple-600">
                  Calculado para {formatWeight(validatedRecipe.cuba_weight)}
                </span>
              </div>
            )}
          </div>
          
          {/* Resumo dos valores corrigidos */}
          {recalculationResult && hasDifferences && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-1">
                <Info className="h-4 w-4" />
                Resumo das Correções
              </h4>
              <ul className="space-y-1 text-sm text-amber-700">
                {isDifferent(originalRecipe, validatedRecipe, 'total_weight') && (
                  <li>• Peso Bruto: {formatWeight(originalRecipe.total_weight)} → {formatWeight(validatedRecipe.total_weight)}</li>
                )}
                {isDifferent(originalRecipe, validatedRecipe, 'yield_weight') && (
                  <li>• Rendimento: {formatWeight(originalRecipe.yield_weight)} → {formatWeight(validatedRecipe.yield_weight)}</li>
                )}
                {isDifferent(originalRecipe, validatedRecipe, 'cost_per_kg_raw') && (
                  <li>• Custo/kg (Bruto): {formatCurrency(originalRecipe.cost_per_kg_raw)} → {formatCurrency(validatedRecipe.cost_per_kg_raw)}</li>
                )}
                {isDifferent(originalRecipe, validatedRecipe, 'cost_per_kg_yield') && (
                  <li>• Custo/kg (Rendimento): {formatCurrency(originalRecipe.cost_per_kg_yield)} → {formatCurrency(validatedRecipe.cost_per_kg_yield)}</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para impressão */}
      <RecipeTechnicalPrintDialog
        recipe={recalculationResult?.recipe || validatedRecipe}
        preparations={validatedData.preparations}
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
      />
    </div>
  );
}
