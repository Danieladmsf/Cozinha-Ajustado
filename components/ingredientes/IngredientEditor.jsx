'use client';


import React, { useState, useEffect } from "react";
import { Ingredient } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";
import { NutritionFood } from "@/app/api/entities";
import { Brand } from "@/app/api/entities";
import { Category } from "@/app/api/entities"; // Added Category import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  AlertCircle,
  CircleCheckBig,
  Plus,
  Trash2,
  Search,
  Eye,
  Package
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming cn utility is available

export default function IngredientEditor() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tacoFoods, setTacoFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // NOVOS ESTADOS para os campos inteligentes
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);
  const [openBrandCombobox, setOpenBrandCombobox] = useState(false);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    commercial_name: "",
    unit: "kg",
    current_price: "",
    base_price: "",
    last_update: new Date().toISOString().split('T')[0],
    active: true,
    notes: "",
    main_supplier: "",
    supplier_id: "",
    supplier_code: "",
    brand: "",
    brand_id: "",
    category: "",
    current_stock: "0",
    min_stock: "",
    ingredient_type: "both",
    taco_variations: []
  });

  const [isEditing, setIsEditing] = useState(false);
  const [currentIngredientId, setCurrentIngredientId] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [tacoSearchTerm, setTacoSearchTerm] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await Supplier.list();
      const activeSuppliers = Array.isArray(suppliersData) ? suppliersData.filter(s => s.active) : [];
      setSuppliers(activeSuppliers);
      
      // Criar opções para o combobox
      const supplierOptions = activeSuppliers.map(s => ({
        value: s.company_name || s.name,
        label: s.company_name || s.name,
        supplier_id: s.id,
        supplier_code: s.supplier_code || null
      }));
      setSupplierOptions(supplierOptions);
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar fornecedores" });
    }
  };

  const loadBrands = async () => {
    try {
      const brandsData = await Brand.list();
      const activeBrands = Array.isArray(brandsData) ? brandsData.filter(b => b.active) : [];
      setBrands(activeBrands);
      
      // Criar opções para o combobox
      const brandOptions = activeBrands.map(b => ({
        value: b.name,
        label: b.name,
        brand_id: b.id,
        manufacturer: b.manufacturer
      }));
      setBrandOptions(brandOptions);
    } catch (err) {
    }
  };

  const loadTacoFoods = async () => {
    try {
      const tacoData = await NutritionFood.list();
      setTacoFoods(Array.isArray(tacoData) ? tacoData.filter(f => f.active) : []);
    } catch (err) {
    }
  };

  const loadCategories = async () => {
    try {
      // Carregar categorias dos ingredientes existentes
      const ingredientsData = await Ingredient.list();
      const ingredientCategories = [...new Set(
        ingredientsData
          .map(ing => ing.category)
          .filter(cat => cat && cat.trim() !== "" && cat !== "null")
      )];

      // Carregar categorias da entidade Category
      const categoryData = await Category.list();
      const entityCategories = categoryData
        .filter(cat => cat.type === "ingredient" && cat.active)
        .map(cat => cat.name);

      // Combinar e remover duplicatas
      const allCategories = [...new Set([...ingredientCategories, ...entityCategories])].sort();
      
      setCategories(allCategories);
      setCategoryOptions(allCategories.map(cat => ({ value: cat, label: cat })));
    } catch (err) {
    }
  };

  // FUNÇÃO para gerar código automático do fornecedor
  const generateSupplierCode = (supplierName) => {
    if (!supplierName) return '';
    
    // Gerar código baseado no nome (primeiras letras + timestamp)
    const initials = supplierName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 3);
    
    const timestamp = Date.now().toString().slice(-4);
    return `${initials}${timestamp}`;
  };

  // FUNÇÃO para selecionar fornecedor
  const handleSupplierSelect = (selectedValue) => {
    const selectedSupplier = supplierOptions.find(s => s.value === selectedValue);
    
    if (selectedSupplier) {
      // Fornecedor existente
      setFormData(prev => ({
        ...prev,
        main_supplier: selectedSupplier.value,
        supplier_id: selectedSupplier.supplier_id,
        supplier_code: selectedSupplier.supplier_code || generateSupplierCode(selectedSupplier.value)
      }));
    } else {
      // Novo fornecedor (usuário digitou algo que não existe)
      setFormData(prev => ({
        ...prev,
        main_supplier: selectedValue,
        supplier_id: '', // Limpar ID pois é novo
        supplier_code: generateSupplierCode(selectedValue)
      }));
    }
    setOpenSupplierCombobox(false);
  };

  // FUNÇÃO para selecionar marca
  const handleBrandSelect = (selectedValue) => {
    const selectedBrand = brandOptions.find(b => b.value === selectedValue);
    
    if (selectedBrand) {
      // Marca existente
      setFormData(prev => ({
        ...prev,
        brand: selectedBrand.value,
        brand_id: selectedBrand.brand_id
      }));
    } else {
      // Nova marca
      setFormData(prev => ({
        ...prev,
        brand: selectedValue,
        brand_id: '' // Limpar ID pois é nova
      }));
    }
    setOpenBrandCombobox(false);
  };

  // FUNÇÃO para selecionar categoria
  const handleCategorySelect = (selectedValue) => {
    setFormData(prev => ({
      ...prev,
      category: selectedValue
    }));
    setOpenCategoryCombobox(false);
  };

  const resetFormForNewIngredient = () => {
    setFormData({
      name: "",
      commercial_name: "",
      unit: "kg",
      current_price: "",
      base_price: "",
      last_update: new Date().toISOString().split('T')[0],
      active: true,
      notes: "",
      main_supplier: "",
      supplier_id: "",
      supplier_code: "",
      brand: "",
      brand_id: "",
      category: "",
      current_stock: "0",
      min_stock: "",
      ingredient_type: "both",
      taco_variations: []
    });
    setIsEditing(false);
    setCurrentIngredientId(null);
  };
  
  const loadIngredient = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      const ingredient = await Ingredient.get(id);
      
      if (!ingredient) {
        setError("Ingrediente não encontrado. Redirecionando para criação de novo ingrediente.");
        router.push('/ingredientes/editor?id=new');
        resetFormForNewIngredient();
        return;
      }

      const safeString = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined')) return '';
        return String(value).trim();
      };

      const safeNumber = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined' || value.trim() === '')) return '';
        const num = parseFloat(value);
        return isNaN(num) ? '' : num.toString();
      };

      const mappedData = {
        name: safeString(ingredient.name),
        commercial_name: safeString(ingredient.commercial_name),
        unit: ingredient.unit || 'kg',
        current_price: safeNumber(ingredient.current_price),
        base_price: safeNumber(ingredient.base_price),
        last_update: ingredient.last_update || new Date().toISOString().split('T')[0],
        active: ingredient.active !== false,
        notes: safeString(ingredient.notes),
        main_supplier: safeString(ingredient.main_supplier),
        supplier_id: safeString(ingredient.supplier_id),
        supplier_code: safeString(ingredient.supplier_code),
        brand: safeString(ingredient.brand),
        brand_id: safeString(ingredient.brand_id),
        category: safeString(ingredient.category),
        current_stock: safeNumber(ingredient.current_stock),
        min_stock: safeNumber(ingredient.min_stock),
        taco_id: safeString(ingredient.taco_id),
        taco_variations: Array.isArray(ingredient.taco_variations) ? ingredient.taco_variations : [],
        ingredient_type: ingredient.ingredient_type || 'both'
      };

      
      setFormData(mappedData);
      setCurrentIngredientId(id);

    } catch (err) {
      setError('Erro ao carregar ingrediente: ' + err.message);
      router.push('/ingredienteditor?id=new');
      resetFormForNewIngredient();
    } finally {
      setLoading(false);
    }
  };

  // Função para adicionar variação TACO
  const addTacoVariation = (tacoFood, variationName = "Cru", lossPercentage = 0) => {
    const newVariation = {
      taco_id: tacoFood.id,
      taco_name: tacoFood.name,
      variation_name: variationName,
      loss_percentage: lossPercentage,
      calculated_price: formData.current_price ? parseFloat(formData.current_price) / (1 - lossPercentage / 100) : 0,
      is_base: formData.taco_variations.length === 0, // Primeira variação é base
      active: true
    };

    const updatedVariations = [...formData.taco_variations, newVariation];
    
    setFormData(prev => ({
      ...prev,
      taco_variations: updatedVariations,
      // 🎯 AUTO-PREENCHIMENTO DA CATEGORIA baseado na TACO
      category: tacoFood.category_name || prev.category
    }));

    // Toast de sucesso
    toast({
      title: "Variação TACO adicionada",
      description: `${tacoFood.name} (${variationName}) foi vinculado ao ingrediente. Categoria atualizada para "${tacoFood.category_name}".`
    });
  };

  // Função para remover variação TACO
  const removeTacoVariation = (index) => {
    const updatedVariations = formData.taco_variations.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      taco_variations: updatedVariations
    }));
  };

  // Verificar se categoria deve ser somente leitura
  const isCategoryReadOnly = formData.taco_variations.length > 0;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ingredientId = urlParams.get('id');
    
    
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadSuppliers(),
          loadBrands(),
          loadTacoFoods(),
          loadCategories()
        ]);
        
        if (ingredientId && ingredientId !== 'new') {
          setIsEditing(true);
          await loadIngredient(ingredientId);
        } else {
          setIsEditing(false);
          resetFormForNewIngredient();
        }
      } catch (error) {
        setError('Erro ao carregar dados iniciais: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [window.location.search]);

  const handleSave = async (e) => {
    e.preventDefault();

    setError(null);
    if (!formData.name.trim()) {
      setError("Nome principal é obrigatório");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const ingredientDataToSave = {
        name: formData.name,
        commercial_name: formData.commercial_name,
        supplier_id: formData.supplier_id,
        main_supplier: formData.main_supplier,
        current_price: parseFloat(formData.current_price) || 0,
        base_price: parseFloat(formData.base_price) || 0,
        brand: formData.brand,
        unit: formData.unit,
        current_stock: parseFloat(formData.current_stock) || 0,
        category: formData.category,
        notes: formData.notes,
        active: formData.active,
        last_update: formData.last_update || new Date().toISOString().split('T')[0],
        ingredient_type: formData.ingredient_type,
        min_stock: parseFloat(formData.min_stock) || 0,
        supplier_code: formData.supplier_code,
        brand_id: formData.brand_id,
        taco_variations: formData.taco_variations,
      };

      let result;
      if (isEditing && currentIngredientId) {
        // Atualizar ingrediente existente
        result = await Ingredient.update(currentIngredientId, ingredientDataToSave);
        toast({
          title: "Ingrediente atualizado",
          description: `O ingrediente "${formData.name}" foi atualizado com sucesso.`
        });
      } else {
        // Criar novo ingrediente
        result = await Ingredient.create(ingredientDataToSave);
        toast({
          title: "Ingrediente criado",
          description: `O ingrediente "${formData.name}" foi criado com sucesso.`
        });
      }

      // Redirecionar para a lista de ingredientes
      router.push('/ingredientes');

    } catch (err) {
      setError(err.message || "Erro desconhecido ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="mt-2 text-gray-600">
            {isEditing ? 'Carregando ingrediente...' : 'Carregando dados...'}
          </p>
        </div>
      </div>
    );
  }

  const filteredTacoFoods = tacoFoods.filter(food =>
    food.name.toLowerCase().includes(tacoSearchTerm.toLowerCase()) ||
    food.description.toLowerCase().includes(tacoSearchTerm.toLowerCase())
  );

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      {/* Header fixo */}
      <div className="flex-shrink-0 bg-white border-b px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center mb-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/ingredientes')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Ingredientes
            </Button>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEditing ? `Editar Ingrediente: ${formData.name || formData.commercial_name}` : 'Novo Ingrediente'}
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie os detalhes do seu ingrediente consolidado.
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Debug Card - apenas se em edição */}
          {isEditing && (
            <Card className="mb-6 bg-gray-50 border-gray-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Debug - Dados Carregados
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-700 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div><strong>Nome:</strong> "{formData.name}"</div>
                  <div><strong>Categoria:</strong> "{formData.category}"</div>
                  <div><strong>Fornecedor:</strong> "{formData.main_supplier}"</div>
                  <div><strong>Preço:</strong> "R$ {formData.current_price}"</div>
                </div>
                <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                  <strong>Esperado para Muçarela (Exemplo):</strong><br/>
                  Fornecedor: "NOVA MEGA G ATACADISTA DE ALIMENTOS SA", Categoria: "Laticínios", Preço: "34.9"
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Formulário principal */}
          <form onSubmit={handleSave} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="general" className="flex items-center gap-2 text-xs sm:text-sm">
                  <CircleCheckBig className="h-4 w-4" />
                  <span className="hidden sm:inline">Dados Gerais</span>
                  <span className="sm:hidden">Dados</span>
                </TabsTrigger>
                <TabsTrigger value="taco" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Variações TACO</span>
                  <span className="sm:hidden">TACO</span>
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2 text-xs sm:text-sm">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Ingrediente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Nome Principal e Comercial */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">Nome Principal *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Ex: Muçarela"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="commercial_name" className="text-sm font-medium">Nome Comercial</Label>
                        <Input
                          id="commercial_name"
                          name="commercial_name"
                          value={formData.commercial_name}
                          onChange={handleInputChange}
                          placeholder="Ex: Queijo Muçarela Tirolez"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Fornecedor e Categoria */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Fornecedor Principal - Combobox Inteligente */}
                      <div>
                        <Label className="text-sm font-medium">Fornecedor Principal</Label>
                        <Popover open={openSupplierCombobox} onOpenChange={setOpenSupplierCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openSupplierCombobox}
                              className="w-full justify-between mt-1 h-10"
                            >
                              <span className="truncate">
                                {formData.main_supplier || "Selecione um fornecedor"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar ou criar fornecedor..." className="h-9" />
                              <CommandEmpty>
                                <div className="py-6 text-center text-sm">
                                  <p>Nenhum fornecedor encontrado.</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Digite para criar um novo fornecedor
                                  </p>
                                </div>
                              </CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {supplierOptions.map((supplier) => (
                                  <CommandItem
                                    key={supplier.value}
                                    value={supplier.value}
                                    onSelect={handleSupplierSelect}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.main_supplier === supplier.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <span className="truncate">{supplier.label}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Categoria - Combobox Inteligente (ReadOnly se TACO) */}
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2">
                          Categoria 
                          {isCategoryReadOnly && <Badge variant="secondary" className="text-xs">Auto (TACO)</Badge>}
                        </Label>
                        {isCategoryReadOnly ? (
                          <div className="mt-1">
                            <Input
                              value={formData.category}
                              readOnly
                              className="bg-gray-100"
                              placeholder="Categoria será preenchida ao vincular TACO"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Categoria preenchida automaticamente com base nas variações TACO vinculadas.
                            </p>
                          </div>
                        ) : (
                          <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCategoryCombobox}
                                className="w-full justify-between mt-1 h-10"
                              >
                                <span className="truncate">
                                  {formData.category || "Selecione uma categoria"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar ou criar categoria..." className="h-9" />
                                <CommandEmpty>
                                  <div className="py-6 text-center text-sm">
                                    <p>Nenhuma categoria encontrada.</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Digite para criar uma nova categoria
                                    </p>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-auto">
                                  {categoryOptions.map((category) => (
                                    <CommandItem
                                      key={category.value}
                                      value={category.value}
                                      onSelect={handleCategorySelect}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          formData.category === category.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {category.label}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>

                    {/* Unidade, Preços */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Unidade de Compra *</Label>
                        <Select 
                          value={formData.unit} 
                          onValueChange={(value) => setFormData(prev => ({...prev, unit: value}))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Quilograma (kg)</SelectItem>
                            <SelectItem value="g">Grama (g)</SelectItem>
                            <SelectItem value="l">Litro (l)</SelectItem>
                            <SelectItem value="ml">Mililitro (ml)</SelectItem>
                            <SelectItem value="unidade">Unidade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="current_price" className="text-sm font-medium">Preço Atual (R$)</Label>
                        <Input
                          id="current_price"
                          name="current_price"
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={formData.current_price}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="base_price" className="text-sm font-medium">Preço Base (R$)</Label>
                        <Input
                          id="base_price"
                          name="base_price"
                          type="number" 
                          step="0.01" 
                          min="0"
                          value={formData.base_price}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Marca, Código Fornecedor, Data */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Marca - Combobox Inteligente */}
                      <div>
                        <Label className="text-sm font-medium">Marca</Label>
                        <Popover open={openBrandCombobox} onOpenChange={setOpenBrandCombobox}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openBrandCombobox}
                              className="w-full justify-between mt-1 h-10"
                            >
                              <span className="truncate">
                                {formData.brand || "Selecione uma marca"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar ou criar marca..." className="h-9" />
                              <CommandEmpty>
                                <div className="py-6 text-center text-sm">
                                  <p>Nenhuma marca encontrada.</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Digite para criar uma nova marca
                                  </p>
                                </div>
                              </CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                {brandOptions.map((brand) => (
                                  <CommandItem
                                    key={brand.value}
                                    value={brand.value}
                                    onSelect={handleBrandSelect}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.brand === brand.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {brand.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Código do Fornecedor - Auto-gerado */}
                      <div>
                        <Label htmlFor="supplier_code" className="text-sm font-medium">Código do Fornecedor</Label>
                        <Input
                          id="supplier_code"
                          name="supplier_code"
                          value={formData.supplier_code}
                          onChange={handleInputChange}
                          placeholder="Gerado automaticamente"
                          className="bg-gray-50 mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Gerado automaticamente ao selecionar fornecedor
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="last_update" className="text-sm font-medium">Última Atualização</Label>
                        <Input
                          id="last_update"
                          name="last_update"
                          type="date"
                          value={formData.last_update}
                          onChange={handleInputChange}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Observações */}
                    <div>
                      <Label htmlFor="notes" className="text-sm font-medium">Observações</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="Observações sobre o ingrediente"
                        rows={3}
                        className="mt-1 resize-none"
                      />
                    </div>

                    {/* Switch Ativo */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData(prev => ({...prev, active: checked}))}
                      />
                      <Label htmlFor="active" className="text-sm font-medium">Ingrediente ativo</Label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="taco" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vincular Alimentos TACO</CardTitle>
                    <p className="text-sm text-gray-600">
                      Vincule alimentos da tabela TACO para cálculo nutricional automático.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Busca de alimentos TACO */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar alimentos TACO..."
                        value={tacoSearchTerm}
                        onChange={(e) => setTacoSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Lista de alimentos TACO para adicionar */}
                    {tacoSearchTerm && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        {filteredTacoFoods.slice(0, 5).map(food => (
                          <div key={food.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                            onClick={() => addTacoVariation(food)}>
                            <div className="font-medium">{food.name}</div>
                            <div className="text-sm text-gray-500">{food.description}</div>
                            <Badge variant="outline" className="mt-1">{food.category_name}</Badge>
                          </div>
                        ))}
                        {filteredTacoFoods.length === 0 && (
                          <div className="p-3 text-sm text-gray-500 text-center">Nenhum alimento TACO encontrado.</div>
                        )}
                      </div>
                    )}

                    {/* Variações TACO vinculadas */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Variações Vinculadas</Label>
                      {formData.taco_variations.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma variação TACO vinculada ainda.</p>
                      ) : (
                        <div className="space-y-2">
                          {formData.taco_variations.map((variation, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{variation.taco_name}</div>
                                <div className="text-sm text-gray-500">
                                  Variação: {variation.variation_name} | Perda: {variation.loss_percentage}%
                                </div>
                                {variation.is_base && <Badge variant="outline" className="mt-1 text-gray-700">Base</Badge>}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTacoVariation(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Preview do Ingrediente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Nome</Label>
                        <p className="font-medium">{formData.name || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Categoria</Label>
                        <p className="font-medium">{formData.category || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Fornecedor</Label>
                        <p className="font-medium truncate">{formData.main_supplier || "Não informado"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Preço Atual</Label>
                        <p className="font-medium">R$ {formData.current_price || "0,00"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Variações TACO</Label>
                        <p className="font-medium">{formData.taco_variations.length} vinculada(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Botões de ação - fixos na parte inferior */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t bg-gray-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/ingredientes')}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || loading}
                className="bg-gray-800 hover:bg-gray-900 w-full sm:w-auto"
              >
                {saving ? "Salvando..." : (isEditing ? "Atualizar Ingrediente" : "Criar Ingrediente")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
