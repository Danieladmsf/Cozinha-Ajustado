import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle, Loader2, FileText, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ingredient } from "@/app/api/entities";

export default function NamesImportView({
  namesData,
  onImportComplete,
  onBack
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const startImport = async () => {
    if (!namesData || namesData.length === 0) return;

    setIsImporting(true);
    setProgress(0);
    setError(null);
    setResults(null);

    const results = {
      created: [],
      skipped: [],
      errors: [],
      total_processed: namesData.length
    };

    try {// Carregar ingredientes existentes para verificar duplicatas
      const existingIngredients = await Ingredient.list();
      const existingNames = new Set(
        existingIngredients.map(ing => ing.name.toLowerCase().trim())
      );

      for (let i = 0; i < namesData.length; i++) {
        const name = String(namesData[i]).trim();
        setCurrentName(name);
        setProgress((i / namesData.length) * 100);

        if (!name || name.length === 0) {
          results.errors.push({
            name: name || `Item ${i + 1}`,
            reason: "Nome vazio ou inválido"
          });
          continue;
        }

        // Verificar se já existe
        const nameKey = name.toLowerCase().trim();
        if (existingNames.has(nameKey)) {
          results.skipped.push({
            name: name,
            reason: "Ingrediente já existe no sistema"
          });
          continue;
        }

        try {
          // Criar ingrediente básico
          const ingredientData = {
            name: name,
            commercial_name: name,
            unit: 'kg',
            current_price: 0,
            base_price: 0,
            last_update: new Date().toISOString().split('T')[0],
            active: true,
            category: 'Outros',
            ingredient_type: 'both',
            taco_variations: [],
            notes: 'Criado via importação de nomes em massa'
          };

          const savedIngredient = await Ingredient.create(ingredientData);
          
          results.created.push({
            name: savedIngredient.name,
            id: savedIngredient.id
          });

          // Adicionar à lista de existentes para evitar duplicatas no mesmo lote
          existingNames.add(nameKey);

        } catch (itemError) {results.errors.push({
            name: name,
            reason: `Erro ao criar: ${itemError.message}`
          });
        }
      }

      setProgress(100);
      setResults(results);

      // Chamar callback de sucesso
      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete(results);
        }, 2000);
      }

    } catch (err) {setError(err.message || 'Erro desconhecido na importação');
    } finally {
      setIsImporting(false);
      setCurrentName('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} disabled={isImporting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            <FileText className="w-6 h-6 inline mr-2" />
            {isImporting ? 'Importando Nomes...' :
             results ? 'Importação Concluída' :
             error ? 'Erro na Importação' : 'Importar Nomes de Ingredientes'}
          </h2>
          <p className="text-gray-500">Criação em massa de ingredientes básicos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importação de Nomes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview dos dados */}
          {!isImporting && !results && !error && (
            <div>
              <h4 className="font-medium mb-3">Itens a serem importados ({namesData?.length || 0}):</h4>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded border">
                {(namesData || []).slice(0, 10).map((name, index) => (
                  <div key={index} className="text-sm py-1">
                    {index + 1}. {String(name).trim()}
                  </div>
                ))}
                {namesData && namesData.length > 10 && (
                  <div className="text-sm text-gray-500 py-1">
                    ... e mais {namesData.length - 10} itens
                  </div>
                )}
              </div>
              
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Serão criados ingredientes básicos com preço R$ 0,00. 
                  Ingredientes que já existem no sistema serão ignorados.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={onBack}>
                  Cancelar
                </Button>
                <Button onClick={startImport} className="bg-green-600 hover:bg-green-700">
                  Iniciar Importação
                </Button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isImporting && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              
              {currentName && (
                <div className="text-sm text-gray-600 mt-2">
                  Processando: <span className="font-medium">{currentName}</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Importação concluída com sucesso!
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.created.length}</div>
                  <div className="text-gray-500">Criados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{results.skipped.length}</div>
                  <div className="text-gray-500">Pulados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
                  <div className="text-gray-500">Erros</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto">
                  <strong className="text-sm">Erros encontrados:</strong>
                  <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                    {results.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error.name}: {error.reason}</li>
                    ))}
                    {results.errors.length > 5 && (
                      <li>... e mais {results.errors.length - 5} erros</li>
                    )}
                  </ul>
                </div>
              )}

              {results.skipped.length > 0 && (
                <div className="max-h-32 overflow-y-auto">
                  <strong className="text-sm">Itens pulados:</strong>
                  <ul className="list-disc list-inside text-sm text-yellow-600 mt-1">
                    {results.skipped.slice(0, 5).map((skipped, index) => (
                      <li key={index}>{skipped.name}</li>
                    ))}
                    {results.skipped.length > 5 && (
                      <li>... e mais {results.skipped.length - 5} itens</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}