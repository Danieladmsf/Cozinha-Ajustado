'use client';


import React, { useState } from 'react';
import { NutritionFood } from '@/app/api/entities';
import { Ingredient } from '@/app/api/entities';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { 
  Upload,
  FileText,
  AlertTriangle,
  Check,
  Loader2,
  Link as LinkIcon
} from "lucide-react";

// Função utilitária para retry com delay exponencial
const retryWithDelay = async (fn, retries = 5, initialDelay = 2500) => {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Adicionar um pequeno delay aleatório para evitar chamadas simultâneas
      const jitter = Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, jitter));
      
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Se for erro de rate limit, aguarde mais tempo entre tentativas
      if (error?.response?.status === 429) {
        const delay = initialDelay * Math.pow(1.5, attempt); // Backoff exponencial
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Se for outro tipo de erro, não tente novamente
        throw error;
      }
    }
  }
  
  throw lastError || new Error("Excedeu o número máximo de tentativas");
};

export default function NutritionImport() {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [fixingIds, setFixingIds] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/json") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Por favor, selecione um arquivo JSON válido.");
      setFile(null);
    }
  };

  // Adicionar as funções ausentes
  const handleFixIngredientIds = async () => {
    setFixingIds(true);
    setResults([{
      name: "Iniciando correção de IDs dos ingredientes...",
      status: 'progress',
      message: "Verificando ingredientes vinculados"
    }]);
    
    try {
      // Buscar todos os ingredientes
      const ingredients = await Ingredient.list();
      
      // Contar quantos precisam de correção
      const needFixCount = ingredients.filter(ing => 
        ing.nutrition_id && !ing.taco_id
      ).length;
      
      setResults(prev => [...prev, {
        name: `Ingredientes para corrigir: ${needFixCount}`,
        status: 'info',
        message: "Buscando informações nutricionais"
      }]);
      
      // Contador de progresso
      let fixed = 0;
      let errors = 0;
      
      // Corrigir cada ingrediente
      for (const ingredient of ingredients) {
        if (ingredient.nutrition_id && !ingredient.taco_id) {
          try {
            // Buscar item nutricional
            const nutritionItems = await NutritionFood.filter({id: ingredient.nutrition_id});
            
            if (nutritionItems.length > 0) {
              const nutritionItem = nutritionItems[0];
              
              // Atualizar o ingrediente com o taco_id
              if (nutritionItem.taco_id) {
                await Ingredient.update(ingredient.id, {
                  ...ingredient,
                  taco_id: nutritionItem.taco_id
                });
                
                fixed++;
                
                if (fixed % 10 === 0 || fixed === needFixCount) {
                  setResults(prev => [...prev, {
                    name: `Progresso: ${Math.round((fixed/needFixCount) * 100)}%`,
                    status: 'progress',
                    message: `Corrigidos ${fixed} de ${needFixCount}`
                  }]);
                }
              }
            }
          } catch (err) {
            errors++;
            console.error('[TACO] Erro ao corrigir ingrediente:', ingredient.name, err);
          }
        }
      }
      
      // Resumo final
      setResults(prev => [
        {
          name: "Correção de IDs concluída",
          status: 'success',
          message: `Total corrigido: ${fixed}, Erros: ${errors}`
        },
        ...prev
      ]);
      
      toast({
        title: "Correção concluída",
        description: `Total de ingredientes corrigidos: ${fixed}`
      });
      
    } catch (err) {
      console.error('[TACO] Erro na correção de IDs:', err);
      setResults(prev => [
        {
          name: "Erro na correção",
          status: 'error',
          error: err.message
        },
        ...prev
      ]);
      
      toast({
        variant: "destructive",
        title: "Erro na correção",
        description: err.message
      });
    } finally {
      setFixingIds(false);
    }
  };
  
  const handleFixIds = async () => {
    setFixingIds(true);
    setResults([{
      name: "Iniciando correção de IDs TACO...",
      status: 'progress',
      message: "Verificando itens com IDs inconsistentes"
    }]);
    
    try {
      // Buscar todos os alimentos nutricionais
      const foods = await NutritionFood.list();
      
      // Identificar itens sem taco_id ou com taco_id inconsistente
      const itemsToFix = foods.filter(food => 
        !food.taco_id || 
        (food.id && food.taco_id && food.id.toString() !== food.taco_id.toString())
      );
      
      setResults(prev => [...prev, {
        name: `Itens para corrigir: ${itemsToFix.length}`,
        status: 'info',
        message: "Atualizando IDs TACO nos itens"
      }]);
      
      // Contador de progresso
      let fixed = 0;
      let errors = 0;
      
      // Corrigir cada item
      for (const food of itemsToFix) {
        try {
          // Definir o taco_id como o id se não estiver definido
          const newTacoId = food.id.toString();
          
          await NutritionFood.update(food.id, {
            ...food,
            taco_id: newTacoId
          });
          
          fixed++;
          
          if (fixed % 20 === 0 || fixed === itemsToFix.length) {
            setResults(prev => [...prev, {
              name: `Progresso: ${Math.round((fixed/itemsToFix.length) * 100)}%`,
              status: 'progress',
              message: `Corrigidos ${fixed} de ${itemsToFix.length}`
            }]);
          }
        } catch (err) {
          errors++;
          console.error('[TACO] Erro ao corrigir item:', food.name, err);
        }
      }
      
      // Resumo final
      setResults(prev => [
        {
          name: "✅ Correção de IDs TACO concluída",
          status: 'success',
          message: `Total corrigido: ${fixed}, Erros: ${errors}`
        },
        ...prev
      ]);
      
      toast({
        title: "Correção concluída",
        description: `Total de itens com ID TACO corrigido: ${fixed}`
      });
      
    } catch (err) {
      console.error('[TACO] Erro na correção de IDs TACO:', err);
      setResults(prev => [
        {
          name: "Erro na correção",
          status: 'error',
          error: err.message
        },
        ...prev
      ]);
      
      toast({
        variant: "destructive",
        title: "Erro na correção",
        description: err.message
      });
    } finally {
      setFixingIds(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
        const content = await file.text();
        const data = JSON.parse(content);
        
        // Detectar se é um arquivo de atualização de nomes
        const isNameUpdate = data.length > 0 && 
            Object.keys(data[0]).length === 2 && 
            'id' in data[0] && 
            'name' in data[0];

        setResults([{
            name: isNameUpdate ? "Iniciando atualização de nomes..." : "Iniciando importação completa...",
            status: 'progress',
            message: `Analisando ${data.length} registros`
        }]);

        const results = [];
        
        if (isNameUpdate) {
            // MODO DE ATUALIZAÇÃO DE NOMES
            for (const item of data) {
                try {
                    // Buscar pelo taco_id
                    const existingItems = await NutritionFood.filter({ taco_id: String(item.id) });
                    
                    if (existingItems && existingItems.length > 0) {
                        const existingItem = existingItems[0];
                        
                        // Atualizar apenas o nome
                        await NutritionFood.update(existingItem.id, {
                            name: item.name
                        });
                        
                        results.push({
                            name: item.name,
                            status: 'success',
                            message: `Nome atualizado: ${item.name}`
                        });
                    } else {
                        results.push({
                            name: `ID ${item.id}`,
                            status: 'error',
                            message: 'Item não encontrado'
                        });
                    }
                    
                    // Pequena pausa entre atualizações
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error('Erro ao atualizar nome:', error);
                    results.push({
                        name: item.name,
                        status: 'error',
                        message: error.message
                    });
                }
            }
            
            setResults(prev => [
                ...prev,
                {
                    name: "Atualização concluída",
                    status: 'success',
                    message: `${results.filter(r => r.status === 'success').length} nomes atualizados`
                }
            ]);
            
        } else {
            // MODO DE IMPORTAÇÃO COMPLETA
            // Função para converter qualquer valor para string
            const toValidString = (value) => {
                if (value === null || value === undefined) return "";
                if (value === 0 || value === 0.0) return "0";
                return value.toString();
            };
            
            const batchSize = 1;
            
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                
                setResults(prev => [...prev, {
                    name: "Progresso",
                    status: 'progress',
                    message: `Processando item ${i + 1} de ${data.length} (${Math.round((i+1)/data.length*100)}%)`
                }]);
                
                for (const item of batch) {
                    try {
                        // Verificar se já existe
                        const existingItems = await retryWithDelay(async () => {
                            return await NutritionFood.filter({ taco_id: String(item.id) });
                        });
                        
                        if (existingItems && existingItems.length > 0) {
                            results.push({
                                name: item.description,
                                status: 'info',
                                message: 'Item já existe, pulando'
                            });
                            continue;
                        }
                        
                        // Processar item convertendo todos os valores para string
                        const processedItem = {
                            // Campos base
                            name: item.description,
                            description: item.description,
                            category_name: item.category,
                            taco_id: String(item.id),
                            active: true,

                            // Campos numéricos (convertidos para string)
                            humidity_percents: toValidString(item.humidity_percents),
                            energy_kcal: toValidString(item.energy_kcal),
                            energy_kj: toValidString(item.energy_kj),
                            protein_g: toValidString(item.protein_g),
                            lipid_g: toValidString(item.lipid_g),
                            carbohydrate_g: toValidString(item.carbohydrate_g),
                            fiber_g: toValidString(item.fiber_g),
                            ashes_g: toValidString(item.ashes_g),

                            // Minerais
                            calcium_mg: toValidString(item.calcium_mg),
                            magnesium_mg: toValidString(item.magnesium_mg),
                            manganese_mg: toValidString(item.manganese_mg),
                            phosphorus_mg: toValidString(item.phosphorus_mg),
                            iron_mg: toValidString(item.iron_mg),
                            sodium_mg: toValidString(item.sodium_mg),
                            potassium_mg: toValidString(item.potassium_mg),
                            copper_mg: toValidString(item.copper_mg),
                            zinc_mg: toValidString(item.zinc_mg),

                            // Vitaminas
                            retinol_mcg: toValidString(item.retinol_mcg),
                            re_mcg: toValidString(item.re_mcg),
                            rae_mcg: toValidString(item.rae_mcg),
                            thiamine_mg: toValidString(item.thiamine_mg),
                            riboflavin_mg: toValidString(item.riboflavin_mg),
                            pyridoxine_mg: toValidString(item.pyridoxine_mg),
                            niacin_mg: toValidString(item.niacin_mg),
                            vitaminC_mg: toValidString(item.vitaminC_mg),

                            // Gorduras
                            cholesterol_mg: toValidString(item.cholesterol_mg),
                            saturated_g: toValidString(item.saturated_g),
                            monounsaturated_g: toValidString(item.monounsaturated_g),
                            polyunsaturated_g: toValidString(item.polyunsaturated_g),

                            // Ácidos graxos
                            "12:0_g": toValidString(item["12:0_g"]),
                            "14:0_g": toValidString(item["14:0_g"]),
                            "16:0_g": toValidString(item["16:0_g"]),
                            "18:0_g": toValidString(item["18:0_g"]),
                            "20:0_g": toValidString(item["20:0_g"]),
                            "22:0_g": toValidString(item["22:0_g"]),
                            "24:0_g": toValidString(item["24:0_g"]),
                            "14:1_g": toValidString(item["14:1_g"]),
                            "16:1_g": toValidString(item["16:1_g"]),
                            "18:1_g": toValidString(item["18:1_g"]),
                            "20:1_g": toValidString(item["20:1_g"]),
                            "18:2 n-6_g": toValidString(item["18:2 n-6_g"]),
                            "18:3 n-3_g": toValidString(item["18:3 n-3_g"]),
                            "20:4_g": toValidString(item["20:4_g"]),
                            "20:5_g": toValidString(item["20:5_g"]),
                            "22:5_g": toValidString(item["22:5_g"]),
                            "22:6_g": toValidString(item["22:6_g"]),
                            "18:1t_g": toValidString(item["18:1t_g"]),
                            "18:2t_g": toValidString(item["18:2t_g"]),

                            // Aminoácidos
                            tryptophan_g: toValidString(item.tryptophan_g),
                            threonine_g: toValidString(item.threonine_g),
                            isoleucine_g: toValidString(item.isoleucine_g),
                            leucine_g: toValidString(item.leucine_g),
                            lysine_g: toValidString(item.lysine_g),
                            methionine_g: toValidString(item.methionine_g),
                            cystine_g: toValidString(item.cystine_g),
                            phenylalanine_g: toValidString(item.phenylalanine_g),
                            tyrosine_g: toValidString(item.tyrosine_g),
                            valine_g: toValidString(item.valine_g),
                            arginine_g: toValidString(item.arginine_g),
                            histidine_g: toValidString(item.histidine_g),
                            alanine_g: toValidString(item.alanine_g),
                            aspartic_g: toValidString(item.aspartic_g),
                            glutamic_g: toValidString(item.glutamic_g),
                            glycine_g: toValidString(item.glycine_g),
                            proline_g: toValidString(item.proline_g),
                            serine_g: toValidString(item.serine_g)
                        };

                        // Criar o item
                        await retryWithDelay(async () => {
                            await NutritionFood.create(processedItem);
                        });

                        results.push({
                            name: processedItem.name,
                            status: 'success',
                            action: 'created'
                        });

                        // Esperar um pouco entre itens
                        await new Promise(resolve => setTimeout(resolve, 500));

                    } catch (error) {
                        console.error('[TACO] Erro ao processar item:', {
                            item: item.description || item.id,
                            error: error.message
                        });
                        
                        results.push({
                            name: item.description || `ID ${item.id}`,
                            status: 'error',
                            error: error.message
                        });
                    }
                }
            }
        }
        
        // Atualizar resultados finais
        const summary = {
            total: results.length,
            success: results.filter(r => r.status === 'success').length,
            skipped: results.filter(r => r.status === 'info').length,
            errors: results.filter(r => r.status === 'error').length
        };
        
        setResults([
            {
                name: isNameUpdate ? "Atualização concluída" : "Importação concluída",
                status: 'success',
                message: `Total: ${summary.total}, Criados: ${summary.success}, Pulados: ${summary.skipped}, Erros: ${summary.errors}`
            },
            ...results
        ]);
        
        toast({
            title: isNameUpdate ? "Atualização de nomes concluída" : "Importação concluída",
            description: `Total: ${summary.total}, Sucesso: ${summary.success}, Erros: ${summary.errors}`,
        });
        
    } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        setError(error.message);
        
        setResults([{
            name: "Erro na importação",
            status: 'error',
            error: error.message
        }]);
        
        toast({
            variant: "destructive",
            title: "Erro ao processar arquivo",
            description: error.message
        });
    } finally {
        setLoading(false);
    }
  };

// Atualizar o componente de exibição dos resultados para mostrar diferentes estados
const renderResults = () => {
    if (!results) return null;
    
    return (
        <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Resultados:</h3>
            <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.map((result, index) => (
                            <TableRow key={index}>
                                <TableCell>{result.name}</TableCell>
                                <TableCell>
                                    {result.status === 'success' && (
                                        <span className="text-green-600 flex items-center">
                                            <Check className="h-4 w-4 mr-1" />
                                            {result.action === 'updated' ? 'Atualizado' : 'Sucesso'}
                                            {result.message && <span className="ml-1 text-xs text-gray-500">({result.message})</span>}
                                        </span>
                                    )}
                                    {result.status === 'error' && (
                                        <span className="text-red-600 flex items-center">
                                            <AlertTriangle className="h-4 w-4 mr-1" />
                                            Erro: {result.error}
                                        </span>
                                    )}
                                    {result.status === 'info' && (
                                        <span className="text-blue-600 flex items-center">
                                            <FileText className="h-4 w-4 mr-1" />
                                            {result.message}
                                        </span>
                                    )}
                                    {result.status === 'progress' && (
                                        <span className="text-amber-600 flex items-center">
                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                            {result.message}
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
};

// Atualizar o return do componente para usar a função renderResults
return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Importação de Dados Nutricionais</h1>
          <p className="text-gray-500">
            Importe dados nutricionais da tabela TACO
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleFixIngredientIds}
            disabled={fixingIds}
            variant="outline"
          >
            {fixingIds ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Corrigindo IDs...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Corrigir IDs dos Ingredientes
              </>
            )}
          </Button>
        
          <Button
            onClick={handleFixIds}
            disabled={fixingIds}
            variant="outline"
          >
            {fixingIds ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Corrigindo IDs...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Corrigir IDs TACO
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivo</CardTitle>
          <CardDescription>
            Selecione um arquivo JSON com os dados nutricionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="max-w-sm"
            />
            <Button 
              onClick={handleImport}
              disabled={!file || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renderResults()}
        </CardContent>
      </Card>
    </div>
  );
}
