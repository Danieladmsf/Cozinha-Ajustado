import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Recipe, CategoryTree } from "@/app/api/entities";
import { useToast } from "@/components/ui/use-toast";
import { 
  ChevronRight, 
  Loader2, 
  Copy,
  FileText 
} from "lucide-react";

export default function BulkRecipeCreator({ onSuccess }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [formData, setFormData] = useState({
    category: "",
    recipeNames: "",
    prepTime: "30",
    yieldWeight: "1000" // em gramas
  });
  const { toast } = useToast();

  // Carregar subcategorias de receitas do CategoryTree
  const loadSubcategories = async () => {
    try {
      const allCategories = await CategoryTree.list();
      
      
      // Filtrar categorias de receitas (type === "receitas" e active)
      const recipeCategories = allCategories
        .filter(cat => cat.type === "receitas" && cat.active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(cat => ({
          value: cat.name,
          label: cat.name,
          id: cat.id
        }));
      
      
      setSubcategories(recipeCategories);
    } catch (error) {
      console.error("Erro ao carregar subcategorias:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias de receitas.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isDialogOpen) {
      loadSubcategories();
    }
  }, [isDialogOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value) => {
    setFormData(prev => ({ ...prev, category: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast({
        title: "Categoria obrigatória", 
        description: "Por favor, selecione uma categoria para as receitas",
        variant: "destructive"
      });
      return;
    }
    
    // Separar os nomes por ponto e vírgula e remover espaços extras
    const names = formData.recipeNames
      .split(";")
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    if (names.length === 0) {
      toast({
        title: "Nenhum nome válido", 
        description: "Insira pelo menos um nome de receita",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      const processingResults = [];
      
      // Criar receitas uma por uma
      for (const name of names) {
        try {
          const recipeData = {
            name,
            category: formData.category,
            prep_time: parseInt(formData.prepTime, 10) || 0,
            yield_weight: parseInt(formData.yieldWeight, 10) || 0,
            total_weight: 0,
            active: true,
            ingredients: []
          };
          
          const result = await Recipe.create(recipeData);
          processingResults.push({
            name,
            success: true,
            id: result.id
          });
        } catch (err) {processingResults.push({
            name,
            success: false,
            error: err.message
          });
        }
      }
      
      setResults(processingResults);
      
      const successCount = processingResults.filter(r => r.success).length;
      
      toast({
        title: "Processamento concluído",
        description: `${successCount} de ${names.length} receitas foram criadas com sucesso.`
      });
      
      // Notificar o componente pai se todas as receitas foram criadas com sucesso
      if (successCount > 0 && typeof onSuccess === 'function') {
        onSuccess();
      }
      
    } catch (error) {toast({
        title: "Erro",
        description: "Ocorreu um erro durante o processamento em massa",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      category: "",
      recipeNames: "",
      prepTime: "30",
      yieldWeight: "1000"
    });
    setResults(null);
  };
  
  const closeDialog = () => {
    setIsDialogOpen(false);
    // Resetar apenas após fechar o diálogo
    setTimeout(resetForm, 300);
  };
  
  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="bg-amber-600 hover:bg-amber-700 flex items-center gap-1"
      >
        <Copy className="h-4 w-4 mr-1" />
        Criar Receitas em Massa
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Criar Múltiplas Receitas
            </DialogTitle>
          </DialogHeader>
          
          {!results ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria de Receita</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories?.map((subcategory) => (
                      <SelectItem 
                        key={subcategory.id} 
                        value={subcategory.value}
                      >
                        {subcategory.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recipeNames">Nomes das Receitas (separados por ;)</Label>
                <Textarea 
                  id="recipeNames"
                  name="recipeNames"
                  value={formData.recipeNames}
                  onChange={handleChange}
                  placeholder="Arroz branco; Feijão carioca; Alface americana"
                  required
                  rows={5}
                />
                <p className="text-sm text-gray-500">
                  Digite cada nome de receita separado por ponto e vírgula (;)
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTime">Tempo de Preparo (min)</Label>
                  <Input 
                    id="prepTime"
                    name="prepTime"
                    type="number"
                    min="0"
                    value={formData.prepTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yieldWeight">Rendimento (gramas)</Label>
                  <Input 
                    id="yieldWeight"
                    name="yieldWeight"
                    type="number" 
                    min="1"
                    value={formData.yieldWeight}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeDialog}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Criar Receitas
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4 border">
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Resultado da Importação
                </h3>
                
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-1 text-sm font-medium">Receita</th>
                        <th className="text-center py-2 px-1 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-100" : ""}>
                          <td className="py-2 px-1">{result.name}</td>
                          <td className="py-2 px-1 text-center">
                            {result.success ? (
                              <span className="text-green-600 flex items-center justify-center gap-1">
                                <Copy className="h-4 w-4" />
                                Criada
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center justify-center gap-1">
                                Erro
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total: {results.length} receitas | 
                    Sucesso: {results.filter(r => r.success).length} | 
                    Falhas: {results.filter(r => !r.success).length}
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button onClick={closeDialog}>
                  Concluir
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}