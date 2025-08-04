'use client';

import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import SobrasRegistro from './sobras-registro';
import SobrasRelatorio from './sobras-relatorio';
import SobrasHistorico from './sobras-historico';

export default function SobrasMainPage() {
  const [activeTab, setActiveTab] = useState("registro");
  const [refreshKey, setRefreshKey] = useState(0);

  // Forçar atualização quando retornar de outras páginas
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              Gestão de Sobras
            </h1>
            <p className="text-amber-700 mt-1">Registre e analise as sobras dos seus clientes</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-white border border-amber-200">
            <TabsTrigger 
              value="registro" 
              className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
            >
              Registro de Sobras
            </TabsTrigger>
            <TabsTrigger 
              value="relatorio"
              className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
            >
              Relatórios
            </TabsTrigger>
            <TabsTrigger 
              value="historico"
              className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900"
            >
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registro" className="mt-6">
            <SobrasRegistro key={`registro-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="relatorio" className="mt-6">
            <SobrasRelatorio key={`relatorio-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <SobrasHistorico key={`historico-${refreshKey}`} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
