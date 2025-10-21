'use client';

import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, ClipboardList, ShoppingCart } from "lucide-react";
import ProgramacaoCozinhaTabs from '@/components/programacao/ProgramacaoCozinhaTabs';
import ListaCompras from './lista-compras';

export default function ProgramacaoPage() {
  const [activeTab, setActiveTab] = useState("programacao-cozinha");
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
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              Programação de Produção
            </h1>
            <p className="text-gray-600 mt-1">Gerencie a programação e produção da cozinha</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="programacao-cozinha">
              Programação Cozinha
            </TabsTrigger>
            <TabsTrigger value="lista-compras">
              Lista de Compras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programacao-cozinha" className="mt-6">
            <ProgramacaoCozinhaTabs refreshKey={refreshKey} />
          </TabsContent>

          <TabsContent value="lista-compras" className="mt-6">
            <ListaCompras key={`lista-compras-${refreshKey}`} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}