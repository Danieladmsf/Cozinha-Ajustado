import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  AlertTriangle, 
  Plus, 
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ingredient } from "@/app/api/entities";

export default function ImportMappingView({
  importData,
  onMappingComplete,
  onBack
}) {
  const [existingIngredients, setExistingIngredients] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInputs, setSearchInputs] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});

  useEffect(() => {
    if (importData) {
      loadExistingIngredients();
    }
  }, [importData]);

  const loadExistingIngredients = async () => {
    try {
      setLoading(true);
      const ingredients = await Ingredient.list();
      setExistingIngredients(ingredients || []);
      
      // Criar mapeamentos iniciais baseados em similaridade de nomes
      const initialMappings = (importData.commercial_data || []).map((item, index) => {
        const commercialName = item.commercial_name?.trim() || '';
        
        // Tentar encontrar match exato primeiro
        let suggestedMatch = ingredients.find(ing => 
          ing.name?.toLowerCase() === commercialName.toLowerCase()
        );
        
        // Se não encontrou match exato, tentar similaridade
        if (!suggestedMatch) {
          suggestedMatch = ingredients.find(ing => 
            ing.name?.toLowerCase().includes(commercialName.toLowerCase()) ||
            commercialName.toLowerCase().includes(ing.name?.toLowerCase())
          );
        }

        const mappingId = `import_${index}`;
        
        // Inicializar input de busca
        setSearchInputs(prev => ({
          ...prev,
          [mappingId]: suggestedMatch?.name || commercialName
        }));

        return {
          id: mappingId,
          originalData: item,
          commercialName: commercialName,
          supplier: item.supplier_name || 'N/A',
          price: item.base_price || 0,
          category: item.category || 'N/A',
          linkedIngredient: suggestedMatch || null,
          finalName: suggestedMatch?.name || commercialName,
          isNewIngredient: !suggestedMatch,
          confidence: suggestedMatch ? (
            suggestedMatch.name?.toLowerCase() === commercialName.toLowerCase() ? 'high' : 'medium'
          ) : 'low'
        };
      });

      setMappings(initialMappings);
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  const handleSearchInputChange = (mappingId, value) => {
    setSearchInputs(prev => ({ ...prev, [mappingId]: value }));
    setShowSuggestions(prev => ({ ...prev, [mappingId]: value.length > 0 }));
    
    // Atualizar mapping
    updateMapping(mappingId, value);
  };

  const handleSuggestionSelect = (mappingId, ingredient) => {
    setSearchInputs(prev => ({ ...prev, [mappingId]: ingredient.name }));
    setShowSuggestions(prev => ({ ...prev, [mappingId]: false }));
    
    // Atualizar mapping com ingrediente selecionado
    setMappings(prev => prev.map(mapping => {
      if (mapping.id === mappingId) {
        return {
          ...mapping,
          finalName: ingredient.name,
          linkedIngredient: ingredient,
          isNewIngredient: false,
          confidence: 'high'
        };
      }
      return mapping;
    }));
  };

  const updateMapping = (mappingId, finalName) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.id === mappingId) {
        // Verificar se o nome corresponde a um ingrediente existente
        const matchedIngredient = existingIngredients.find(ing => 
          ing.name?.toLowerCase() === finalName.toLowerCase()
        );

        return {
          ...mapping,
          finalName: finalName,
          linkedIngredient: matchedIngredient || null,
          isNewIngredient: !matchedIngredient,
          confidence: matchedIngredient ? 'high' : 'new'
        };
      }
      return mapping;
    }));
  };

  const getSuggestions = (mappingId, searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) return [];
    
    return existingIngredients
      .filter(ing => 
        ing.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 8) // Limitar a 8 sugestões
      .sort((a, b) => {
        // Priorizar matches exatos
        if (a.name?.toLowerCase() === searchTerm.toLowerCase()) return -1;
        if (b.name?.toLowerCase() === searchTerm.toLowerCase()) return 1;
        // Depois matches que começam com o termo
        if (a.name?.toLowerCase().startsWith(searchTerm.toLowerCase())) return -1;
        if (b.name?.toLowerCase().startsWith(searchTerm.toLowerCase())) return 1;
        return 0;
      });
  };

  const handleProceedWithMappings = () => {
    // Preparar dados finais para importação
    const finalData = {
      ...importData,
      mappings: mappings,
      commercial_data: mappings.map(mapping => ({
        ...mapping.originalData,
        _mapping: {
          action: mapping.isNewIngredient ? 'create' : 'update',
          linkedIngredientId: mapping.linkedIngredient?.id,
          finalName: mapping.finalName
        }
      }))
    };

    onMappingComplete(finalData);
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      case 'new': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceText = (confidence, isNewIngredient) => {
    if (isNewIngredient) return 'Novo';
    switch (confidence) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold">Triagem de Importação</h2>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2">Analisando ingredientes...</span>
        </div>
      </div>
    );
  }

  const stats = {
    total: mappings.length,
    toUpdate: mappings.filter(m => !m.isNewIngredient).length,
    toCreate: mappings.filter(m => m.isNewIngredient).length,
    highConfidence: mappings.filter(m => m.confidence === 'high').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Triagem de Importação</h2>
          <p className="text-gray-500">Mapeamento de Ingredientes</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-gray-500">Total de itens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.toUpdate}</div>
            <p className="text-sm text-gray-500">Vincular existentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.toCreate}</div>
            <p className="text-sm text-gray-500">Criar novos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.highConfidence}</div>
            <p className="text-sm text-gray-500">Alta confiança</p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Revise os mapeamentos abaixo. Digite no campo <strong>Nome Final</strong> para buscar ingredientes existentes ou criar novos.
        </AlertDescription>
      </Alert>

      {/* Tabela de Mapeamentos com rolagem */}
      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de Ingredientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-96 border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Nome Comercial (Fornecedor)</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Nome Final</TableHead>
                  <TableHead>Confiança</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <div className="font-medium">{mapping.commercialName}</div>
                      <div className="text-sm text-gray-500">{mapping.category}</div>
                    </TableCell>
                    <TableCell className="text-sm">{mapping.supplier}</TableCell>
                    <TableCell>R$ {mapping.price?.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input
                          placeholder="Digite para buscar ou criar..."
                          value={searchInputs[mapping.id] || ''}
                          onChange={(e) => handleSearchInputChange(mapping.id, e.target.value)}
                          onFocus={() => {
                            if (searchInputs[mapping.id]) {
                              setShowSuggestions(prev => ({ ...prev, [mapping.id]: true }));
                            }
                          }}
                          onBlur={() => {
                            // Delay para permitir clique na sugestão
                            setTimeout(() => {
                              setShowSuggestions(prev => ({ ...prev, [mapping.id]: false }));
                            }, 200);
                          }}
                          className="w-[200px]"
                        />
                        
                        {/* Dropdown de sugestões */}
                        {showSuggestions[mapping.id] && (
                          <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {getSuggestions(mapping.id, searchInputs[mapping.id]).map((ingredient) => (
                              <div
                                key={ingredient.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => handleSuggestionSelect(mapping.id, ingredient)}
                              >
                                <div className="font-medium">{ingredient.name}</div>
                                <div className="text-xs text-gray-500">{ingredient.category}</div>
                              </div>
                            ))}
                            
                            {/* Opção para criar novo */}
                            {searchInputs[mapping.id] && 
                             getSuggestions(mapping.id, searchInputs[mapping.id]).length === 0 && (
                              <div className="px-3 py-2 text-blue-600 border-t border-gray-200">
                                <Plus className="w-4 h-4 inline mr-2" />
                                Criar novo: "{searchInputs[mapping.id]}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getConfidenceColor(mapping.confidence)}>
                        {getConfidenceText(mapping.confidence, mapping.isNewIngredient)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button onClick={handleProceedWithMappings} className="bg-blue-600 hover:bg-blue-700">
          Prosseguir com Importação ({stats.total} itens)
        </Button>
      </div>
    </div>
  );
}