'use client';


import React, { useState, useEffect, useCallback, useRef } from "react";
import { Recipe, Ingredient, Category, CategoryTree, PriceHistory } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  ChefHat,
  Search,
  Clock,
  Scale,
  DollarSign,
  Trash,
  Filter,
  SlidersHorizontal,
  Calculator,
  TrendingUp,
  ArrowDownUp,
  MoreVertical,
  Eye,
  EyeOff,
  Pencil,
  ChevronUp,
  ChevronDown,
  Printer,
  TrendingDown,
  AlertCircle, ArrowDownCircle, ArrowUpCircle, Info, ChevronLeft, ChevronRight, Calendar as CalendarIcon
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Certifique-se de que já importou o componente NutritionalInfo
import NutritionalInfo from "@/components/receitas/NutritionalInfo";
// Importar o novo componente de impressão - usando RecipeTechnicalPrintDialog que ainda existe
import RecipeTechnicalPrintDialog from "@/components/receitas/RecipeTechnicalPrintDialog";
import RecipeSimplePrintDialog from "@/components/receitas/RecipeSimplePrintDialog"; // Novo componente
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ptBR } from "date-fns/locale";
import BulkRecipeCreator from "@/components/receitas/BulkRecipeCreator";

// Funções utilitárias para formatação e cálculo
const formatWeight = (weightInKg) => {
  if (!weightInKg) return "0,000 kg";
  return `${weightInKg.toFixed(3).replace('.', ',')} kg`;
};

const calculateCubaCost = (cubaWeightKg, costPerKgYield) => {
  if (!cubaWeightKg || !costPerKgYield) return 0;
  return cubaWeightKg * costPerKgYield;
};

export default function Recipes() {
  const [isClient, setIsClient] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("grid");
  const [recipeCategories, setRecipeCategories] = useState([]);
  const [expandedRecipes, setExpandedRecipes] = useState(new Set());
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isSimplePrintDialogOpen, setIsSimplePrintDialogOpen] = useState(false);
  const [recipeToPrint, setRecipeToPrint] = useState(null);
  const [isSaving, setSaving] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);

  const saveTimerRef = useRef(null);
  const dirtyRecipeRef = useRef(null);
  const [isDirty, setIsDirty] = useState(false);

  const [isPrintRecipeDialogOpen, setIsPrintRecipeDialogOpen] = useState(false);

  const loadPriceHistory = async () => {
    try {
      const history = await PriceHistory.list();
      setPriceHistory(history);
    } catch (error) {
      // Error loading price history
    }
  };

  // Fix hydration mismatch - set date only on client
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    loadRecipes();
    loadCategories();
    loadIngredients();
    loadPriceHistory();
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    
    const recalculatedRecipes = recipes.map(recipe => {
      const variation = calculateVariationForDate(recipe, selectedDate);
      return {
        ...recipe,
        currentVariation: variation
      };
    });
    setRecipes(recalculatedRecipes);
  }, [selectedDate]);

  const formatDate = (date) => {
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const getIngredientPriceForDate = (ingredientId, date) => {
    if (!ingredientId || !date || !priceHistory || priceHistory.length === 0) {
      return null;
    }
    
    const targetDate = format(date, 'yyyy-MM-dd');
    
    const relevantRecords = priceHistory.filter(record => 
      record.ingredient_id === ingredientId && 
      record.date <= targetDate
    );
    
    if (relevantRecords.length === 0) {
      return null;
    }
    
    const sortedRecords = relevantRecords.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
    
    return sortedRecords[0]?.new_price;
  };

  const calculateVariationForDate = (recipe, date) => {
    if (!recipe?.ingredients || !date || !priceHistory || priceHistory.length === 0) {
      return null;
    }
    
    try {
      const currentDayPrices = recipe.ingredients.map(ing => {
        const price = getIngredientPriceForDate(ing.ingredient_id, date) || ing.unit_price;
        return { ingredient: ing, price: price };
      });

      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 1);
      
      const previousDayPrices = recipe.ingredients.map(ing => {
        const price = getIngredientPriceForDate(ing.ingredient_id, previousDate) || ing.unit_price;
        return { ingredient: ing, price: price };
      });

      const currentTotal = currentDayPrices.reduce((sum, { ingredient, price }) => 
        sum + (price * ingredient.quantity), 0);
      
      const previousTotal = previousDayPrices.reduce((sum, { ingredient, price }) => 
        sum + (price * ingredient.quantity), 0);

      if (previousTotal === 0) {
        return null;
      }

      const percentChange = ((currentTotal - previousTotal) / previousTotal) * 100;
      const monetaryChange = currentTotal - previousTotal;
      
      return {
        percentChange,
        monetaryChange,
        currentTotal,
        previousTotal
      };
    } catch (error) {
      return null;
    }
  };
  
  const loadRecipes = async () => {
    try {
      const recipesData = await retryWithDelay(() => Recipe.list());
      setRecipes(recipesData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar receitas. Por favor, tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  };
  
  const loadIngredients = async () => {
    try {
      const ingredientsData = await retryWithDelay(() => Ingredient.list());
      setIngredients(ingredientsData);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar ingredientes. Por favor, tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  };
  
  const loadCategories = async () => {
    try {
      const categoriesData = await retryWithDelay(() => Category.list()).catch(err => {
        return [];
      });

      
      const recipeCategories = categoriesData
        .filter(cat => cat.type === "recipe" && cat.active !== false)
        .map(cat => ({
          value: cat.name,
          label: cat.name,
          id: cat.id
        }));
      
      
      if (!recipeCategories.find(cat => 
        cat.value.toLowerCase() === "outro" || 
        cat.value.toLowerCase() === "outros"
      )) {
        recipeCategories.push({ value: "outro", label: "Outro" });
      }
      
      setCategories(recipeCategories);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar categorias. Por favor, tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  };

  const retryWithDelay = async (fn, retries = 3, delay = 2000) => {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithDelay(fn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  };

  useEffect(() => {
  }, [categories]);

  const interpretWeight = (value, unit = 'kg') => {
    if (!value) return 0;
    
    const numValue = parseFloat(value.toString().replace(',', '.'));
    if (isNaN(numValue)) return 0;

    switch(unit.toLowerCase()) {
      case 'kg':
        return numValue * 1000;
      case 'g':
        return numValue;
      default:
        return numValue;
    }
  };

  const calculateTotalWeight = (ingredients) => {
    return ingredients.reduce((sum, ing) => {
      const quantity = ing.quantity || 0;
      let weightInGrams = quantity;

      if (ing.unit === 'kg') {
        weightInGrams = quantity * 1000;
      }

      return sum + weightInGrams;
    }, 0);
  };

  const calculateCosts = (ingredients, yieldWeight) => {
    const totalWeight = ingredients.reduce((sum, ing) => {
      const quantity = ing.quantity || 0;
      return sum + (ing.unit === 'kg' ? quantity * 1000 : quantity);
    }, 0);

    const totalCost = ingredients.reduce((sum, ing) => sum + (ing.total_cost || 0), 0);

    const yieldWeightInGrams = yieldWeight > 0 && yieldWeight < 100 ? yieldWeight * 1000 : yieldWeight;

    const yieldRate = totalWeight > 0 ? yieldWeightInGrams / totalWeight : 1;

    const costPerKgRaw = totalWeight > 0 ? (totalCost / (totalWeight / 1000)) : 0;
    const costPerKgYield = yieldWeightInGrams > 0 ? (totalCost / (yieldWeightInGrams / 1000)) : 0;

    return {
      totalCost,
      totalWeight,
      yieldWeight: yieldWeightInGrams,
      costPerKgRaw,
      costPerKgYield,
      yieldRate
    };
  };

  const handleDelete = async (recipe) => {
    
    if (window.confirm(`Tem certeza que deseja excluir a receita "${recipe.name}"?`)) {
      try {
        await Recipe.delete(recipe.id);
        
        await loadRecipes();
        
        toast({
          title: "Receita excluída",
          description: `A receita "${recipe.name}" foi excluída com sucesso.`,
        });
      } catch (error) {
        toast({
          title: "Erro ao excluir",
          description: `Erro ao excluir a receita "${recipe.name}": ${error.message}`,
          variant: "destructive"
        });
      }
    }
  };

  const handleToggleActive = async (recipe) => {
    try {
      await Recipe.update(recipe.id, {
        ...recipe,
        active: !recipe.active
      });
      loadRecipes();
    } catch (error) {
      // Error updating recipe status
    }
  };

  const deleteCategory = async (categoryName) => {
    try {
      if (!categoryName) {
        return;
      }
      
      const allCategories = await Category.list();
      
      const categoryToDelete = allCategories.find(cat => 
        cat.type === "recipe" && 
        cat.name.toLowerCase() === categoryName.toLowerCase()
      );
      
      if (!categoryToDelete) {
        toast({
          title: "Aviso",
          description: `A categoria "${categoryName}" não foi encontrada ou já foi excluída.`,
          variant: "default"
        });
        return;
      }

      const allRecipes = await Recipe.list();
      const hasRecipes = allRecipes.some(recipe => 
        recipe.category.toLowerCase() === categoryName.toLowerCase()
      );

      if (hasRecipes) {
        toast({
          title: "Erro",
          description: `Não é possível excluir a categoria "${categoryName}" pois existem receitas cadastradas nela.`,
          variant: "destructive"
        });
        return;
      }

      await Category.delete(categoryToDelete.id);
      
      toast({
        title: "Sucesso",
        description: `Categoria "${categoryName}" excluída com sucesso.`,
      });
      
      await loadCategories();
    } catch (error) {
      // Error deleting category
      
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir categoria. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const getFilteredRecipes = () => {
    let filtered = recipes;
    
    if (searchTerm) {
      filtered = filtered.filter(recipe =>
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (activeCategory !== "all") {
      filtered = filtered.filter(recipe => recipe.category === activeCategory);
    }
    
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "cost":
          return (a.cost_per_gram_yield || 0) - (b.cost_per_gram_yield || 0);
        case "yield":
          return (a.yield_weight || 0) - (b.yield_weight || 0);
        case "time":
          return (a.prep_time || 0) - (b.prep_time || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const filteredRecipes = getFilteredRecipes();

  const getIngredientName = (id) => {
    const ingredient = ingredients.find(i => i.id === id);
    return ingredient ? ingredient.name : "Ingrediente não encontrado";
  };

  const uniqueCategories = [...new Set(recipes.map(recipe => recipe.category))];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCostPerGram = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "R$ 0,00";
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  useEffect(() => {
    loadRecipeCategories();
  }, []);

  const loadRecipeCategories = async () => {
    try {
      
      const allCategories = await CategoryTree.list();
      
      const recipeCategories = allCategories
        .filter(cat => {
          return cat.type === "recipe" && cat.active !== false;
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      
      
      if (recipeCategories.length > 0) {
        const formattedCategories = recipeCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          label: cat.name,
          value: cat.name,
        }));
        
        setRecipeCategories(formattedCategories);
        return;
      }
      
      const categoryList = await Category.list();
      
      const recipeCategoriesFromTable = categoryList
        .filter(cat => cat.type === "recipe" && cat.active !== false)
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          label: cat.name,
          value: cat.name
        }));
      
      
      if (recipeCategoriesFromTable.length > 0) {
        setRecipeCategories(recipeCategoriesFromTable);
        return;
      }
      
      const defaultCategories = [
        { id: "entrada", name: "Entrada", label: "Entrada", value: "Entrada" },
        { id: "prato_principal", name: "Prato Principal", label: "Prato Principal", value: "Prato Principal" },
        { id: "sobremesa", name: "Sobremesa", label: "Sobremesa", value: "Sobremesa" },
        { id: "acompanhamento", name: "Acompanhamento", label: "Acompanhamento", value: "Acompanhamento" },
        { id: "outro", name: "Outro", label: "Outro", value: "Outro" }
      ];
      
      setRecipeCategories(defaultCategories);
      
    } catch (error) {
      // Error loading categories
      
      const defaultCategories = [
        { id: "entrada", name: "Entrada", label: "Entrada", value: "Entrada" },
        { id: "prato_principal", name: "Prato Principal", label: "Prato Principal", value: "Prato Principal" },
        { id: "sobremesa", name: "Sobremesa", label: "Sobremesa", value: "Prato Principal" },
        { id: "acompanhamento", name: "Acompanhamento", label: "Acompanhamento", value: "Acompanhamento" },
        { id: "outro", name: "Outro", label: "Outro", value: "Outro" }
      ];
      
      setRecipeCategories(defaultCategories);
      
      toast({
        title: "Aviso",
        description: "Usando categorias padrão. Não foi possível carregar as categorias configuradas.",
        variant: "default"
      });
    }
  };

  useEffect(() => {
  }, [recipeCategories]);

  const toggleRecipeExpansion = (recipeId) => {
    const newExpanded = new Set(expandedRecipes);
    if (newExpanded.has(recipeId)) {
      newExpanded.delete(recipeId);
    } else {
      newExpanded.add(recipeId);
    }
    setExpandedRecipes(newExpanded);
  };

  const handlePrintRecipe = (recipe) => {
    setRecipeToPrint(recipe);
    setIsPrintDialogOpen(true);
  };
  
  const handleSimplePrintRecipe = (recipe) => {
    setRecipeToPrint(recipe);
    setIsSimplePrintDialogOpen(true);
  };

  const formatPercentage = (value) => {
    if (value === undefined || value === null) return "-";
    
    if (Math.abs(value) < 0.005) {
      return "0.00%";
    }
    
    const formattedValue = `${value < 0 ? "-" : "+"}${Math.abs(value).toFixed(2)}%`;
    const textClass = value < 0 ? "text-green-600 font-medium" : value > 0 ? "text-red-600 font-medium" : "text-gray-600";
    
    return (
      <span className={textClass}>
        {formattedValue}
      </span>
    );
  };

  const formatMonetaryDifference = (value) => {
    if (value === undefined || value === null) return "-";
    
    if (Math.abs(value) < 0.005) {
      return "R$ 0,00";
    }
    
    const formatted = Math.abs(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    
    const formattedValue = `${value < 0 ? "-" : "+"}${formatted}`;
    const textClass = value < 0 ? "text-green-600 font-medium" : value > 0 ? "text-red-600 font-medium" : "text-gray-600";
    
    return (
      <span className={textClass}>
        {formattedValue}
      </span>
    );
  };

  const formatPriceComparison = (currentPrice, previousPrice) => {
    if (currentPrice === undefined || previousPrice === undefined) return formatCurrency(currentPrice);
    
    const textClass = currentPrice > previousPrice ? "text-red-600" : 
                     currentPrice < previousPrice ? "text-green-600" : 
                     "text-gray-700";
    
    return (
      <span className={textClass}>
        {formatCurrency(currentPrice)}
      </span>
    );
  };

  const formatLocalDateFromISO = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString + 'T12:00:00');
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const getLocalDateString = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const getMostRecentUpdateDate = (recipeIngredients) => {
    let mostRecentDate = null;
    
    recipeIngredients?.forEach(ing => {
      const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
      if (ingredient?.last_update) {
        const updateDate = new Date(ingredient.last_update + 'T12:00:00');
        if (!mostRecentDate || updateDate > mostRecentDate) {
          mostRecentDate = updateDate;
        }
      }
    });
    
    return mostRecentDate ? getLocalDateString(mostRecentDate) : null;
  };

  const wasUpdatedOnMostRecentDate = (ingredient, mostRecentDateString) => {
    if (!ingredient?.last_update || !mostRecentDateString) return false;
    
    return ingredient.last_update === mostRecentDateString;
  };

  useEffect(() => {
    if (!isDirty || !dirtyRecipeRef.current) {
      return;
    }
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        
        const recipeToSave = dirtyRecipeRef.current;
        
        if (recipeToSave.id) {
          await Recipe.update(recipeToSave.id, recipeToSave);
          
          setRecipes(prev => prev.map(recipe => 
            recipe.id === recipeToSave.id ? recipeToSave : recipe
          ));
        } else {
          const savedRecipe = await Recipe.create(recipeToSave);
          
          setRecipes(prev => [...prev, savedRecipe]);
        }
        
        dirtyRecipeRef.current = null;
        setIsDirty(false);
        
        toast({
          description: "Receita salva com sucesso!"
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: error.message || "Tente novamente"
        });
      } finally {
        setSaving(false);
        saveTimerRef.current = null;
      }
    }, 1000);
    
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isDirty, toast]);

  const handleRecipeChange = useCallback((id, changes) => {
    setRecipes(prev => {
      const index = prev.findIndex(recipe => recipe.id === id);
      if (index === -1) return prev;
      
      const newRecipes = [...prev];
      newRecipes[index] = {
        ...newRecipes[index],
        ...changes
      };
      
      dirtyRecipeRef.current = newRecipes[index];
      setIsDirty(true);
      
      return newRecipes;
    });
  }, []);

  const handleEdit = useCallback((recipeData) => {
    window.location.href = `/ficha-tecnica?id=${recipeData.id}`;
  }, []);

  const handlePrintSimpleRecipe = (recipe) => {
    setRecipeToPrint(recipe);
    setIsPrintRecipeDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="p-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
          >
            <div>
              <h1 className="text-2xl font-bold">Receitas</h1>
              <p className="text-gray-500">Gerencie suas receitas e custos</p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar receitas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex gap-2">
                <BulkRecipeCreator 
                  onSuccess={loadRecipes} 
                />
              </div>
            </div>
          </motion.div>

          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  {uniqueCategories.map(category => (
                    <TabsTrigger key={category} value={category} className="relative group">
                      {category === "prato_principal" ? "Prato Principal" : 
                       category === "entrada" ? "Entrada" : 
                       category === "sobremesa" ? "Sobremesa" : category}
                      
                      <span 
                        className="ml-2 p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          const confirmDelete = window.confirm(`Tem certeza que deseja excluir a categoria "${category}"?`);
                          if (confirmDelete) {
                            deleteCategory(category);
                          }
                        }}
                      >
                        <Trash className="h-4 w-4" />
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Nome</SelectItem>
                      <SelectItem value="cost">Custo</SelectItem>
                      <SelectItem value="yield">Rendimento</SelectItem>
                      <SelectItem value="time">Tempo de Preparo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex border rounded-md">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "rounded-r-none", 
                      viewMode === "grid" && "bg-gray-100"
                    )}
                    onClick={() => setViewMode("grid")}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M6 2H2V6H6V2ZM13 2H9V6H13V2ZM6 9H2V13H6V9ZM13 9H9V13H13V9Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "rounded-l-none",
                      viewMode === "list" && "bg-gray-100"
                    )}
                    onClick={() => setViewMode("list")}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M2 3.5C2 3.22386 2.22386 3 2.5 3H12.5C12.7761 3 13 3.22386 13 3.5C13 3.77614 12.7761 4 12.5 4H2.5C2.22386 4 2 3.77614 2 3.5ZM2 7.5C2 7.22386 2.22386 7 2.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H2.5C2.22386 8 2 7.77614 2 7.5ZM2 11.5C2 11.2239 2.22386 11 2.5 11H12.5C12.7761 11 13 11.2239 13 11.5C13 11.7761 12.7761 12 12.5 12H2.5C2.22386 12 2 11.7761 2 11.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-lg shadow-sm">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[240px]">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Carregando..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <AnimatePresence>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRecipes.map((recipe) => {
                  const variation = selectedDate ? calculateVariationForDate(recipe, selectedDate) : 0;

                  return (
                    <motion.div
                      key={recipe.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="cursor-pointer hover:shadow-md transition-all duration-200">
                        <div 
                          className="p-2.5"
                          onClick={() => toggleRecipeExpansion(recipe.id)}
                        >
                          <div className="flex flex-col space-y-1">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center flex-1">
                                {(() => {
                                  let mainName = recipe.name;
                                  let complement = '';
                                  
                                  const match = recipe.name.match(/(.*?)\s*\((.*?)\)/);
                                  if (match) {
                                    mainName = match[1].trim();
                                    complement = match[2].trim();
                                  }
                                  
                                  return (
                                    <div className="flex flex-col mr-2">
                                      <h3 className="font-medium text-sm">{mainName}</h3>
                                      {complement && (
                                        <span className="text-xs text-gray-500">({complement})</span>
                                      )}
                                    </div>
                                  );
                                })( )}
                                
                                {variation && (
                                  <Badge 
                                    className={`flex items-center space-x-0.5 px-1.5 py-0.5 text-xs ${
                                      Math.abs(variation.percentChange) < 0.005 ? "bg-gray-100 text-gray-600" :
                                      variation.percentChange < 0 ? "bg-green-100 text-green-700" : 
                                      "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {Math.abs(variation.percentChange) < 0.005 ? (
                                      <span className="text-xs font-medium">0.00%</span>
                                    ) : variation.percentChange < 0 ? (
                                      <>
                                        <TrendingDown className="h-2.5 w-2.5" />
                                        <span className="text-xs font-medium">{Math.abs(variation.percentChange).toFixed(2)}%</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrendingUp className="h-2.5 w-2.5" />
                                        <span className="text-xs font-medium">{Math.abs(variation.percentChange).toFixed(2)}%</span>
                                      </>
                                    )}
                                  </Badge>
                                )}
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(recipe);
                                    }}
                                    className="flex items-center"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePrintSimpleRecipe(recipe);
                                    }}
                                    className="flex items-center"
                                  >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimir Receita
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleActive(recipe);
                                    }}
                                    className="flex items-center"
                                  >
                                    {recipe.active ? (
                                      <>
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        Marcar como Inativo
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Marcar como Ativo
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(recipe);
                                    }}
                                    className="flex items-center text-red-600 focus:text-red-600"
                                  >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="flex justify-between items-center mt-1">
                              <div className="flex items-center gap-1.5">
                                <Badge variant={recipe.active ? "success" : "secondary"} className="text-[10px] px-1.5 py-0">
                                  {recipe.active ? "Ativo" : "Inativo"}
                                </Badge>
                                <span className="text-[10px] text-gray-500">
                                  {recipe.category === "prato_principal" ? "Prato Principal" : 
                                   recipe.category === "entrada" ? "Entrada" : 
                                   recipe.category === "sobremesa" ? "Sobremesa" : recipe.category}
                                </span>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-gray-600 h-6 w-6 p-0"
                              >
                                {expandedRecipes.has(recipe.id) ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedRecipes.has(recipe.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t p-4">
                                <Tabs defaultValue="detalhes" className="mt-4">
                                  <TabsList className="grid grid-cols-4 text-xs">
                                    <TabsTrigger value="detalhes" className="text-xs py-1.5">
                                      Detalhes
                                    </TabsTrigger>
                                    <TabsTrigger value="ingredientes" className="text-xs py-1.5">
                                      Ingredientes
                                    </TabsTrigger>
                                    <TabsTrigger value="nutricional" className="text-xs py-1.5">
                                      Informação Nutricional
                                    </TabsTrigger>
                                    <TabsTrigger value="volatilidade" className="text-xs py-1.5">
                                      Volatilidade da Receita
                                    </TabsTrigger>
                                  </TabsList>

                                  <TabsContent value="detalhes">
                                  <div className="space-y-6">
                                    {/* ID e Última Atualização */}
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50/50 rounded-lg p-3">
                                      <div>
                                        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          ID da Receita
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 font-mono">
                                          {recipe.id}
                                        </p>
                                      </div>
                                      <div>
                                        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                                          Última Atualização
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">
                                          {recipe.updated_date && isClient
                                            ? format(new Date(recipe.updated_date), "dd/MM/yyyy")
                                            : "N/A"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Tempo de Preparo e Taxa de Rendimento */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="bg-blue-50/50 rounded-lg p-4">
                                        <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wide mb-2">
                                          Tempo de Preparo
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-5 w-5 text-blue-500" />
                                          <span className="text-lg font-semibold text-gray-700">
                                            {recipe.prep_time || 0}
                                            <span className="text-sm font-medium text-gray-500 ml-1">min</span>
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="bg-green-50/50 rounded-lg p-4">
                                        <div className="text-[11px] font-medium text-green-600 uppercase tracking-wide mb-2">
                                          Taxa de Rendimento
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Scale className="h-5 w-5 text-green-500" />
                                          <span className="text-lg font-semibold text-gray-700">
                                            {typeof recipe.yield_rate === 'number'
                                              ? `${(recipe.yield_rate * 100).toFixed(0)}`
                                              : (typeof recipe.total_weight === 'number' && recipe.total_weight > 0 &&
                                                 typeof recipe.yield_weight === 'number' && recipe.yield_weight >= 0)
                                                ? `${((recipe.yield_weight / recipe.total_weight) * 100).toFixed(0)}`
                                                : 'N/A'}
                                            <span className="text-sm font-medium text-gray-500 ml-1">%</span>
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Informações de Custo e Peso */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                      <div className="p-4 border-b border-gray-100">
                                        <h4 className="text-base font-semibold text-indigo-800">
                                          Informações de Custo e Peso
                                        </h4>
                                      </div>

                                      {/* Baseado em 1kg de Rendimento */}
                                      <div className="p-4 border-b border-gray-100">
                                        <div className="text-sm font-semibold text-indigo-700 mb-5">
                                          Baseado em 1kg de Rendimento
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                                          {(() => {
                                            const totalWeightKg = (typeof recipe.total_weight === 'number' && !isNaN(recipe.total_weight)) 
                                              ? recipe.total_weight : 0;
                                            const yieldWeightKg = (typeof recipe.yield_weight === 'number' && !isNaN(recipe.yield_weight)) 
                                              ? recipe.yield_weight : 0;
                                            const costPerKgRaw = (typeof recipe.cost_per_kg_raw === 'number' && !isNaN(recipe.cost_per_kg_raw)) 
                                              ? recipe.cost_per_kg_raw : 0;
                                            const costPerKgYield = (typeof recipe.cost_per_kg_yield === 'number' && !isNaN(recipe.cost_per_kg_yield)) 
                                              ? recipe.cost_per_kg_yield : 0;

                                            let pesoBrutoPara1kgRendimentoKg = 0;
                                            if (yieldWeightKg > 0 && totalWeightKg > 0) {
                                              const fatorRendimento = yieldWeightKg / totalWeightKg;
                                              if (fatorRendimento > 0) {
                                                pesoBrutoPara1kgRendimentoKg = (1 / fatorRendimento);
                                              }
                                            }

                                            return (
                                              <>
                                                <div>
                                                  <div className="text-xs font-medium text-blue-600 mb-2">
                                                    Peso Bruto
                                                  </div>
                                                  <p className="text-xl font-semibold text-gray-800">
                                                    {pesoBrutoPara1kgRendimentoKg > 0 
                                                      ? `${pesoBrutoPara1kgRendimentoKg.toFixed(3).replace('.', ',')} kg`
                                                      : '-'}
                                                  </p>
                                                </div>
                                                <div>
                                                  <div className="text-xs font-medium text-blue-600 mb-2">
                                                    Peso Rendimento
                                                  </div>
                                                  <p className="text-xl font-semibold text-gray-800">1,000 kg</p>
                                                </div>
                                                <div>
                                                  <div className="text-xs font-medium text-blue-600 mb-2">
                                                    Custo por Kg (Bruto)
                                                  </div>
                                                  <p className="text-xl font-semibold text-green-600">
                                                    {formatCurrency(costPerKgRaw)}
                                                  </p>
                                                </div>
                                                <div>
                                                  <div className="text-xs font-medium text-blue-600 mb-2">
                                                    Custo por Kg (Rendimento)
                                                  </div>
                                                  <p className="text-xl font-semibold text-green-600">
                                                    {formatCurrency(costPerKgYield)}
                                                  </p>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      {/* Informações Originais da Cuba */}
                                      <div className="p-4">
                                        <div className="text-sm font-semibold text-indigo-700 mb-5">
                                          Informações Originais da Cuba
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                          <div>
                                            <div className="text-xs font-medium text-blue-600 mb-2">
                                              Peso da Cuba
                                            </div>
                                            <p className="text-xl font-semibold text-gray-800">
                                              {formatWeight(recipe.cuba_weight)}
                                            </p>
                                          </div>
                                          <div>
                                            <div className="text-xs font-medium text-blue-600 mb-2">
                                              Custo da Cuba
                                            </div>
                                            <p className="text-xl font-semibold text-green-600">
                                              {formatCurrency(calculateCubaCost(recipe.cuba_weight, recipe.cost_per_kg_yield))}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Modo de Preparo */}
                                    {recipe.instructions && (
                                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-4 border-b border-gray-100">
                                          <h4 className="text-base font-semibold text-gray-800">
                                            Modo de Preparo
                                          </h4>
                                        </div>
                                        <div className="p-4 bg-gray-50/50">
                                          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                            {recipe.instructions}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Observações */}
                                    {recipe.notes && (
                                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                        <div className="p-4 border-b border-gray-100">
                                          <h4 className="text-base font-semibold text-gray-800">
                                            Observações
                                          </h4>
                                        </div>
                                        <div className="p-4 bg-gray-50/50">
                                          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                            {recipe.notes}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TabsContent>

                                  <TabsContent value="ingredientes">
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Ingredientes</h4>
                                      <div className="space-y-2 bg-white rounded-lg border p-4">
                                        {recipe.ingredients?.length > 0 ? (
                                          recipe.ingredients.map((ing, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-2 border-b last:border-0">
                                              <div>
                                                <p className="font-medium">{getIngredientName(ing.ingredient_id)}</p>
                                                <p className="text-sm text-gray-500">
                                                  {formatCurrency(ing.total_cost)}
                                                </p>
                                              </div>
                                              <div className="text-right">
                                                <p className="font-medium">{ing.quantity} {ing.unit}</p>
                                                <p className="text-sm text-gray-500">
                                                  {formatCurrency(ing.unit_price)}/{ing.unit}
                                                </p>
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-gray-500 text-center py-4">
                                            Nenhum ingrediente cadastrado
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </TabsContent>

                                  <TabsContent value="nutricional">
                                    <NutritionalInfo recipe={recipe} autoExpand={true} />
                                  </TabsContent>

                                  <TabsContent value="volatilidade">
                                    <div className="space-y-6">
                                      {(() => {
                                        const variation = selectedDate ? calculateVariationForDate(recipe, selectedDate) : null;
                                        
                                        if (!variation) {
                                          return (
                                            <div className="text-center p-6 bg-gray-50 rounded-lg border">
                                              <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                              <p className="text-gray-600">Nenhuma atualização de preço encontrada para esta data.</p>
                                            </div>
                                          );
                                        }

                                        const formattedDate = selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "N/A";

                                        const ingredientsWithVariations = recipe.ingredients.map(ing => {
                                          const currentPrice = selectedDate ? (getIngredientPriceForDate(ing.ingredient_id, selectedDate) || ing.unit_price) : ing.unit_price;
                                          
                                          const previousDate = selectedDate ? new Date(selectedDate) : new Date();
                                          if (selectedDate) previousDate.setDate(previousDate.getDate() - 1);
                                          const previousPrice = selectedDate ? (getIngredientPriceForDate(ing.ingredient_id, previousDate) || ing.unit_price) : ing.unit_price;
                                          
                                          const percentChange = ((currentPrice - previousPrice) / previousPrice) * 100;
                                          const monetaryChange = (currentPrice - previousPrice) * ing.quantity;

                                          return {
                                            ...ing,
                                            currentPrice,
                                            previousPrice,
                                            percentChange,
                                            monetaryChange
                                          };
                                        });

                                        return (
                                          <>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <TrendingUp className="h-5 w-5 text-gray-700" />
                                                <h4 className="text-sm font-medium">Análise de Volatilidade de Preços</h4>
                                              </div>
                                              <Badge variant="outline" className="text-xs bg-blue-50">
                                                Atualizado em {formattedDate}
                                              </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                              <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 }}
                                                className="rounded-lg overflow-hidden shadow-sm border bg-gradient-to-br from-white to-gray-50"
                                              >
                                                <div className="p-4">
                                                  <div className="flex justify-between items-center mb-3">
                                                    <span className="text-xs font-medium text-gray-500">Preço Atual</span>
                                                    <DollarSign className="h-4 w-4 text-blue-500" />
                                                  </div>
                                                  <div className="text-2xl font-semibold">{formatCurrency(variation.currentTotal)}</div>
                                                  <div className="mt-2 text-xs text-gray-500">
                                                    Preço anterior: {formatCurrency(variation.previousTotal)}
                                                  </div>
                                                </div>
                                              </motion.div>

                                              <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className={`rounded-lg overflow-hidden shadow-sm border ${
                                                  variation.percentChange > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                                                }`}
                                              >
                                                <div className="p-4">
                                                  <div className="flex justify-between items-center mb-3">
                                                    <span className="text-xs font-medium">Variação Percentual</span>
                                                    {Math.abs(variation.percentChange) < 0.005 ? (
                                                      <span className="h-4 w-4 text-gray-400">—</span>
                                                    ) : variation.percentChange > 0 ? (
                                                      <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                                    ) : (
                                                      <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                                    )}
                                                  </div>
                                                  <div className="text-2xl font-semibold">
                                                    {Math.abs(variation.percentChange) < 0.005 ? (
                                                      "0.00%"
                                                    ) : (
                                                      `${variation.percentChange > 0 ? "+" : "-"}${Math.abs(variation.percentChange).toFixed(2)}%`
                                                    )}
                                                  </div>
                                                  <div className="mt-2 text-xs">
                                                    {Math.abs(variation.percentChange) < 0.005 ? (
                                                      "Sem alteração no custo"
                                                    ) : (
                                                      `${variation.percentChange > 0 ? "Aumento" : "Redução"} no custo da receita`
                                                    )}
                                                  </div>
                                                </div>
                                              </motion.div>

                                              <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className={`rounded-lg overflow-hidden shadow-sm border ${
                                                  variation.monetaryChange > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                                                }`}
                                              >
                                                <div className="p-4">
                                                  <div className="flex justify-between items-center mb-3">
                                                    <span className="text-xs font-medium">Variação Monetária</span>
                                                    {Math.abs(variation.monetaryChange) < 0.005 ? (
                                                      <span className="h-4 w-4 text-gray-400">—</span>
                                                    ) : variation.monetaryChange > 0 ? (
                                                      <ArrowUpCircle className="h-4 w-4 text-red-600" />
                                                    ) : (
                                                      <ArrowDownCircle className="h-4 w-4 text-green-600" />
                                                    )}
                                                  </div>
                                                  <div className="text-2xl font-semibold">
                                                    {Math.abs(variation.monetaryChange) < 0.005 ? (
                                                      "R$ 0,00"
                                                    ) : (
                                                      formatCurrency(Math.abs(variation.monetaryChange))
                                                    )}
                                                  </div>
                                                  <div className="mt-2 text-xs">
                                                    {Math.abs(variation.monetaryChange) < 0.005 ? (
                                                      "Sem impacto financeiro"
                                                    ) : (
                                                      "Impacto financeiro total"
                                                    )}
                                                  </div>
                                                </div>
                                              </motion.div>
                                            </div>

                                            <div className="bg-white rounded-lg border">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead>Ingrediente</TableHead>
                                                    <TableHead className="text-right">Preço Anterior</TableHead>
                                                    <TableHead className="text-right">Preço Atual</TableHead>
                                                    <TableHead className="text-right">Variação %</TableHead>
                                                    <TableHead className="text-right">Variação R$</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {ingredientsWithVariations.map((ing, idx) => (
                                                    <TableRow key={idx}>
                                                      <TableCell className="font-mono">{getIngredientName(ing.ingredient_id)}</TableCell>
                                                      <TableCell className="text-right font-mono">
                                                        {formatCurrency(ing.previousPrice)}/{ing.unit}
                                                      </TableCell>
                                                      <TableCell className="text-right font-mono">
                                                        {formatCurrency(ing.currentPrice)}/{ing.unit}
                                                      </TableCell>
                                                      <TableCell className="text-right font-mono">
                                                        {Math.abs(ing.percentChange) < 0.005 ? (
                                                          <span className="text-gray-600">0.00%</span>
                                                        ) : (
                                                          <span className={ing.percentChange > 0 ? "text-red-600" : "text-green-600"}>
                                                            {ing.percentChange > 0 ? "+" : "-"}
                                                            {Math.abs(ing.percentChange).toFixed(2)}%
                                                          </span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="text-right font-mono">
                                                        {Math.abs(ing.monetaryChange) < 0.005 ? (
                                                          <span className="text-gray-600">R$ 0,00</span>
                                                        ) : (
                                                          <span className={ing.monetaryChange > 0 ? "text-red-600" : "text-green-600"}>
                                                            {formatCurrency(Math.abs(ing.monetaryChange))}
                                                          </span>
                                                        )}
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                  
                                                  <TableRow className="font-medium bg-gray-50">
                                                    <TableCell className="font-mono">Total da Receita</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(variation.previousTotal)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(variation.currentTotal)}</TableCell>
                                                    <TableCell className="text-right font-mono">
                                                      {Math.abs(variation.percentChange) < 0.005 ? (
                                                        <span className="text-gray-600">0.00%</span>
                                                      ) : (
                                                        <span className={variation.percentChange > 0 ? "text-red-600" : "text-green-600"}>
                                                          {variation.percentChange > 0 ? "+" : "-"}
                                                          {Math.abs(variation.percentChange).toFixed(2)}%
                                                        </span>
                                                      )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                      {Math.abs(variation.monetaryChange) < 0.005 ? (
                                                        <span className="text-gray-600">R$ 0,00</span>
                                                      ) : (
                                                        <span className={variation.monetaryChange > 0 ? "text-red-600" : "text-green-600"}>
                                                          {formatCurrency(Math.abs(variation.monetaryChange))}
                                                        </span>
                                                      )}
                                                    </TableCell>
                                                  </TableRow>
                                                </TableBody>
                                              </Table>
                                            </div>

                                            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                                              <h5 className="flex items-center gap-1.5 font-medium mb-1">
                                                <Info className="h-4 w-4" />
                                                Sobre a Análise
                                              </h5>
                                              <p className="text-xs leading-relaxed">
                                                Esta análise compara os preços dos ingredientes entre {formattedDate} e o dia anterior.
                                                São consideradas apenas as variações registradas neste período.
                                              </p>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left p-3 text-xs font-medium text-gray-600">Nome</th>
                          <th className="text-left p-3 text-xs font-medium text-gray-600">Categoria</th>
                          <th className="text-left p-3 text-xs font-medium text-gray-600">Variação</th>
                          <th className="text-left p-3 text-xs font-medium text-gray-600">P. Bruto</th>
                          <th className="text-left p-3 text-xs font-medium text-gray-600">Rendimento</th>
                          <th className="text-left p-3 text-xs font-medium text-gray-600">Taxa</th>
                          <th className="text-left p-3 text-xs font-medium text-gray-600">Custo Total</th>
                          <th className="text-left p-3 text-xs font-medium text-gray-600">Custo/Kg</th>
                          <th className="text-right p-3 text-xs font-medium text-gray-600">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecipes.map((recipe) => {
                          const variation = calculateVariationForDate(recipe, selectedDate);
                          
                          return (
                            <motion.tr 
                              key={recipe.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="p-3 text-sm">
                                <div className="flex items-center">
                                  <span className={recipe.active ? "font-medium" : "text-gray-500 line-through"}>
                                    {recipe.name}
                                  </span>
                                  {!recipe.active && (
                                    <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0 text-gray-500">
                                      Inativo
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-sm text-gray-600">
                                {recipe.category === "prato_principal" ? "Prato Principal" : 
                                 recipe.category === "entrada" ? "Entrada" : 
                                 recipe.category === "sobremesa" ? "Sobremesa" : recipe.category}
                              </td>
                              <td className="p-3">
                                {variation && (
                                  <Badge 
                                    className={`inline-flex items-center space-x-0.5 px-1.5 py-0.5 text-xs ${
                                      Math.abs(variation.percentChange) < 0.005 ? "bg-gray-100 text-gray-600" :
                                      variation.percentChange < 0 ? "bg-green-100 text-green-700" : 
                                      "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {Math.abs(variation.percentChange) < 0.005 ? (
                                      <span className="text-xs">0.00%</span>
                                    ) : variation.percentChange < 0 ? (
                                      <>
                                        <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                        <span className="text-xs">{Math.abs(variation.percentChange).toFixed(2)}%</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                        <span className="text-xs">{Math.abs(variation.percentChange).toFixed(2)}%</span>
                                      </>
                                    )}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 text-sm">{formatWeight(recipe.total_weight)}</td>
                              <td className="p-3 text-sm">{formatWeight(recipe.yield_weight)}</td>
                              <td className="p-3 text-sm">
                                {((recipe.yield_rate || 0) * 100).toFixed(0)}%
                              </td>
                              <td className="p-3 text-sm font-medium text-green-700">
                                {formatCurrency(recipe.total_cost || 0)}
                              </td>
                              <td className="p-3 text-sm font-medium text-green-700">
                                {formatCurrency(recipe.cost_per_gram_yield || 0)}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      handleEdit(recipe);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                  </Button>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem
                                        onClick={() => handleEdit(recipe)}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem
                                        onClick={() => handlePrintSimpleRecipe(recipe)}
                                      >
                                        <Printer className="mr-2 h-4 w-4" />
                                        Imprimir Receita
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() => handleToggleActive(recipe)}
                                      >
                                        {recipe.active ? (
                                          <>
                                            <EyeOff className="mr-2 h-4 w-4" />
                                            Marcar como Inativo
                                          </>
                                        ) : (
                                          <>
                                            <Eye className="mr-2 h-4 w-4" />
                                            Marcar como Ativo
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(recipe)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash className="mr-2 h-4 w-4" />
                                        Excluir
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      
      {recipeToPrint && (
        <>
          <RecipeTechnicalPrintDialog
            recipe={recipeToPrint}
            preparations={recipeToPrint.processes || []}
            isOpen={isPrintDialogOpen}
            onClose={() => setIsPrintDialogOpen(false)}
          />
          
          <RecipeSimplePrintDialog
            recipe={recipeToPrint}
            preparations={recipeToPrint.processes || []}
            isOpen={isPrintRecipeDialogOpen}
            onClose={() => setIsPrintRecipeDialogOpen(false)}
          />
        </>
      )}
        </div>
      </div>
    </div>
  );
}
