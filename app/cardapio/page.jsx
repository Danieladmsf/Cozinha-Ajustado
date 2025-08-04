'use client';

import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw } from "lucide-react";
import CardapioSemanal from './cardapio-semanal';
import TabelaNutricional from './tabela-nutricional';
import CardapioCliente from './cardapio-cliente';
import ConsolidacaoPedidos from './consolidacao-pedidos';

export default function MenuMainPage() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [refreshKey, setRefreshKey] = useState(0);

  // Forçar atualização quando retornar das configurações
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sistema de Cardápio</h1>
            <p className="text-gray-600 mt-1">Gerencie o cardápio semanal completo</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/configurar-cardapio'}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="weekly">
              Cardápio Semanal
            </TabsTrigger>
            <TabsTrigger value="nutrition">
              Tabela Nutricional
            </TabsTrigger>
            <TabsTrigger value="client">
              Cardápio por Cliente
            </TabsTrigger>
            <TabsTrigger value="consolidacao">
              Consolidação de Pedidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-6">
            <CardapioSemanal key={`weekly-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="nutrition" className="mt-6">
            <TabelaNutricional key={`nutrition-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="client" className="mt-6">
            <CardapioCliente key={`client-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="consolidacao" className="mt-6">
            <ConsolidacaoPedidos key={`consolidacao-${refreshKey}`} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
