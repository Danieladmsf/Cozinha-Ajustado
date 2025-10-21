'use client';


import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPageUrl } from "@/utils";
import { NutritionCategory, NutritionFood } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils";
import {
  Apple,
  Search,
  PlusCircle,
  Upload,
  Salad,
  Beef,
  Coffee,
  Egg,
  Cookie,
  Fish,
  Milk,
  Wheat,
  Banana,
  Wine,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Package,
  Plus,
  CalendarIcon,
  ChevronLeft,
  Utensils,
  ShoppingCart,
  Star,
  Heart
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';

export default function Nutrition() {
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const router = useRouter();
  
  // Novo estado para navegação por semana
  const [currentDate, setCurrentDate] = useState(new Date());
  
  useEffect(() => {
    fetchData();
  }, []);

  // Função para navegação entre períodos
  const handleNavigation = (direction) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  // Função para obter categorias únicas de todos os alimentos
  const getDynamicCategories = (foodsData) => {
    // Extrair categorias únicas dos alimentos
    const uniqueCategories = new Map();
    
    foodsData.forEach(food => {
      if (food.category_name) {
        // Se ainda não temos esta categoria, adicionar
        if (!uniqueCategories.has(food.category_name.toLowerCase())) {
          uniqueCategories.set(food.category_name.toLowerCase(), {
            category: food.category_name,
            count: 1,
            id: food.category_id || `dynamic-${food.category_name.toLowerCase().replace(/\s+/g, '-')}`
          });
        } else {
          // Incrementar contador
          const category = uniqueCategories.get(food.category_name.toLowerCase());
          category.count++;
        }
      }
    });
    
    // Converter para array e ordenar por nome
    return Array.from(uniqueCategories.values())
      .sort((a, b) => a.category.localeCompare(b.category));
  };

  // Modificar fetchData para usar categorias dinâmicas
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Testar acesso às coleções separadamente para diagnóstico
      const foodsData = await NutritionFood.list();
      
      const storedCategories = await NutritionCategory.list();
      
      // Obter categorias dinâmicas a partir dos alimentos
      const dynamicCategories = getDynamicCategories(foodsData);
      
      // Mapear categorias por nome
      const categoryMap = new Map();
      storedCategories.forEach(cat => {
        if (cat.category) {
          categoryMap.set(cat.category.toLowerCase(), cat);
        }
      });
      
      // Complementar categorias dinâmicas com IDs das categorias cadastradas
      const enhancedCategories = dynamicCategories.map(dynCat => {
        // Verificar se dynCat.category existe antes de chamar toLowerCase()
        if (!dynCat.category) {
          return {
            ...dynCat,
            category: 'Sem Categoria',
            id: dynCat.id
          };
        }
        
        const storedCat = categoryMap.get(dynCat.category.toLowerCase());
        return {
          ...dynCat,
          id: storedCat?.id || dynCat.id || `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          // Usar categoria cadastrada se houver, senão usar a do alimento
          category: storedCat?.category || dynCat.category
        };
      });
      
      // Garantir que todos os alimentos tenham IDs válidos
      const validatedFoods = foodsData.map((food, index) => ({
        ...food,
        id: food.id || `food-${index}-${Date.now()}`
      }));

      setCategories(enhancedCategories);
      setFoods(validatedFoods);
      
      
    } catch (error) {
      // Verificar se é erro de autenticação
      if (error.code === 'permission-denied' || error.message?.includes('permission-denied')) {
      }
      
      // Verificar se é erro de rede
      if (error.code === 'unavailable' || error.message?.includes('unavailable')) {
      }
      
    } finally {
      setLoading(false);
    }
  };

  // Função para obter a cor associada à categoria
  const getCategoryColor = (categoryName) => {
    if (!categoryName) return "#94A3B8"; // Cor padrão
    
    // Gera cor baseada no hash do nome da categoria para consistência
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      "#F59E0B", "#10B981", "#F97316", "#DC2626", "#0EA5E9", 
      "#8B5CF6", "#EC4899", "#FBBF24", "#D946EF", "#22C55E", 
      "#84CC16", "#EAB308", "#06B6D4", "#F472B6", "#A855F7"
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Função para obter ícone mais adequado para a categoria
  const getCategoryIcon = (categoryName) => {
    if (!categoryName) return Coffee;
    
    // Gera ícone baseado no hash do nome da categoria
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const icons = [
      Wheat, Salad, Banana, Beef, Fish, Milk, Wine, Egg, 
      Cookie, Coffee, Utensils, ShoppingCart, Star, Heart
    ];
    
    return icons[Math.abs(hash) % icons.length];
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400 inline ml-1" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="w-3 h-3 inline ml-1" />;
    }
    return <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  const formatValue = (value, unit = "") => {
    if (value === undefined || value === null) return "-";
    if (value === "NA" || value === "Tr") return value;
    if (typeof value === "string") {
      if (value === "" || value.trim() === "") return "-";
      // Se for string mas puder ser convertido para número
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return `${numValue.toFixed(2)}${unit ? ` ${unit}` : ''}`;
      }
      return value; // Retorna a string original se não puder ser convertida
    }
    
    // Para valores numéricos
    return `${Number(value).toFixed(2)}${unit ? ` ${unit}` : ''}`;
  };

  // Ajuste na função de filtrar alimentos
  const sortedFoods = React.useMemo(() => {
    const filteredFoods = foods.filter(food => {
      // Verificar se o alimento tem os campos essenciais
      if (!food || !food.name) return false;
      
      // Filtrar por termo de busca
      const matchesSearch = (food.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            food.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filtrar por categoria selecionada
      let matchesCategory = true;
      if (selectedCategory) {
        // Verificar correspondência de categorias usando id e category_id
        matchesCategory = food.category_name === selectedCategory.category;
        
        // Log para ajudar a diagnosticar problemas com categorias
        if (food.category_name === selectedCategory.category && !matchesCategory) {
        }
      }
      
      return matchesSearch && matchesCategory;
    });

    return [...filteredFoods].sort((a, b) => {
      const key = sortConfig.key;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      let aValue = a[key];
      let bValue = b[key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }

      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();

      if (aValue < bValue) return -1 * direction;
      if (aValue > bValue) return 1 * direction;
      return 0;
    });
  }, [foods, searchTerm, selectedCategory, sortConfig]);

  return (
    <div className="flex h-full bg-gray-50">
      
      {/* Sidebar Fixa */}
      <div className="w-72 bg-white border-r h-full overflow-y-auto flex-shrink-0">
        <div className="p-4">
          {/* Header da Sidebar */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Tabela TACO</h2>
            <p className="text-sm text-gray-500">Composição de Alimentos</p>
          </div>

          {/* Busca */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar alimentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>

          {/* Lista de Categorias */}
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2",
                "transition-all duration-200 hover:bg-gray-50",
                !selectedCategory && "bg-blue-50 text-blue-700"
              )}
            >
              <Apple className="h-4 w-4" />
              <span className="flex-1 font-medium">Todos os Alimentos</span>
              <Badge variant="outline">{foods.length}</Badge>
            </button>

            {categories.map(category => {
              const CategoryIcon = getCategoryIcon(category.category);
              const categoryColor = getCategoryColor(category.category);
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2",
                    "transition-all duration-200 hover:bg-gray-50",
                    selectedCategory?.id === category.id && 
                      `bg-${categoryColor.substring(1)}/10 text-${categoryColor.substring(1)}-700`
                  )}
                  style={{ 
                    borderLeft: selectedCategory?.id === category.id ? 
                      `3px solid ${categoryColor}` : 'transparent' 
                  }}
                >
                  <CategoryIcon className="h-4 w-4" style={{ color: categoryColor }} />
                  <span className="flex-1 font-medium">{category.category}</span>
                  <Badge 
                    variant="outline" 
                    className={selectedCategory?.id === category.id ? 
                      `bg-${categoryColor.substring(1)}/20` : ''}
                  >
                    {category.count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {selectedCategory ? selectedCategory.category : "Todos os Alimentos"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {sortedFoods.length} alimentos encontrados
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Navegação semelhante ao cardápio */}
              <div className="flex items-center bg-white border rounded-md">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleNavigation('prev')}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <DateSelector 
                  currentDate={currentDate} 
                  onDateChange={setCurrentDate} 
                />
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleNavigation('next')}
                  className="h-9 w-9"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            
              <Button 
                variant="outline"
                onClick={() => router.push('/nutritionimport')}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar TACO
              </Button>

              <Button onClick={() => router.push('/nutritionfoodeditor')}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Alimento
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs de Nutrientes */}
        <div className="p-8 flex-1 overflow-hidden">
          <Tabs defaultValue="macro" className="h-full">
            <TabsList className="bg-white rounded-lg border p-1 mb-6">
              <TabsTrigger value="macro">Macronutrientes</TabsTrigger>
              <TabsTrigger value="minerais">Minerais</TabsTrigger>
              <TabsTrigger value="vitaminas">Vitaminas</TabsTrigger>
              <TabsTrigger value="acidos">Ácidos Graxos</TabsTrigger>
            </TabsList>

            <div className="h-[calc(100%-4rem)] overflow-auto">
              {/* Tab Macronutrientes */}
              <TabsContent value="macro" className="mt-0 h-full">
                <Card className="border-0 shadow-sm h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alimento</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead onClick={() => handleSort('energy_kcal')}>
                          Energia (kcal) {getSortIcon('energy_kcal')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('protein_g')}>
                          Proteínas (g) {getSortIcon('protein_g')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('carbohydrate_g')}>
                          Carboidratos (g) {getSortIcon('carbohydrate_g')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('lipid_g')}>
                          Lipídeos (g) {getSortIcon('lipid_g')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('fiber_g')}>
                          Fibras (g) {getSortIcon('fiber_g')}
                        </TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFoods.map(food => {
                        const categoryColor = getCategoryColor(food.category_name);
                        
                        return (
                          <TableRow key={food.id} className="group">
                            <TableCell className="font-medium">{food.description || food.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-gray-50"
                                style={{ 
                                  backgroundColor: `${categoryColor}15`,
                                  color: categoryColor,
                                  borderColor: `${categoryColor}30`
                                }}
                              >
                                {food.category_name}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatValue(food.energy_kcal)}</TableCell>
                            <TableCell>{formatValue(food.protein_g)}</TableCell>
                            <TableCell>{formatValue(food.carbohydrate_g)}</TableCell>
                            <TableCell>{formatValue(food.lipid_g)}</TableCell>
                            <TableCell>{formatValue(food.fiber_g)}</TableCell>
                            <TableCell>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/nutritionfoodeditor?id=${food.id}`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Tab Minerais */}
              <TabsContent value="minerais" className="mt-0 h-full">
                <Card className="border-0 shadow-sm h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alimento</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead onClick={() => handleSort('calcium_mg')}>
                          Cálcio (mg) {getSortIcon('calcium_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('iron_mg')}>
                          Ferro (mg) {getSortIcon('iron_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('magnesium_mg')}>
                          Magnésio (mg) {getSortIcon('magnesium_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('phosphorus_mg')}>
                          Fósforo (mg) {getSortIcon('phosphorus_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('sodium_mg')}>
                          Sódio (mg) {getSortIcon('sodium_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('potassium_mg')}>
                          Potássio (mg) {getSortIcon('potassium_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('zinc_mg')}>
                          Zinco (mg) {getSortIcon('zinc_mg')}
                        </TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFoods.map(food => {
                        const categoryColor = getCategoryColor(food.category_name);

                        return (
                          <TableRow key={food.id} className="group">
                            <TableCell className="font-medium">{food.description || food.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-gray-50"
                                style={{ 
                                  backgroundColor: `${categoryColor}15`,
                                  color: categoryColor,
                                  borderColor: `${categoryColor}30`
                                }}
                              >
                                {food.category_name}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatValue(food.calcium_mg)}</TableCell>
                            <TableCell>{formatValue(food.iron_mg)}</TableCell>
                            <TableCell>{formatValue(food.magnesium_mg)}</TableCell>
                            <TableCell>{formatValue(food.phosphorus_mg)}</TableCell>
                            <TableCell>{formatValue(food.sodium_mg)}</TableCell>
                            <TableCell>{formatValue(food.potassium_mg)}</TableCell>
                            <TableCell>{formatValue(food.zinc_mg)}</TableCell>
                            <TableCell>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/nutritionfoodeditor?id=${food.id}`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Tab Vitaminas */}
              <TabsContent value="vitaminas" className="mt-0 h-full">
                <Card className="border-0 shadow-sm h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alimento</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead onClick={() => handleSort('retinol_mcg')}>
                          Retinol (mcg) {getSortIcon('retinol_mcg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('thiamine_mg')}>
                          Tiamina (mg) {getSortIcon('thiamine_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('riboflavin_mg')}>
                          Riboflavina (mg) {getSortIcon('riboflavin_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('pyridoxine_mg')}>
                          Piridoxina (mg) {getSortIcon('pyridoxine_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('niacin_mg')}>
                          Niacina (mg) {getSortIcon('niacin_mg')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('vitaminC_mg')}>
                          Vitamina C (mg) {getSortIcon('vitaminC_mg')}
                        </TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFoods.map(food => {
                        const categoryColor = getCategoryColor(food.category_name);

                        return (
                          <TableRow key={food.id} className="group">
                            <TableCell className="font-medium">{food.description || food.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-gray-50"
                                style={{ 
                                  backgroundColor: `${categoryColor}15`,
                                  color: categoryColor,
                                  borderColor: `${categoryColor}30`
                                }}
                              >
                                {food.category_name}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatValue(food.retinol_mcg)}</TableCell>
                            <TableCell>{formatValue(food.thiamine_mg)}</TableCell>
                            <TableCell>{formatValue(food.riboflavin_mg)}</TableCell>
                            <TableCell>{formatValue(food.pyridoxine_mg)}</TableCell>
                            <TableCell>{formatValue(food.niacin_mg)}</TableCell>
                            <TableCell>{formatValue(food.vitaminC_mg)}</TableCell>
                            <TableCell>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/nutritionfoodeditor?id=${food.id}`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Tab Ácidos Graxos */}
              <TabsContent value="acidos" className="mt-0 h-full">
                <Card className="border-0 shadow-sm h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alimento</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead onClick={() => handleSort('saturated_g')}>
                          Saturados (g) {getSortIcon('saturated_g')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('monounsaturated_g')}>
                          Monoinsaturados (g) {getSortIcon('monounsaturated_g')}
                        </TableHead>
                        <TableHead onClick={() => handleSort('polyunsaturated_g')}>
                          Poli-insaturados (g) {getSortIcon('polyunsaturated_g')}
                        </TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFoods.map(food => {
                        const categoryColor = getCategoryColor(food.category_name);

                        return (
                          <TableRow key={food.id} className="group">
                            <TableCell className="font-medium">{food.description || food.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-gray-50"
                                style={{ 
                                  backgroundColor: `${categoryColor}15`,
                                  color: categoryColor,
                                  borderColor: `${categoryColor}30`
                                }}
                              >
                                {food.category_name}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatValue(food.saturated_g)}</TableCell>
                            <TableCell>{formatValue(food.monounsaturated_g)}</TableCell>
                            <TableCell>{formatValue(food.polyunsaturated_g)}</TableCell>
                            <TableCell>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/nutritionfoodeditor?id=${food.id}`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Componente para seleção de data semelhante ao do cardápio
const DateSelector = ({ currentDate, onDateChange }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant={"outline"}
        className={cn(
          "w-[180px] justify-start text-left font-normal",
          !currentDate && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {currentDate ? (
          format(currentDate, "MMMM yyyy", { locale: ptBR })
        ) : (
          <span>Selecione mês/ano</span>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="center">
      <Calendar
        mode="month"
        defaultMonth={currentDate}
        selected={currentDate}
        onSelect={onDateChange}
        disabled={(date) =>
          date > new Date() || date < new Date("2023-01-01")
        }
        initialFocus
      />
    </PopoverContent>
  </Popover>
);
