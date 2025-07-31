
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ingredient } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";
import { Brand } from "@/app/api/entities";
import { PriceHistory } from "@/app/api/entities";

export default function ImportProgressDialog({
  isOpen,
  onClose,
  importData,
  onImportComplete
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [currentItemName, setCurrentItemName] = useState('');

  const steps = [
    "Validando dados",
    "Processando fornecedores",
    "Processando marcas",
    "Processando ingredientes",
    "Criando histórico de preços",
    "Finalizando importação"
  ];

  // Função para validar e converter números
  const safeToNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || String(value).trim() === '') return defaultValue;
    const num = parseFloat(String(value).replace(',', '.'));
    return isNaN(num) || !isFinite(num) ? defaultValue : num;
  };

  // Função para validar string
  const isValidString = (value) => {
    return value && typeof value === 'string' && value.trim().length > 0;
  };

  // Função para validar data no formato YYYY-MM-DD
  const isValidDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString + 'T00:00:00.000Z');
    return date instanceof Date && !isNaN(date.getTime());
  };

  const startImport = async () => {
    if (!importData?.commercial_data && !importData?.mappings) return;

    setIsImporting(true);
    setCurrentStep(0);
    setProgress(0);
    setError(null);
    setResults(null);

    const results = {
      suppliers_created: [],
      suppliers_updated: [],
      brands_created: [],
      brands_updated: [],
      ingredients_created: [],
      ingredients_updated: [],
      price_histories_created: [],
      errors: [],
      summary: {
        total_processed: 0,
        suppliers_success: 0,
        brands_success: 0,
        ingredients_success: 0,
        price_histories_success: 0
      }
    };

    try {// Etapa 1: Validação
      setCurrentStep(0);
      setProgress(5);

      // Usar dados mapeados se disponível, senão usar dados originais
      const items = importData.mappings 
        ? importData.mappings.map(mapping => ({
            ...mapping.originalData,
            _mapping: {
              action: mapping.action,
              linkedIngredientId: mapping.linkedIngredient?.id,
              finalName: mapping.finalName
            }
          }))
        : importData.commercial_data;

      results.summary.total_processed = items.length;

      if (items.length === 0) {
        throw new Error('Nenhum item para processar');
      }

      // Etapa 2: Carregar dados existentes
      setCurrentStep(1);
      setProgress(10);const existingSuppliers = await Supplier.list();
      const supplierMap = new Map();
      existingSuppliers.forEach(s => {
        if (s.company_name) {
          supplierMap.set(s.company_name.toLowerCase().trim(), s);
        }
      });const existingBrands = await Brand.list();
      const brandMap = new Map();
      existingBrands.forEach(b => {
        if (b.name) {
          brandMap.set(b.name.toLowerCase().trim(), b);
        }
      });

      // Processar cada item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const mapping = item._mapping;
        const itemName = mapping?.finalName || item.commercial_name || `Item ${i + 1}`;
        setCurrentItemName(itemName);

        const baseProgress = 15 + (i / items.length) * 80;
        setProgress(baseProgress);try {
          // Validações básicas
          if (!isValidString(itemName)) {
            results.errors.push({
              item_index: i,
              name: itemName,
              reason: "Nome do ingrediente é obrigatório"
            });
            continue;
          }

          const basePrice = safeToNumber(item.base_price, -1);
          if (basePrice < 0) {
            results.errors.push({
              item_index: i,
              name: itemName,
              reason: "Preço base é obrigatório"
            });
            continue;
          }

          // Processar fornecedor (se fornecido)
          let supplier = null;
          if (isValidString(item.supplier_name)) {
            const supplierKey = item.supplier_name.toLowerCase().trim();
            supplier = supplierMap.get(supplierKey);

            if (!supplier) {const supplierData = {
                company_name: item.supplier_name.trim(),
                active: true
              };

              if (isValidString(item.supplier_cnpj)) supplierData.cnpj = item.supplier_cnpj.trim();
              if (isValidString(item.supplier_address)) supplierData.address = item.supplier_address.trim();
              if (isValidString(item.supplier_email)) supplierData.email = item.supplier_email.trim();
              if (isValidString(item.supplier_phone)) supplierData.vendor_phone = item.supplier_phone.trim();
              if (isValidString(item.supplier_category)) supplierData.category = item.supplier_category.trim();

              supplier = await Supplier.create(supplierData);
              supplierMap.set(supplierKey, supplier);
              results.suppliers_created.push({ name: supplier.company_name, id: supplier.id });
              results.summary.suppliers_success++;
            }
          }

          // Processar marca (se fornecida)
          let brand = null;
          if (isValidString(item.brand_name)) {
            const brandKey = item.brand_name.toLowerCase().trim();
            brand = brandMap.get(brandKey);

            if (!brand) {const brandData = {
                name: item.brand_name.trim(),
                active: true
              };

              if (isValidString(item.brand_manufacturer)) brandData.manufacturer = item.brand_manufacturer.trim();
              if (isValidString(item.brand_description)) brandData.description = item.brand_description.trim();
              if (item.brand_preferred !== undefined) brandData.preferred = !!item.brand_preferred;

              brand = await Brand.create(brandData);
              brandMap.set(brandKey, brand);
              results.brands_created.push({ name: brand.name, id: brand.id });
              results.summary.brands_success++;
            }
          }

          // Processar ingrediente baseado no mapeamento
          const lastUpdate = isValidDate(item.last_price_update)
            ? item.last_price_update
            : new Date().toISOString().split('T')[0];

          let savedIngredient = null;

          if (mapping && mapping.action === 'update' && mapping.linkedIngredientId) {
            // VINCULAR A INGREDIENTE EXISTENTE
            const updateData = {
              commercial_name: item.commercial_name?.trim() || itemName,
              current_price: basePrice,
              base_price: basePrice,
              last_update: lastUpdate,
              ingredient_type: 'both' // Always 'both' for imported ingredients
            };

            // Adicionar campos comerciais se fornecidos
            if (supplier) {
              updateData.main_supplier = supplier.company_name;
              updateData.supplier_id = supplier.id;
            }
            if (brand) {
              updateData.brand = brand.name;
              updateData.brand_id = brand.id;
            }
            if (isValidString(item.supplier_code)) updateData.supplier_code = item.supplier_code.trim();
            if (item.current_stock !== undefined) updateData.current_stock = safeToNumber(item.current_stock, 0);
            if (isValidString(item.notes)) updateData.notes = item.notes.trim();
            if (item.active !== undefined) updateData.active = item.active; // Allow updating active status
            if (isValidString(item.category)) updateData.category = item.category.trim(); // Allow updating category

            savedIngredient = await Ingredient.update(mapping.linkedIngredientId, updateData);
            results.ingredients_updated.push({
              name: savedIngredient.name, // Use the existing ingredient's name
              id: savedIngredient.id
            });} else {
            // CRIAR NOVO INGREDIENTE
            const ingredientData = {
              name: itemName,
              commercial_name: item.commercial_name?.trim() || itemName,
              unit: item.unit || 'kg',
              current_price: basePrice,
              base_price: basePrice,
              last_update: lastUpdate,
              active: item.active !== false,
              category: item.category || 'Outros',
              ingredient_type: 'both',
              taco_variations: [] // Deixar vazio para vinculação manual
            };

            // Adicionar campos opcionais
            if (isValidString(item.notes)) ingredientData.notes = item.notes.trim();
            if (supplier) {
              ingredientData.main_supplier = supplier.company_name;
              ingredientData.supplier_id = supplier.id;
            }
            if (brand) {
              ingredientData.brand = brand.name;
              ingredientData.brand_id = brand.id;
            }
            if (isValidString(item.supplier_code)) ingredientData.supplier_code = item.supplier_code.trim();
            if (item.current_stock !== undefined) ingredientData.current_stock = safeToNumber(item.current_stock, 0);

            savedIngredient = await Ingredient.create(ingredientData);
            results.ingredients_created.push({
              name: savedIngredient.name,
              id: savedIngredient.id
            });}

          results.summary.ingredients_success++;

          // Processar histórico de preços
          if (Array.isArray(item.price_history) && item.price_history.length > 0) {for (const historyEntry of item.price_history) {
              try {
                if (!isValidDate(historyEntry.date)) continue;

                const newPrice = safeToNumber(historyEntry.price || historyEntry.new_price, -1);
                if (newPrice < 0) continue;

                const oldPrice = historyEntry.old_price ? safeToNumber(historyEntry.old_price, null) : null;
                let percentageChange = 0;

                if (oldPrice !== null && oldPrice > 0) {
                  percentageChange = ((newPrice - oldPrice) / oldPrice) * 100;
                }

                const historyData = {
                  ingredient_id: savedIngredient.id,
                  old_price: oldPrice,
                  new_price: newPrice,
                  supplier: supplier?.company_name || '',
                  date: historyEntry.date,
                  category: item.category || 'Outros', // Use item category for history
                  percentage_change: percentageChange,
                  min_price: oldPrice !== null ? Math.min(oldPrice, newPrice) : newPrice,
                  max_price: oldPrice !== null ? Math.max(oldPrice, newPrice) : newPrice,
                  total_variation: percentageChange,
                  price_progression: [{
                    from_price: oldPrice,
                    to_price: newPrice,
                    variation: percentageChange,
                    date: historyEntry.date
                  }]
                };

                await PriceHistory.create(historyData);
                results.price_histories_created.push({
                  ingredient_name: itemName,
                  ingredient_id: savedIngredient.id,
                  date: historyEntry.date,
                  price: newPrice
                });
                results.summary.price_histories_success++;

              } catch (historyError) {results.errors.push({
                  item_index: i,
                  name: itemName,
                  reason: `Erro no histórico: ${historyError.message}`
                });
              }
            }
          }

        } catch (itemError) {results.errors.push({
            item_index: i,
            name: itemName,
            reason: itemError.message
          });
        }
      }

      // Finalizar
      setCurrentStep(steps.length - 1);
      setProgress(100);
      setResults(results);// Chamar callback de sucesso
      if (onImportComplete) {
        setTimeout(() => {
          onImportComplete(results);
        }, 1000);
      }

    } catch (err) {setError(err.message || 'Erro desconhecido na importação');
    } finally {
      setIsImporting(false);
      setCurrentItemName('');
    }
  };

  const getStepIcon = (stepIndex) => {
    if (stepIndex < currentStep) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (stepIndex === currentStep && isImporting) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (error && stepIndex === currentStep) return <XCircle className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isImporting ? 'Importando Dados Comerciais...' :
             results ? 'Importação Concluída' :
             error ? 'Erro na Importação' : 'Importar Dados Comerciais'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {/* Current Item */}
          {isImporting && currentItemName && (
            <div className="text-sm text-gray-600">
              Processando: <span className="font-medium">{currentItemName}</span>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                {getStepIcon(index)}
                <span className={
                  index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-500'
                }>
                  {step}
                </span>
              </div>
            ))}
          </div>

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

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Fornecedores criados:</strong> {results.suppliers_created.length}
                </div>
                <div>
                  <strong>Marcas criadas:</strong> {results.brands_created.length}
                </div>
                <div>
                  <strong>Ingredientes criados:</strong> {results.ingredients_created.length}
                </div>
                <div>
                  <strong>Ingredientes atualizados:</strong> {results.ingredients_updated.length}
                </div>
                <div>
                  <strong>Históricos criados:</strong> {results.price_histories_created.length}
                </div>
                <div>
                  <strong>Erros:</strong> {results.errors.length}
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
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {!isImporting && !results && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={startImport} className="bg-blue-600 hover:bg-blue-700">
                  Iniciar Importação
                </Button>
              </>
            )}

            {isImporting && (
              <Button disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </Button>
            )}

            {(results || error) && (
              <Button onClick={onClose}>
                Fechar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
