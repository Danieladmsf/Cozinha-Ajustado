'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Save
} from "lucide-react";

import { useMenuSettings } from '@/hooks/useMenuSettings';
import Categorias from '@/components/cardapio/configuracoes/Categorias';
import Layout from '@/components/cardapio/configuracoes/Layout';
import Clientes from '@/components/cardapio/configuracoes/Clientes';
import Cores from '@/components/cardapio/configuracoes/Cores';
import DiasDaSemana from '@/components/cardapio/configuracoes/DiasDaSemana';

export default function MenuSettingsComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");

  const {
    // Estados
    categories,
    categoryTree,
    customers,
    loading,
    saving,
    error,
    selectedMainCategories,
    activeCategories,
    expandedCategories,
    categoryColors,
    fixedDropdowns,
    availableDays,
    categoryOrder,
    clientCategorySettings,
    
    // Setters
    setSelectedMainCategories,
    setActiveCategories,
    setExpandedCategories,
    setCategoryColors,
    setFixedDropdowns,
    setAvailableDays,
    setCategoryOrder,
    setClientCategorySettings,
    
    // Funções
    saveConfig,
    getFilteredCategories,
    toggleCategoryActive,
    toggleExpandedCategory,
    updateCategoryColor,
    updateFixedDropdowns,
    toggleDay
  } = useMenuSettings();

  const handleSave = async () => {
    const success = await saveConfig();
    
    if (success) {
      toast({
        title: "Configurações salvas!",
        description: "As configurações do cardápio foram salvas com sucesso.",
      });
      
      router.push('/cardapio');
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/cardapio')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Cardápio
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="h-6 w-6" />
                  Configurações do Cardápio
                </h1>
                <p className="text-gray-600">
                  Configure as categorias visíveis, cores, número de dropdowns fixos e dias disponíveis
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="colors">Cores</TabsTrigger>
            <TabsTrigger value="days">Dias da Semana</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-8">
            <Categorias
              categories={categories}
              categoryTree={categoryTree}
              selectedMainCategories={selectedMainCategories}
              setSelectedMainCategories={setSelectedMainCategories}
            />
          </TabsContent>

          <TabsContent value="layout" className="space-y-8">
            <Layout
              categories={categories}
              categoryTree={categoryTree}
              selectedMainCategories={selectedMainCategories}
              activeCategories={activeCategories}
              expandedCategories={expandedCategories}
              categoryColors={categoryColors}
              fixedDropdowns={fixedDropdowns}
              categoryOrder={categoryOrder}
              getFilteredCategories={getFilteredCategories}
              toggleCategoryActive={toggleCategoryActive}
              toggleExpandedCategory={toggleExpandedCategory}
              updateFixedDropdowns={updateFixedDropdowns}
              setCategoryOrder={setCategoryOrder}
            />
          </TabsContent>

          <TabsContent value="clients" className="space-y-8">
            <Clientes
              categories={categories}
              customers={customers}
              clientCategorySettings={clientCategorySettings}
              setClientCategorySettings={setClientCategorySettings}
              categoryColors={categoryColors}
              fixedDropdowns={fixedDropdowns}
              getFilteredCategories={getFilteredCategories}
            />
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <Cores
              categoryColors={categoryColors}
              updateCategoryColor={updateCategoryColor}
              getFilteredCategories={getFilteredCategories}
            />
          </TabsContent>

          <TabsContent value="days" className="space-y-6">
            <DiasDaSemana
              availableDays={availableDays}
              toggleDay={toggleDay}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}