'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Printer } from 'lucide-react';
import MenuHeader from '@/components/shared/MenuHeader';
import SectionContainer, { Section } from '@/components/shared/SectionContainer';
import { useMenuData } from '@/hooks/cardapio/useMenuData';
import { useClientConfig } from '@/hooks/cardapio/useClientConfig';
import { useMenuHelpers } from '@/hooks/cardapio/useMenuHelpers';
import { usePrintMenu } from '@/hooks/cardapio/usePrintMenu';
import { useMenuLocations } from '@/hooks/cardapio/useMenuLocations';

// Componentes UI separados
import ClientTabs from './ClientTabs';
import WeeklyMenuGrid from './WeeklyMenuGrid';

export default function ClientMenuComponent() {
  const { toast } = useToast();

  // Estados
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Hooks
  const {
    categories,
    recipes,
    weeklyMenu,
    customers,
    menuConfig,
    loading,
    loadWeeklyMenu
  } = useMenuData(currentDate);

  const { locations, loading: locationsLoading, getLocationById, getAllClientIds } = useMenuLocations();
  const { applyClientConfig, getFilteredItemsForClient } = useClientConfig(menuConfig, getAllClientIds());
  const menuHelpers = useMenuHelpers();
  const { handlePrintCardapio: printMenu } = usePrintMenu();


  // Handler de navegação
  const handleDateChange = useCallback((newDate) => {
    setCurrentDate(newDate);
    loadWeeklyMenu(newDate);
  }, [loadWeeklyMenu]);

  // Funções utilitárias
  const getActiveCategories = useMemo(() => {
    let activeCategories = menuHelpers.getActiveCategories(categories, menuConfig);

    if (selectedCustomer && selectedCustomer.id !== 'all') {
      activeCategories = applyClientConfig(activeCategories, selectedCustomer.id);
    }

    return activeCategories;
  }, [categories, menuConfig, selectedCustomer, menuHelpers, applyClientConfig]);

  const getCategoryColor = useCallback((categoryId) => {
    return menuHelpers.getCategoryColor(categoryId, categories, menuConfig);
  }, [menuHelpers, categories, menuConfig]);

  const handlePrintCardapio = (customerId) => {
    if (!weeklyMenu) {
      toast({
        title: "Erro",
        description: "Nenhum cardápio disponível para impressão.",
        variant: "destructive"
      });
      return;
    }

    try {
      printMenu(
        weeklyMenu,
        categories,
        recipes,
        customers,
        locations,
        customerId,
        currentDate,
        getCategoryColor
      );
      
      toast({
        title: "Impressão",
        description: `Cardápio${customerId !== 'all' ? ' personalizado' : ''} enviado para impressão.`,
      });
    } catch (error) {
      console.error('Erro ao imprimir cardápio:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar impressão do cardápio.",
        variant: "destructive"
      });
    }
  };

  // Loading state
  if (loading || locationsLoading || !categories || !recipes) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header Section */}
          <SectionContainer 
            variant="gradient"
            className="border-0 shadow-lg"
          >
            <MenuHeader 
              currentDate={currentDate}
              onDateChange={handleDateChange}
              rightContent={
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintCardapio(selectedCustomer?.id || 'all')}
                  className="gap-2 bg-white hover:bg-gray-50 border-gray-300"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Cardápio
                </Button>
              }
            />
          </SectionContainer>

          {/* Seleção de Clientes Section */}
          <SectionContainer 
            title="Seleção de Cliente"
            subtitle="Escolha o cliente para visualizar o cardápio personalizado"
            variant="elevated"
            className="border-purple-200"
            icon={Printer}
          >
            <Section>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200/50 overflow-hidden">
                <ClientTabs
                  selectedCustomer={selectedCustomer}
                  locations={locations}
                  customers={customers}
                  getLocationById={getLocationById}
                  onCustomerChange={setSelectedCustomer}
                />
              </div>
            </Section>
          </SectionContainer>

          {/* Cardápio Semanal Section */}
          <SectionContainer 
            title="Cardápio Semanal"
            subtitle={selectedCustomer?.id === 'all' ? 
              'Visualização completa do cardápio' : 
              `Cardápio personalizado para ${selectedCustomer?.name || 'cliente selecionado'}`
            }
            variant="gradient"
          >
            <Section>
              <div className="p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/30">
                <WeeklyMenuGrid
                  currentDate={currentDate}
                  weeklyMenu={weeklyMenu}
                  activeCategories={getActiveCategories}
                  recipes={recipes}
                  selectedCustomer={selectedCustomer}
                  getFilteredItemsForClient={getFilteredItemsForClient}
                  getCategoryColor={getCategoryColor}
                />
              </div>
            </Section>
          </SectionContainer>
        </div>
      </div>
    </div>
  );
}