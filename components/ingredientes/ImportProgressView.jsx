
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ingredient } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";
import { PriceHistory } from "@/app/api/entities";
import { cn } from "@/lib/utils";

export default function ImportProgressView({
  importData,
  onImportComplete,
  onBack
}) {
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [results, setResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  useEffect(() => {
    if (importData && !isProcessing && !results) {
      startImport();
    }
  }, [importData, isProcessing, results]);

  // Função auxiliar para validar números
  const safeToNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || String(value).trim() === '') return defaultValue;
    const num = parseFloat(String(value).replace(',', '.'));
    return isNaN(num) || !isFinite(num) ? defaultValue : num;
  };

  // Função para aguardar
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Função para buscar ingrediente existente
  const findExistingIngredient = async (name) => {
    try {
      // Buscar por nome exato
      const exactMatch = await Ingredient.filter({ name: name.trim() });
      if (exactMatch && exactMatch.length > 0) {
        addLog(`Ingrediente exato encontrado: "${name}" (ID: ${exactMatch[0].id})`, "info");
        return exactMatch[0];
      }

      // Buscar por similaridade
      const allIngredients = await Ingredient.list();
      if (allIngredients && allIngredients.length > 0) {
        const normalizedSearchName = name.toLowerCase().trim();
        
        const similarMatch = allIngredients.find(ing => {
          const ingName = (ing.name || '').toLowerCase().trim();
          const ingCommercial = (ing.commercial_name || '').toLowerCase().trim();
          
          return ingName === normalizedSearchName || 
                 ingCommercial === normalizedSearchName ||
                 (ingName.includes(normalizedSearchName) && normalizedSearchName.length > 3) || // Partial match if search term is long enough
                 (normalizedSearchName.includes(ingName) && ingName.length > 3); // Partial match if existing name is long enough
        });
        
        if (similarMatch) {
          addLog(`Ingrediente similar encontrado: "${name}" -> "${similarMatch.name}" (ID: ${similarMatch.id})`, "info");
        }
        return similarMatch || null;
      }
      addLog(`Nenhum ingrediente encontrado para "${name}"`, "info");
      return null;
    } catch (error) {addLog(`Erro ao buscar ingrediente "${name}": ${error.message}`, "error");
      return null;
    }
  };

  // Função para buscar ou criar fornecedor
  const findOrCreateSupplier = async (supplierData) => {
    if (!supplierData || !supplierData.company_name) {
      addLog(`Dados do fornecedor incompletos. Não é possível buscar/criar.`, "warning");
      return null;
    }
    
    try {
      // Buscar fornecedor existente
      const existingSuppliers = await Supplier.filter({ 
        company_name: supplierData.company_name 
      });
      
      if (existingSuppliers && existingSuppliers.length > 0) {
        addLog(`Fornecedor encontrado: "${supplierData.company_name}" (ID: ${existingSuppliers[0].id})`, "info");
        return existingSuppliers[0];
      }
      
      // Criar novo fornecedor
      addLog(`Criando novo fornecedor: "${supplierData.company_name}"`, "info");
      const newSupplier = await Supplier.create({
        company_name: supplierData.company_name,
        cnpj: supplierData.cnpj || '',
        active: true
      });
      addLog(`Fornecedor criado: "${newSupplier.company_name}" (ID: ${newSupplier.id})`, "success");
      return newSupplier;
    } catch (error) {addLog(`Erro ao buscar/criar fornecedor "${supplierData.company_name}": ${error.message}`, "error");
      return null;
    }
  };

  // Função para consolidar dados
  const consolidateIngredientData = (existingIngredient, newData) => {
    const consolidated = { ...existingIngredient };
    
    // Atualizar preço se diferente ou mais recente
    if (newData.current_price !== existingIngredient.current_price) {
      consolidated.current_price = newData.current_price;
      consolidated.last_update = newData.last_update;
      addLog(`Preço atualizado de ${existingIngredient.current_price} para ${newData.current_price}`, "info");
    }
    
    // Consolidar outros campos se vazios no existente ou se newData for mais específico
    if (newData.main_supplier && (!consolidated.main_supplier || consolidated.main_supplier === '')) {
      consolidated.main_supplier = newData.main_supplier;
      addLog(`Fornecedor principal definido: ${newData.main_supplier}`, "info");
    }
    if (newData.supplier_id && (!consolidated.supplier_id || consolidated.supplier_id === '')) {
      consolidated.supplier_id = newData.supplier_id;
      addLog(`ID do fornecedor definido: ${newData.supplier_id}`, "info");
    }
    if (newData.supplier_code && (!consolidated.supplier_code || consolidated.supplier_code === '')) {
      consolidated.supplier_code = newData.supplier_code;
      addLog(`Código do fornecedor definido: ${newData.supplier_code}`, "info");
    }
    if (newData.brand && (!consolidated.brand || consolidated.brand === '')) {
      consolidated.brand = newData.brand;
      addLog(`Marca definida: ${newData.brand}`, "info");
    }
    if (newData.commercial_name && (!consolidated.commercial_name || consolidated.commercial_name === '')) {
      consolidated.commercial_name = newData.commercial_name;
      addLog(`Nome comercial definido: ${newData.commercial_name}`, "info");
    }
    // Priorize a categoria do newData se a existente for "Outros" ou vazia
    if (newData.category && (consolidated.category === 'Outros' || !consolidated.category || consolidated.category === '')) {
      consolidated.category = newData.category;
      addLog(`Categoria definida: ${newData.category}`, "info");
    }
    
    // Consolidar notas (append new notes)
    if (newData.notes && newData.notes.trim() !== '') {
      const newNote = newData.notes.trim();
      if (consolidated.notes) {
        if (!consolidated.notes.includes(newNote)) { // Avoid duplicating notes if identical
          consolidated.notes += ` | ${newNote}`;
          addLog(`Notas atualizadas: "${newNote}" adicionada`, "info");
        }
      } else {
        consolidated.notes = newNote;
        addLog(`Notas adicionadas: "${newNote}"`, "info");
      }
    }
    
    return consolidated;
  };

  const startImport = async () => {
    setIsProcessing(true);
    setError(null);
    setLogs([]); // Clear logs on new import start
    setProgress(0);
    setResults(null); // Clear previous results

    try {
      addLog("Iniciando importação com consolidação inteligente...", "info");
      addLog(`Dados recebidos - Tipo: ${typeof importData}`, "info");
      addLog(`Estrutura dos dados: ${JSON.stringify(Object.keys(importData || {})).slice(0, 100)}${(Object.keys(importData || {}).length > 100 ? '...' : '')}`, "info");
      
      let ingredientsToProcess = [];
      
      if (Array.isArray(importData)) {
        ingredientsToProcess = importData;
        addLog(`Detectado array direto com ${ingredientsToProcess.length} itens`, "info");
      } else if (importData && Array.isArray(importData.ingredients)) {
        ingredientsToProcess = importData.ingredients;
        addLog(`Detectado objeto com propriedade 'ingredients': ${ingredientsToProcess.length} itens`, "info");
      } else if (importData && importData.commercial_data && Array.isArray(importData.commercial_data)) {
        ingredientsToProcess = importData.commercial_data;
        addLog(`Detectado dados comerciais: ${ingredientsToProcess.length} itens`, "info");
      } else if (importData && typeof importData === 'object') {
        const keys = Object.keys(importData);
        for (const key of keys) {
          if (Array.isArray(importData[key]) && importData[key].length > 0) {
            ingredientsToProcess = importData[key];
            addLog(`Detectado array na propriedade '${key}': ${ingredientsToProcess.length} itens`, "info");
            break;
          }
        }
      }

      addLog(`Total de ingredientes extraídos para processar: ${ingredientsToProcess.length}`, "info");
      
      if (ingredientsToProcess.length === 0) {
        addLog("ERRO: Nenhum ingrediente válido encontrado nos dados", "error");
        addLog(`Debug - Dados completos recebidos (primeiros 500 chars): ${JSON.stringify(importData, null, 2).slice(0, 500)}${(JSON.stringify(importData, null, 2).length > 500 ? '...' : '')}`, "error");
        setError("Nenhum ingrediente válido encontrado nos dados de importação. Verifique a estrutura do arquivo.");
        setIsProcessing(false); // Make sure processing state is reset
        return;
      }

      // Log dos primeiros itens para verificar estrutura
      if (ingredientsToProcess.length > 0) {
        addLog(`Exemplo do primeiro item: ${JSON.stringify(ingredientsToProcess[0], null, 2).slice(0, 200)}${(JSON.stringify(ingredientsToProcess[0], null, 2).length > 200 ? '...' : '')}`, "info");
        if (ingredientsToProcess.length > 1) {
          addLog(`Exemplo do segundo item: ${JSON.stringify(ingredientsToProcess[1], null, 2).slice(0, 200)}${(JSON.stringify(ingredientsToProcess[1], null, 2).length > 200 ? '...' : '')}`, "info");
        }
      }

      const importResults = {
        created: [],
        updated: [],
        errors: [],
        price_history_created_count: 0,
        suppliers_created: 0,
        metadata: {
          total_ingredients_processed: ingredientsToProcess.length,
          processed_at: new Date().toISOString(),
          processing_time_ms: 0
        }
      };

      const startTime = Date.now();
      addLog(`Iniciando processamento de ${ingredientsToProcess.length} ingredientes`, "info");

      for (let i = 0; i < ingredientsToProcess.length; i++) {
        const item = ingredientsToProcess[i];
        
        // Determinar o nome do item para logs
        const finalName = item._mapping?.finalName || item.name || item.commercial_name || `Item ${i + 1}`;
        const actionType = item._mapping?.action || 'auto'; // 'create', 'update', 'auto' (implies consolidate if exists, else create)

        addLog(`[${i + 1}/${ingredientsToProcess.length}] Processando: "${finalName}" (Ação intencional: ${actionType})`, "info");
        setCurrentItem(`Processando ${i + 1}/${ingredientsToProcess.length}: ${finalName}`);

        try {
          // Throttling para evitar rate limit ou sobrecarga
          if (i > 0) {
            await sleep(300);
          }

          // Validações básicas
          if (!finalName || finalName.trim().length === 0) {
            addLog(`Nome final vazio para item ${i + 1}. Pulando.`, "error");
            importResults.errors.push({
              item_index: i + 1,
              name: `Item ${i + 1} (Nome vazio)`,
              reason: "Nome final não definido ou vazio"
            });
            continue;
          }

          const currentPrice = safeToNumber(item.base_price || item.current_price, -1);
          if (currentPrice <= 0) {
            addLog(`Preço inválido (${currentPrice}) para "${finalName}". Pulando.`, "error");
            importResults.errors.push({
              item_index: i + 1,
              name: finalName,
              reason: `Preço inválido: ${currentPrice}. Deve ser um valor positivo.`
            });
            continue;
          }

          // Buscar ingrediente existente
          addLog(`Buscando ingrediente existente para "${finalName}"...`, "info");
          const existingIngredient = await findExistingIngredient(finalName);
          
          let savedIngredient;

          if (existingIngredient) {
            addLog(`Found existing ingredient "${existingIngredient.name}" (ID: ${existingIngredient.id}). Action type from mapping: "${actionType}"`, "info");

            if (actionType === 'create') {
              addLog(`Conflito: Tentou criar "${finalName}" mas um ingrediente existente foi encontrado (ID: ${existingIngredient.id}). Pulando para evitar duplicação.`, "error");
              importResults.errors.push({
                item_index: i + 1,
                name: finalName,
                reason: `Conflito: Tentou criar, mas ingrediente com este nome já existe (ID: ${existingIngredient.id})`
              });
              continue; // Skip this item
            }
            // Default behavior for existing ingredient (including actionType 'update' or 'auto') is to update/consolidate
            addLog(`Atualizando/Consolidando "${existingIngredient.name}" (ID: ${existingIngredient.id})`, "info");
            const consolidatedData = consolidateIngredientData(existingIngredient, {
                name: finalName.trim(), // Pass finalName for consolidation logic if needed
                unit: item.unit || existingIngredient.unit || 'kg', // Use existing unit if new is not provided
                current_price: currentPrice,
                last_update: item.last_price_update || new Date().toISOString().split('T')[0],
                active: item.active !== false,
                category: item.category || 'Outros',
                commercial_name: item.commercial_name,
                notes: item.notes,
                main_supplier: item.supplier_name,
                supplier_code: item.supplier_code,
                brand: item.brand_name
            });

            savedIngredient = await Ingredient.update(existingIngredient.id, consolidatedData);
            
            importResults.updated.push({
              name: savedIngredient.name,
              id: savedIngredient.id,
              action: 'updated_consolidated'
            });
            addLog(`Ingrediente atualizado: "${finalName}"`, "success");

          } else { // No existing ingredient found
            if (actionType === 'update') {
              addLog(`Erro: Tentou atualizar "${finalName}" mas nenhum ingrediente existente foi encontrado. Pulando.`, "error");
              importResults.errors.push({
                item_index: i + 1,
                name: finalName,
                reason: `Não foi possível atualizar: Nenhum ingrediente existente com este nome foi encontrado`
              });
              continue; // Skip this item
            }
            // Default behavior for non-existing ingredient (including actionType 'create' or 'auto') is to create
            addLog(`Criando novo ingrediente: "${finalName}"`, "info");

            // Buscar/criar fornecedor antes de criar o ingrediente
            let supplierId = null;
            if (item.supplier_name) {
              addLog(`Processando fornecedor para "${finalName}": "${item.supplier_name}"`, "info");
              const supplier = await findOrCreateSupplier({
                company_name: item.supplier_name,
                cnpj: item.supplier_cnpj
              });
              if (supplier) {
                supplierId = supplier.id;
                importResults.suppliers_created++; // Only count if supplier was new for this item
                addLog(`Fornecedor processado: ID ${supplierId}`, "info");
              }
            }
            
            const ingredientPayload = {
              name: finalName.trim(),
              unit: item.unit || 'kg',
              current_price: currentPrice,
              base_price: currentPrice, // base_price usually mirrors current_price on initial creation
              last_update: item.last_price_update || new Date().toISOString().split('T')[0],
              active: item.active !== false,
              category: item.category || 'Outros',
              ingredient_type: 'both'
            };

            // Adicionar campos opcionais
            if (item.commercial_name) ingredientPayload.commercial_name = item.commercial_name.trim();
            if (item.notes) ingredientPayload.notes = item.notes.trim();
            if (item.supplier_name) ingredientPayload.main_supplier = item.supplier_name.trim();
            if (supplierId) ingredientPayload.supplier_id = supplierId;
            if (item.supplier_code) ingredientPayload.supplier_code = item.supplier_code.trim();
            if (item.brand_name) ingredientPayload.brand = item.brand_name.trim();
            
            savedIngredient = await Ingredient.create(ingredientPayload);
            
            importResults.created.push({
              name: savedIngredient.name,
              id: savedIngredient.id,
              action: 'created_new'
            });
            addLog(`Novo ingrediente criado: "${finalName}" (ID: ${savedIngredient.id})`, "success");
          }

          // Criar histórico de preços (para ambos, criados e atualizados)
          if (currentPrice > 0 && savedIngredient) {
            try {
              await sleep(100); // Pequeno delay
              
              const historyPayload = {
                ingredient_id: savedIngredient.id,
                new_price: currentPrice,
                old_price: existingIngredient ? existingIngredient.current_price : null,
                date: item.last_price_update || new Date().toISOString().split('T')[0],
                supplier: item.supplier_name || '',
                category: savedIngredient.category || 'Outros',
                notes: `Importação: ${item.notes || ''}`.trim()
              };

              await PriceHistory.create(historyPayload);
              importResults.price_history_created_count++;
              addLog(`Histórico de preços criado para "${finalName}"`, "info");
            } catch (historyError) {
              addLog(`Erro ao criar histórico para "${finalName}": ${historyError.message}`, "warning");}
          }

        } catch (error) {
          addLog(`Erro crítico ao processar "${finalName}": ${error.message}`, "error");importResults.errors.push({
            item_index: i + 1,
            name: finalName,
            reason: `Erro: ${error.message}`
          });
        }

        const progressPercent = Math.round(((i + 1) / ingredientsToProcess.length) * 100);
        setProgress(progressPercent);
      }

      const endTime = Date.now();
      importResults.metadata.processing_time_ms = endTime - startTime;

      // Final logs
      addLog(`Importação concluída!`, "success");
      addLog(`Novos ingredientes criados: ${importResults.created.length}`, "success");
      addLog(`Ingredientes atualizados/consolidados: ${importResults.updated.length}`, "success");
      addLog(`Novos fornecedores criados: ${importResults.suppliers_created}`, "info");
      addLog(`Registros de histórico de preços criados: ${importResults.price_history_created_count}`, "info");
      addLog(`Itens com erros: ${importResults.errors.length}`, importResults.errors.length > 0 ? "error" : "info");
      addLog(`Tempo total de processamento: ${importResults.metadata.processing_time_ms}ms`, "info");
      
      setResults(importResults);
      setCurrentItem('');
      setProgress(100); // Ensure progress is 100% on completion

    } catch (err) {setError(err.message || 'Erro desconhecido durante a importação');
      addLog(`Erro crítico geral: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            {isProcessing ? 'Importando Dados...' :
             results ? 'Importação Concluída' :
             error ? 'Erro na Importação' : 'Pronto para importar'}
          </h2>
          <p className="text-gray-500">
            {results ? 'Resultados detalhados da importação' : 
             isProcessing ? 'Processamento dos dados mapeados' : 
             error ? 'Verifique os logs para detalhes do erro' : 'Aguardando início da importação'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso da Importação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Current Item */}
          {isProcessing && currentItem && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{currentItem}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {results && !error && (
            <Alert variant="default" className="border-green-500 text-green-700">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Importação concluída! {results.created.length} novos, {results.updated.length} atualizados, {results.errors.length} erros.
              </AlertDescription>
            </Alert>
          )}

          {/* Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Log do Processo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <div className="space-y-1 text-sm">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-2 py-1 px-2 rounded text-xs",
                        log.type === 'error' && "bg-red-50 text-red-700",
                        log.type === 'warning' && "bg-yellow-50 text-yellow-700",
                        log.type === 'success' && "bg-green-50 text-green-700",
                        log.type === 'info' && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <span className="text-gray-500 min-w-[60px]">{log.timestamp}</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-gray-400 text-center py-4">
                      {isProcessing ? "Iniciando..." : "Aguardando início..."}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultados */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Resultados da Importação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {results.created?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Novos Ingredientes</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.updated?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Atualizados/Consolidados</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {results.price_history_created_count || 0}
                    </div>
                    <div className="text-sm text-gray-600">Históricos de Preços</div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {results.suppliers_created || 0}
                    </div>
                    <div className="text-sm text-gray-600">Novos Fornecedores</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {results.errors?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Erros</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">
                      {results.metadata?.total_ingredients_processed || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Processados</div>
                  </div>
                </div>
                
                {/* Botões */}
                <div className="flex gap-3 mt-6">
                  <Button onClick={onBack} variant="outline" className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Nova Importação
                  </Button>
                  <Button 
                    onClick={() => {
                      onImportComplete?.(results); // Pass results to parent
                      // Reload to ensure data refresh if navigating back to main list
                      window.location.reload(); 
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalizar e Ver Lista
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
