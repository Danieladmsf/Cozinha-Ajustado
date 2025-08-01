'use client';


import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPageUrl } from "@/utils";
import { NutritionCategory, NutritionFood } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Apple,
  ArrowLeft,
  Save,
  Trash,
  Upload,
  Loader2,
  AlertCircle,
  Plus
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function NutritionFoodEditor() {
  const [food, setFood] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Adicionar no início do componente, após os estados existentes
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryNameDescription] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    category_name: "",
    image_url: "",
    calories: "",
    proteins: "",
    carbohydrates: "",
    fats: "",
    saturated_fats: "",
    fiber: "",
    sodium: "",
    notes: "",
    active: true,
    description: ""
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const foodId = urlParams.get('id');
    
    // Carregar dados sempre que a página for acessada
    loadData(foodId);
  }, []);

  const loadData = async (foodId) => {
    try {
      setLoading(true);
      setError(null);
      
      
      // Carregar categorias primeiro
      const categoriesData = await NutritionCategory.list();
      setCategories(categoriesData);
      
      // Se tiver ID, carregar alimento
      if (foodId) {
        const foodData = await NutritionFood.filter({ id: foodId });
        
        if (foodData && foodData.length > 0) {
          const food = foodData[0];
          
          setFood(food);
          
          // NOVA ABORDAGEM: Aguardar um pouco para garantir que categorias foram carregadas
          setTimeout(() => {
            let categoryId = food.category_id || "";
            let categoryName = food.category_name || "";
            
            
            if (!categoryId && categoryName && categoriesData.length > 0) {
              
              // Buscar categoria pelo nome (comparação mais flexível)
              const foundCategory = categoriesData.find(cat => {
                if (!cat.category) return false;
                const catName = cat.category.toLowerCase().trim();
                const searchName = categoryName.toLowerCase().trim();
                return catName === searchName;
              });
              
              if (foundCategory) {
                categoryId = foundCategory.id;
                categoryName = foundCategory.category;
              } else {
              }
            }
            
            
            // Preencher form com dados do alimento
            const newFormData = {
              name: food.name || "",
              category_id: categoryId,
              category_name: categoryName,
              image_url: food.image_url || "",
              calories: food.energy_kcal?.toString() || "",
              proteins: food.protein_g?.toString() || "",
              carbohydrates: food.carbohydrate_g?.toString() || "",
              fats: food.lipid_g?.toString() || "",
              saturated_fats: food.saturated_g?.toString() || "", // Correctly loads saturated_g as string
              fiber: food.fiber_g?.toString() || "",
              sodium: food.sodium_mg?.toString() || "",
              notes: food.notes || "",
              active: food.active !== false,
              description: food.description || ""
            };
            
            
            setFormData(newFormData);
          }, 100); // Pequeno delay para garantir que o state foi atualizado
          
        } else {
          setError("Alimento não encontrado");
        }
      } else {
        // Novo alimento - apenas definir dados vazios
        setFormData({
          name: "",
          category_id: "",
          category_name: "",
          image_url: "",
          calories: "",
          proteins: "",
          carbohydrates: "",
          fats: "",
          saturated_fats: "",
          fiber: "",
          sodium: "",
          notes: "",
          active: true,
          description: ""
        });
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    // Aceita apenas números e ponto decimal
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({
      ...prev,
      [name]: numericValue
    }));
  };

  const handleCategoryChange = (categoryId) => {
    
    const selectedCategory = categories.find(c => c.id === categoryId);
    
    setFormData(prev => {
      const newData = {
        ...prev,
        category_id: categoryId,
        category_name: selectedCategory ? selectedCategory.category : ""
      };
      return newData;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validação
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do alimento é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Erro", 
        description: "Descrição do alimento é obrigatória",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.category_id) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria para o alimento",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Preparar dados seguindo EXATAMENTE o schema da entidade
      const dataToSave = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category_name: formData.category_name,
        active: formData.active
      };

      // Adicionar campos opcionais apenas se tiverem valor
      if (formData.image_url?.trim()) {
        dataToSave.image_url = formData.image_url.trim();
      }
      
      if (formData.notes?.trim()) {
        dataToSave.notes = formData.notes.trim();
      }

      // Campos numéricos - apenas adicionar se tiverem valor válido
      if (formData.calories && !isNaN(parseFloat(formData.calories))) {
        dataToSave.energy_kcal = parseFloat(formData.calories);
      }
      
      if (formData.proteins && !isNaN(parseFloat(formData.proteins))) {
        dataToSave.protein_g = parseFloat(formData.proteins);
      }
      
      if (formData.carbohydrates && !isNaN(parseFloat(formData.carbohydrates))) {
        dataToSave.carbohydrate_g = parseFloat(formData.carbohydrates);
      }
      
      if (formData.fats && !isNaN(parseFloat(formData.fats))) {
        dataToSave.lipid_g = parseFloat(formData.fats);
      }
      
      if (formData.fiber && !isNaN(parseFloat(formData.fiber))) {
        dataToSave.fiber_g = parseFloat(formData.fiber);
      }
      
      if (formData.sodium && !isNaN(parseFloat(formData.sodium))) {
        dataToSave.sodium_mg = parseFloat(formData.sodium);
      }

      // Campos que devem ser strings conforme schema
      if (formData.saturated_fats && !isNaN(parseFloat(formData.saturated_fats))) {
        dataToSave.saturated_g = formData.saturated_fats.toString();
      }
      
      
      // Lógica de salvamento removida
      
      // Redirecionar
      router.push('/nutrition');
      
    } catch (err) {
      console.error("Erro completo ao salvar:", err);
      console.error("Response data:", err.response?.data);
      
      let errorMessage = "Erro desconhecido";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!food) return;
    
    if (window.confirm(`Tem certeza que deseja excluir o alimento "${food.name}"?`)) {
      try {
        setSaving(true);
        await NutritionFood.delete(food.id);
        toast({
          title: "Sucesso",
          description: "Alimento excluído com sucesso"
        });
        router.push('/nutrition');
      } catch (err) {
        console.error("Erro ao excluir alimento:", err);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao excluir o alimento",
          variant: "destructive"
        });
        setSaving(false);
      }
    }
  };

  // Adicionar função para criar categoria
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      toast({
        title: "Erro",
        description: "Nome da categoria é obrigatório",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Criar nova categoria
      const newCategory = await NutritionCategory.create({
        category: newCategoryName.trim(),
        description: newCategoryDescription.trim(),
        active: true
      });
      
      // Atualizar lista de categorias
      setCategories(prev => [...prev, newCategory]);
      
      // Selecionar nova categoria
      setFormData(prev => ({
        ...prev,
        category_id: newCategory.id,
        category_name: newCategory.category
      }));
      
      // Fechar dialog e limpar campos
      setShowNewCategoryDialog(false);
      setNewCategoryName("");
      setNewCategoryNameDescription(""); // Also clear description field
      
      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso"
      });
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar categoria",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500">Carregando informações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <Button 
          variant="outline" 
          onClick={() => router.push('/nutrition')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Tabela Nutricional
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => router.push('/nutrition')}
            className="mb-2 -ml-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Tabela Nutricional
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {food ? `Editar: ${food.name}` : "Novo Alimento"}
          </h1>
          <p className="text-gray-500">
            {food ? "Atualize as informações deste alimento" : "Adicione um novo alimento à tabela nutricional"}
          </p>
        </div>
        
        <div className="flex gap-3">
          {food && (
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={saving}
            >
              <Trash className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
          
          <Button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações básicas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Alimento *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Banana Prata"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                placeholder="Ex: Banana prata, crua"
                required
              />
              <p className="text-xs text-gray-500">Descrição mais detalhada do alimento conforme padrão TACO</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.category_id || ""}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCategoryDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => loadData(food?.id)} // Reload data including categories
                  title="Recarregar categorias"
                >
                  🔄
                </Button>
              </div>
            </div>

            {/* Adicionar Dialog para nova categoria */}
            <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Nova Categoria</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova categoria para alimentos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newCategoryName">Nome da Categoria</Label>
                    <Input
                      id="newCategoryName"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Frutas e derivados"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCategoryDescription">Descrição</Label>
                    <Textarea
                      id="newCategoryDescription"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryNameDescription(e.target.value)}
                      placeholder="Descrição da categoria"
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Criar Categoria</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            <div className="space-y-2">
              <Label htmlFor="image_url">URL da Imagem</Label>
              <Input
                id="image_url"
                name="image_url"
                value={formData.image_url}
                onChange={handleInputChange}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              {formData.image_url && (
                <div className="mt-2 w-20 h-20 rounded-md overflow-hidden border border-gray-200">
                  <Image 
                    src={formData.image_url} 
                    alt={formData.name || 'Alimento'}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/80?text=Erro";
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Detalhes adicionais sobre o alimento"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="active"
                name="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Alimento ativo</Label>
            </div>
          </CardContent>
        </Card>
        
        {/* Informações Nutricionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5" />
              Informações Nutricionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500 mb-4">Valores por 100g de alimento</p>
            
            <div className="space-y-2">
              <Label htmlFor="calories">Calorias (kcal)</Label>
              <Input
                id="calories"
                name="calories"
                value={formData.calories}
                onChange={handleNumberChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="proteins">Proteínas (g)</Label>
              <Input
                id="proteins"
                name="proteins"
                value={formData.proteins}
                onChange={handleNumberChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="carbohydrates">Carboidratos (g)</Label>
              <Input
                id="carbohydrates"
                name="carbohydrates"
                value={formData.carbohydrates}
                onChange={handleNumberChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fats">Gorduras Totais (g)</Label>
              <Input
                id="fats"
                name="fats"
                value={formData.fats}
                onChange={handleNumberChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="saturated_fats">Gorduras Saturadas (g)</Label>
              <Input
                id="saturated_fats"
                name="saturated_fats"
                value={formData.saturated_fats}
                onChange={handleNumberChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fiber">Fibras (g)</Label>
              <Input
                id="fiber"
                name="fiber"
                value={formData.fiber}
                onChange={handleNumberChange}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sodium">Sódio (mg)</Label>
              <Input
                id="sodium"
                name="sodium"
                value={formData.sodium}
                onChange={handleNumberChange}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
