import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, addDays } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { 
  SlidersHorizontal, 
  Building2, 
  Users, 
  Utensils 
} from "lucide-react";
import { useNutritionCalculator } from './NutritionCalculator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Nutrient configuration
const nutrientConfig = {
  nutrientNames: {
    energy_kcal: "Valor Energético (kcal)",
    protein_g: "Proteínas",
    carbohydrate_g: "Carboidratos",
    lipid_g: "Gorduras Totais",
    fiber_g: "Fibra Alimentar",
    calcium_mg: "Cálcio",
    iron_mg: "Ferro",
    sodium_mg: "Sódio"
  },
  nutrientUnits: {
    energy_kcal: "kcal",
    protein_g: "g",
    carbohydrate_g: "g",
    lipid_g: "g",
    fiber_g: "g",
    calcium_mg: "mg",
    iron_mg: "mg",
    sodium_mg: "mg"
  }
};

export default function NutritionCalculatorComponent({ 
  menu, 
  currentDayIndex = 1,
  selectedNutrients = {},
  expandedCategories = []
}) {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const [locations, setLocations] = useState([]);
  const [recipes, setRecipes] = useState([]);

  // Importar hook de cálculo nutricional
  const { 
    calculateDayNutrition, 
    calculateLocationNutrition,
    calculateRecipeNutrition
  } = useNutritionCalculator();

  // Carregar locais e receitas
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar dados necessários via SDK
        const customersData = await import('@/app/api/entities').then(m => m.Customer.list());
        const recipesData = await import('@/app/api/entities').then(m => m.Recipe.list());
        
        // Filtrar clientes ativos
        const activeLocations = customersData
          .filter(c => c.active)
          .map(c => ({
            id: c.id,
            name: c.name,
            photo: c.photo
          }));
        
        setLocations(activeLocations);
        setRecipes(recipesData.filter(r => r.active));
        
      } catch (error) {}
    };
    
    fetchData();
  }, []);

  // Filtrar nutrientes selecionados
  const getSelectedNutrientIds = () => {
    return Object.entries(selectedNutrients)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);
  };

  // Formatar valor nutricional
  const formatNutrientValue = (value, nutrientId) => {
    if (value === undefined || value === null) return "-";
    
    const unit = nutrientConfig.nutrientUnits[nutrientId] || "";
    return `${parseFloat(value).toFixed(2)} ${unit}`;
  };

  // Obter nome do dia da semana
  const getDayName = (dayNumber) => {
    const dayNames = {
      1: "Segunda",
      2: "Terça",
      3: "Quarta",
      4: "Quinta",
      5: "Sexta"
    };
    return dayNames[dayNumber] || "";
  };

  // Renderizar tabela geral
  const renderGeneralTable = () => {
    if (!menu) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="text-gray-500">Nenhum cardápio disponível para esta semana</p>
        </div>
      );
    }

    const selectedNutrientIds = getSelectedNutrientIds();
    // Validate date before using with date-fns
    const menuDate = menu.start_date ? new Date(menu.start_date) : new Date();
    const weekStart = !isNaN(menuDate.getTime()) ? startOfWeek(menuDate, { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 });

    return (
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 py-4">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Users className="h-5 w-5" />
            Cardápio Geral (Todos os Locais)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Nutriente</th>
                  {[1, 2, 3, 4, 5].map(day => {
                    const dayDate = addDays(weekStart, day - 1);
                    return (
                      <th key={day} className="py-3 px-4 text-center font-medium">
                        <div className="flex flex-col items-center">
                          <span className="text-blue-700">{getDayName(day)}</span>
                          <span className="text-sm text-gray-500">{format(dayDate, 'dd/MM')}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Linhas de nutrientes */}
                {selectedNutrientIds.map(nutrientId => (
                  <tr key={nutrientId} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium bg-gray-50">
                      {nutrientConfig.nutrientNames[nutrientId] || nutrientId}
                    </td>
                    {[1, 2, 3, 4, 5].map(day => {
                      // Calcular nutrição total do dia
                      const dayNutrition = calculateDayNutrition(menu, day, recipes);
                      const nutrientValue = dayNutrition[nutrientId] || 0;

                      return (
                        <td key={day} className="py-3 px-4 text-center">
                          {formatNutrientValue(nutrientValue, nutrientId)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderizar tabela por local
  const renderLocationTable = () => {
    if (!menu || !selectedCustomer) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="text-gray-500">Selecione um cliente para visualizar sua tabela nutricional</p>
        </div>
      );
    }

    const selectedNutrientIds = getSelectedNutrientIds();
    // Validate date before using with date-fns
    const menuDate = menu.start_date ? new Date(menu.start_date) : new Date();
    const weekStart = !isNaN(menuDate.getTime()) ? startOfWeek(menuDate, { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 });

    return (
      <Card className="shadow-md border-0">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 py-4">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Building2 className="h-5 w-5" />
            {selectedCustomer.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 text-left font-semibold text-gray-600">Nutriente</th>
                  {[1, 2, 3, 4, 5].map(day => {
                    const dayDate = addDays(weekStart, day - 1);
                    return (
                      <th key={day} className="py-3 px-4 text-center font-medium">
                        <div className="flex flex-col items-center">
                          <span className="text-green-700">{getDayName(day)}</span>
                          <span className="text-sm text-gray-500">{format(dayDate, 'dd/MM')}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Linhas de nutrientes */}
                {selectedNutrientIds.map(nutrientId => (
                  <tr key={nutrientId} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium bg-gray-50">
                      {nutrientConfig.nutrientNames[nutrientId] || nutrientId}
                    </td>
                    {[1, 2, 3, 4, 5].map(day => {
                      // Calcular nutrição para o local específico
                      const locationNutrition = calculateLocationNutrition(
                        menu, day, selectedCustomer.id, recipes
                      );
                      const nutrientValue = locationNutrition[nutrientId] || 0;

                      return (
                        <td key={day} className="py-3 px-4 text-center">
                          {formatNutrientValue(nutrientValue, nutrientId)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Configurar Nutrientes
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Por Cliente</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {selectedTab === 'location' && (
          <div className="flex-1 md:flex-none">
            <Select
              value={selectedCustomer?.id || ""}
              onValueChange={(value) => {
                const customer = locations.find(loc => loc.id === value);
                setSelectedCustomer(customer || null);
              }}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        {selectedTab === 'all' ? renderGeneralTable() : renderLocationTable()}
      </div>
    </div>
  );
}