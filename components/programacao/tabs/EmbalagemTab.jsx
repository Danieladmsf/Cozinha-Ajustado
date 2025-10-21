'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package2, ChefHat } from "lucide-react";

const EmbalagemTab = ({ 
  globalKitchenFormat,
  toggleGlobalKitchenFormat
}) => {

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-sky-50">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Package2 className="w-6 h-6" />
              Seção Embalagem
            </CardTitle>
            
            <Button
              variant={globalKitchenFormat ? "default" : "outline"}
              size="sm"
              onClick={toggleGlobalKitchenFormat}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ChefHat className="w-4 h-4" />
              {globalKitchenFormat ? "Formato Padrão" : "Formato Cozinha"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Conteúdo placeholder */}
      <div className="flex items-center justify-center min-h-96">
        <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 to-sky-100">
          <CardContent className="p-12 text-center">
            <Package2 className="w-16 h-16 mx-auto mb-4 text-blue-400" />
            <h3 className="font-semibold text-xl text-blue-700 mb-2">
              Aguardando Implementação
            </h3>
            <p className="text-blue-600 text-lg mb-2">
              Sistema de conversão de cubas: {globalKitchenFormat ? "Ativado" : "Desativado"}
            </p>
            <p className="text-blue-500 text-sm">
              Estrutura específica para embalagem será implementada aqui
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmbalagemTab;