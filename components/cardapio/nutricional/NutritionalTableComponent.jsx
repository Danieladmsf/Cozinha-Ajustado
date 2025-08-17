'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Settings } from 'lucide-react';
import MenuHeader from '@/components/shared/MenuHeader';
import NutritionCalculatorComponent from './NutritionCalculatorComponent';
// SectionContainer removed to reduce card bloat
import { nutrientConfig } from '@/components/shared/nutrientConfig';
import { useMenuData } from '@/hooks/cardapio/useMenuData';
import { UserNutrientConfig } from '@/app/api/entities';
import { APP_CONSTANTS } from '@/lib/constants';

// Componente UI separado
import NutrientConfigDialog from './NutrientConfigDialog';

export default function NutritionalTableComponent() {
  const { toast } = useToast();

  // Estados principais
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDayIndex, setCurrentDayIndex] = useState(1);
  const [selectedNutrients, setSelectedNutrients] = useState({});
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [isSelectingNutrients, setIsSelectingNutrients] = useState(false);
  const [userNutrientConfigId, setUserNutrientConfigId] = useState(null);

  // Hook de dados
  const {
    categories,
    recipes,
    weeklyMenu,
    customers,
    menuConfig,
    loading,
    loadWeeklyMenu
  } = useMenuData(currentDate);

  // Carregar configuração de nutrientes do usuário
  useEffect(() => {
    loadUserNutrientConfig();
  }, []);

  const loadUserNutrientConfig = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const configs = await UserNutrientConfig.query([
        { field: 'user_id', operator: '==', value: mockUserId }
      ]);

      if (configs && configs.length > 0) {
        const config = configs[0];
        setUserNutrientConfigId(config.id);
        setSelectedNutrients(config.selected_nutrients || nutrientConfig.defaultSelected);
        setExpandedCategories(config.expanded_categories || nutrientConfig.expandedCategories);
      } else {
        // Usar configuração padrão
        setSelectedNutrients(nutrientConfig.defaultSelected);
        setExpandedCategories(nutrientConfig.expandedCategories);
        // Criar configuração padrão
        await createDefaultUserNutrientConfig();
      }
    } catch (error) {
      // Usar configuração padrão em caso de erro
      setSelectedNutrients(nutrientConfig.defaultSelected);
      setExpandedCategories(nutrientConfig.expandedCategories);
    }
  };

  const createDefaultUserNutrientConfig = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const defaultConfig = {
        user_id: mockUserId,
        selected_nutrients: nutrientConfig.defaultSelected,
        expanded_categories: nutrientConfig.expandedCategories
      };

      const newConfig = await UserNutrientConfig.create(defaultConfig);
      setUserNutrientConfigId(newConfig.id);
    } catch (error) {
    }
  };

  // Handlers de navegação
  const handleDateChange = useCallback((newDate) => {
    setCurrentDate(newDate);
    loadWeeklyMenu(newDate);
  }, [loadWeeklyMenu]);

  const handleWeekNavigation = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
    loadWeeklyMenu(newDate);
  };

  // Funções de configuração de nutrientes
  const toggleNutrient = (nutrientId) => {
    setSelectedNutrients(prev => ({
      ...prev,
      [nutrientId]: !prev[nutrientId]
    }));
  };

  const toggleCategory = (categoryName) => {
    const nutrients = nutrientConfig.nutrientCategories[categoryName] || [];
    const allSelected = nutrients.every(id => selectedNutrients[id]);

    setSelectedNutrients(prev => {
      const newSelected = { ...prev };
      nutrients.forEach(nutrientId => {
        newSelected[nutrientId] = !allSelected;
      });
      return newSelected;
    });
  };

  const saveUserNutrients = async () => {
    try {
      const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
      const configData = {
        user_id: mockUserId,
        selected_nutrients: selectedNutrients,
        expanded_categories: expandedCategories
      };

      if (userNutrientConfigId) {
        await UserNutrientConfig.update(userNutrientConfigId, configData);
      } else {
        const newConfig = await UserNutrientConfig.create(configData);
        setUserNutrientConfigId(newConfig.id);
      }

      setIsSelectingNutrients(false);
      
      toast({
        title: "Configuração salva",
        description: "Suas preferências de nutrientes foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  const resetToDefaults = () => {
    setSelectedNutrients(nutrientConfig.defaultSelected);
    setExpandedCategories(nutrientConfig.expandedCategories);
  };

  // Componente DateSelector
  const DateSelector = ({ currentDate, onDateChange }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentDate ? (
              format(currentDate, "MMMM yyyy", { locale: ptBR })
            ) : (
              "Selecione mês/ano"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={onDateChange}
            disabled={(date) => 
              date > new Date() || date < new Date(2020, 0, 1)
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  };

  // Renderizar seletor de nutrientes
  const renderNutrientSelector = () => (
    <Dialog open={isSelectingNutrients} onOpenChange={setIsSelectingNutrients}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Nutrientes por Categoria</DialogTitle>
          <DialogDescription>
            Selecione os nutrientes que deseja exibir na tabela nutricional
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {Object.entries(nutrientConfig.nutrientCategories).map(([category, nutrients]) => {
            const allSelected = nutrients.every(id => selectedNutrients[id]);
            const someSelected = nutrients.some(id => selectedNutrients[id]);
            
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onCheckedChange={() => toggleCategory(category)}
                  />
                  <label className="text-sm font-medium cursor-pointer" onClick={() => toggleCategory(category)}>
                    {category}
                  </label>
                </div>
                <div className="ml-6 grid grid-cols-1 gap-2">
                  {nutrients.map(nutrientId => (
                    <div key={nutrientId} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedNutrients[nutrientId] || false}
                        onCheckedChange={() => toggleNutrient(nutrientId)}
                      />
                      <label 
                        className="text-sm cursor-pointer" 
                        onClick={() => toggleNutrient(nutrientId)}
                      >
                        {nutrientConfig.nutrientNames?.[nutrientId] || nutrientId}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrões
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSelectingNutrients(false)}>
              Cancelar
            </Button>
            
            <Button onClick={saveUserNutrients}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-4">
            <MenuHeader 
              currentDate={currentDate}
              onDateChange={handleDateChange}
              rightContent={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectingNutrients(true)}
                  className="gap-2 bg-white hover:bg-gray-50 border-gray-300"
                >
                  <Settings className="h-4 w-4" />
                  Configurar Nutrientes
                </Button>
              }
            />
          </div>

          {/* Tabela Nutricional Section */}
          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Análise Nutricional</h2>
                <p className="text-sm text-gray-600">Valores nutricionais detalhados do cardápio semanal</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 overflow-hidden shadow-sm">
              <NutritionCalculatorComponent 
                menu={weeklyMenu}
                currentDayIndex={currentDayIndex}
                selectedNutrients={selectedNutrients}
                expandedCategories={expandedCategories}
                onDayChange={setCurrentDayIndex}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Configuração */}
      <NutrientConfigDialog
        isOpen={isSelectingNutrients}
        onClose={() => setIsSelectingNutrients(false)}
        selectedNutrients={selectedNutrients}
        onToggleNutrient={toggleNutrient}
        onToggleCategory={toggleCategory}
        onResetToDefaults={resetToDefaults}
        onSave={saveUserNutrients}
      />
    </div>
  );
}