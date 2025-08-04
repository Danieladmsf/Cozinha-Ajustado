import React, { useState, useEffect } from "react";
import { NutritionFood } from "@/app/api/entities";
import { Ingredient } from "@/app/api/entities";
import { RecipeNutritionConfig } from "@/app/api/entities";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";

export default function NutritionalInfo({ recipe, autoExpand = false }) {
  const [nutritionalData, setNutritionalData] = useState({});
  const [nutritionFoods, setNutritionFoods] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTableVisible, setIsTableVisible] = useState(autoExpand);
  const [selectedNutrients, setSelectedNutrients] = useState({});
  const [portionSize, setPortionSize] = useState('100');
  const [configId, setConfigId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Unidades para cada tipo de nutriente
  const NUTRIENT_UNITS = {
    energy_kcal: "kcal",
    energy_kj: "kJ",
    protein_g: "g",
    lipid_g: "g",
    cholesterol_mg: "mg",
    carbohydrate_g: "g",
    fiber_g: "g",
    calcium_mg: "mg",
    iron_mg: "mg",
    sodium_mg: "mg",
    potassium_mg: "mg",
    copper_mg: "mg",
    zinc_mg: "mg",
    retinol_mcg: "mcg",
    thiamine_mg: "mg",
    riboflavin_mg: "mg",
    pyridoxine_mg: "mg",
    niacin_mg: "mg",
    vitaminC_mg: "mg",
    saturated_g: "g",
    monounsaturated_g: "g",
    polyunsaturated_g: "g",
    ashes_g: "g",
    magnesium_mg: "mg",
    manganese_mg: "mg",
    phosphorus_mg: "mg"
  };

  // Nome dos nutrientes para exibição
  const NUTRIENT_NAMES = {
    energy_kcal: "Valor Energético (kcal)",
    energy_kj: "Valor Energético (kJ)",
    protein_g: "Proteínas",
    lipid_g: "Gorduras Totais",
    cholesterol_mg: "Colesterol",
    carbohydrate_g: "Carboidratos",
    fiber_g: "Fibra Alimentar",
    calcium_mg: "Cálcio",
    iron_mg: "Ferro",
    sodium_mg: "Sódio",
    potassium_mg: "Potássio",
    copper_mg: "Cobre",
    zinc_mg: "Zinco",
    retinol_mcg: "Retinol",
    thiamine_mg: "Tiamina",
    riboflavin_mg: "Riboflavina",
    pyridoxine_mg: "Piridoxina",
    niacin_mg: "Niacina",
    vitaminC_mg: "Vitamina C",
    saturated_g: "Gorduras Saturadas",
    monounsaturated_g: "Gorduras Monoinsaturadas",
    polyunsaturated_g: "Gorduras Poli-insaturadas",
    ashes_g: "Cinzas",
    magnesium_mg: "Magnésio",
    manganese_mg: "Manganês",
    phosphorus_mg: "Fósforo"
  };

  // Organizar nutrientes em categorias
  const CATEGORY_MAP = {
    "Composição Centesimal": [
      "energy_kcal", "energy_kj", "protein_g", 
      "carbohydrate_g", "lipid_g", "fiber_g", "ashes_g"
    ],
    "Minerais": [
      "calcium_mg", "iron_mg", "sodium_mg", "potassium_mg", "copper_mg", "zinc_mg", "magnesium_mg", "manganese_mg", "phosphorus_mg"
    ],
    "Vitaminas": [
      "retinol_mcg", "thiamine_mg", "riboflavin_mg", "pyridoxine_mg", "niacin_mg", "vitaminC_mg"
    ],
    "Gorduras": [
      "saturated_g", "monounsaturated_g", "polyunsaturated_g", "cholesterol_mg"
    ]
  };

  // Carregar dados necessários
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Carregar dados nutricionais e ingredientes
        const [foods, ingredientsData] = await Promise.all([
          NutritionFood.list(),
          Ingredient.list()
        ]);
        
        setNutritionFoods(foods);
        setIngredients(ingredientsData);

        // Carregar configurações da receita
        if (recipe?.id) {
          const configs = await RecipeNutritionConfig.filter({
            recipe_id: recipe.id
          });
          
          if (configs.length > 0) {
            const config = configs[0];
            setPortionSize(config.portion_size || recipe.portion_size || 100);
            setSelectedNutrients(config.selected_nutrients || {});
            setConfigId(config.id);
          } else {
            setPortionSize(recipe.portion_size || 100);
            setDefaultNutrients();
          }
        }
      } catch (error) {setError("Não foi possível carregar os dados nutricionais");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [recipe?.id]);

  const setDefaultNutrients = () => {
    const defaultNutrients = {
      energy_kcal: true,
      protein_g: true,
      carbohydrate_g: true,
      lipid_g: true,
      fiber_g: true,
      calcium_mg: true,
      iron_mg: true,
      sodium_mg: true
    };
    setSelectedNutrients(defaultNutrients);
  };

  // Função para calcular valores nutricionais
  const calculateNutrition = () => {
    if (!recipe?.ingredients || !nutritionFoods.length || !ingredients.length) return;

    const values = {};
    let totalEffectiveWeight = 0; // Peso total considerando rendimentos

    // Para cada ingrediente da receita
    recipe.ingredients.forEach(recipeIng => {
      // Encontrar o ingrediente correspondente
      const ingredient = ingredients.find(i => i.id === recipeIng.ingredient_id);
      if (!ingredient) return;

      // Encontrar dados nutricionais usando taco_id do ingrediente
      const nutritionData = nutritionFoods.find(f => 
        f.id === ingredient.taco_id || f.taco_id === ingredient.taco_id
      );
      if (!nutritionData) return;

      // Calcular quantidade em gramas
      let rawQuantity = parseFloat(recipeIng.quantity || 0);
      if (recipeIng.unit === 'kg') rawQuantity *= 1000;

      // Calcular rendimento
      let yieldFactor = 1; // Padrão 1:1
      if (recipeIng.yield_info?.total_yield) {
        const yield_value = parseFloat(recipeIng.yield_info.total_yield);
        if (!isNaN(yield_value) && yield_value > 0) {
          yieldFactor = yield_value;
        }
      }

      // Quantidade efetiva após rendimento
      const effectiveQuantity = rawQuantity * yieldFactor;
      totalEffectiveWeight += effectiveQuantity;

      // Calcular nutrientes
      Object.keys(NUTRIENT_UNITS).forEach(nutrient => {
        const value = parseFloat(nutritionData[nutrient]);
        if (!isNaN(value)) {
          // (valor por 100g) * (quantidade efetiva em g / 100g)
          values[nutrient] = (values[nutrient] || 0) + 
            (value * effectiveQuantity) / 100;
        }
      });
    });

    // Ajustar para porção
    if (portionSize && totalEffectiveWeight) {
      const ratio = portionSize / totalEffectiveWeight;
      Object.keys(values).forEach(nutrient => {
        values[nutrient] *= ratio;
      });
    }

    setNutritionalData(values);
  };

  // Recalcular quando dados necessários estiverem disponíveis
  useEffect(() => {
    if (isTableVisible && recipe?.ingredients && nutritionFoods.length > 0 && ingredients.length > 0) {
      calculateNutrition();
    }
  }, [portionSize, isTableVisible, recipe?.ingredients, nutritionFoods, ingredients]);

  const calculateVDR = (nutrientId, nutrientValue) => {
    const vdr = {
      energy_kcal: 2000,
      protein_g: 50,
      lipid_g: 78,
      carbohydrate_g: 275,
      fiber_g: 28,
      calcium_mg: 1300,
      iron_mg: 18,
      sodium_mg: 2300
    };

    if (!nutrientValue || !vdr[nutrientId]) return '0%';

    const percentage = (nutrientValue / vdr[nutrientId]) * 100;
    return `${percentage.toFixed(1)}%`;
  };

  // Salvar configurações de nutrientes e porção
  const saveNutritionConfig = async () => {
    if (!recipe?.id) return;

    try {
      setIsSaving(true);
      
      const configData = {
        recipe_id: recipe.id,
        portion_size: parseFloat(portionSize),
        selected_nutrients: selectedNutrients,
        updated_by: "current_user",
        last_updated: new Date().toISOString()
      };

      if (configId) {
        await RecipeNutritionConfig.update(configId, configData);
      } else {
        const newConfig = await RecipeNutritionConfig.create(configData);
        setConfigId(newConfig.id);
      }

      toast({
        title: "Configurações salvas",
        description: "Preferências nutricionais salvas com sucesso.",
      });

    } catch (error) {toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNutrientToggle = (nutrient) => {
    setSelectedNutrients(prev => ({
      ...prev,
      [nutrient]: !prev[nutrient]
    }));
  };

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Informação Nutricional</h4>
        <div className="flex gap-1">
          {/* Controles de porção e nutrientes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Configurar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Configurações Nutricionais</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="portion">Tamanho da Porção (g)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="portion"
                      type="number"
                      value={portionSize}
                      onChange={(e) => setPortionSize(e.target.value)}
                      min="1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => calculateNutrition()}
                    >
                      Calcular
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block">Nutrientes para exibir</Label>
                  <Tabs defaultValue="composicao">
                    <TabsList className="grid grid-cols-4 h-9">
                      <TabsTrigger value="composicao" className="text-xs">Composição</TabsTrigger>
                      <TabsTrigger value="minerais" className="text-xs">Minerais</TabsTrigger>
                      <TabsTrigger value="vitaminas" className="text-xs">Vitaminas</TabsTrigger>
                      <TabsTrigger value="gorduras" className="text-xs">Gorduras</TabsTrigger>
                    </TabsList>
                    
                    <ScrollArea className="h-[200px] mt-2">
                      <TabsContent value="composicao" className="space-y-1">
                        {CATEGORY_MAP["Composição Centesimal"].map(nutrient => (
                          <div key={nutrient} className="flex items-center space-x-2">
                            <Checkbox 
                              id={nutrient} 
                              checked={selectedNutrients[nutrient] || false}
                              onCheckedChange={() => handleNutrientToggle(nutrient)}
                            />
                            <Label htmlFor={nutrient} className="text-sm">
                              {NUTRIENT_NAMES[nutrient]}
                            </Label>
                          </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="minerais" className="space-y-1">
                        {CATEGORY_MAP["Minerais"].map(nutrient => (
                          <div key={nutrient} className="flex items-center space-x-2">
                            <Checkbox 
                              id={nutrient} 
                              checked={selectedNutrients[nutrient] || false}
                              onCheckedChange={() => handleNutrientToggle(nutrient)}
                            />
                            <Label htmlFor={nutrient} className="text-sm">
                              {NUTRIENT_NAMES[nutrient]}
                            </Label>
                          </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="vitaminas" className="space-y-1">
                        {CATEGORY_MAP["Vitaminas"].map(nutrient => (
                          <div key={nutrient} className="flex items-center space-x-2">
                            <Checkbox 
                              id={nutrient} 
                              checked={selectedNutrients[nutrient] || false}
                              onCheckedChange={() => handleNutrientToggle(nutrient)}
                            />
                            <Label htmlFor={nutrient} className="text-sm">
                              {NUTRIENT_NAMES[nutrient]}
                            </Label>
                          </div>
                        ))}
                      </TabsContent>
                      
                      <TabsContent value="gorduras" className="space-y-1">
                        {CATEGORY_MAP["Gorduras"].map(nutrient => (
                          <div key={nutrient} className="flex items-center space-x-2">
                            <Checkbox 
                              id={nutrient} 
                              checked={selectedNutrients[nutrient] || false}
                              onCheckedChange={() => handleNutrientToggle(nutrient)}
                            />
                            <Label htmlFor={nutrient} className="text-sm">
                              {NUTRIENT_NAMES[nutrient]}
                            </Label>
                          </div>
                        ))}
                      </TabsContent>
                    </ScrollArea>
                  </Tabs>
                </div>
                
                <Button 
                  onClick={saveNutritionConfig} 
                  className="w-full"
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsTableVisible(!isTableVisible)}
          >
            {isTableVisible ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isTableVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border border-black mt-4">
              <div className="text-center font-bold p-1 border-b border-black bg-gray-100">
                INFORMAÇÃO NUTRICIONAL
              </div>
              <div className="text-center text-sm p-1 border-b border-black">
                Porção de {portionSize}g
              </div>

              {Object.entries(CATEGORY_MAP).map(([category, nutrients]) => {
                const selectedNutrientsInCategory = nutrients.filter(
                  id => selectedNutrients[id]
                );

                if (selectedNutrientsInCategory.length === 0) return null;

                return (
                  <React.Fragment key={category}>
                    <div className="bg-gray-100 p-2 font-medium border-b border-black">
                      {category}
                    </div>
                    {selectedNutrientsInCategory.map(nutrientId => (
                      <div key={nutrientId} 
                           className="grid grid-cols-12 text-sm border-b border-black">
                        <div className="col-span-7 p-2 border-r border-black">
                          {NUTRIENT_NAMES[nutrientId]}
                        </div>
                        <div className="col-span-3 p-2 text-center border-r border-black">
                          {nutritionalData[nutrientId]?.toFixed(2) || "0"} {NUTRIENT_UNITS[nutrientId]}
                        </div>
                        <div className="col-span-2 p-2 text-center">
                          {calculateVDR(nutrientId, nutritionalData[nutrientId])}
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })}

              <div className="p-2 text-xs text-gray-600">
                * % Valores Diários com base em uma dieta de 2.000kcal ou 8.400kJ.
                Seus valores diários podem ser maiores ou menores dependendo de suas necessidades energéticas.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}