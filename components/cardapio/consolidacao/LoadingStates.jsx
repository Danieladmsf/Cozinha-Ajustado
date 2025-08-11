import React from 'react';
import { Loader2, Calendar, Database, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Loading específico para diferentes seções
export const MainLoadingState = () => (
  <div className="flex items-center justify-center min-h-96">
    <div className="text-center">
      <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-500 animate-spin" />
      <p className="text-gray-600">Carregando pedidos...</p>
    </div>
  </div>
);

// Loading granular por tipo de dados
export const DataLoadingIndicators = ({ 
  loadingCustomers, 
  loadingOrders, 
  loadingRecipes 
}) => (
  <div className="flex justify-center gap-4 mb-4">
    {loadingCustomers && (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="w-4 h-4" />
        <span>Clientes...</span>
      </div>
    )}
    {loadingOrders && (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Database className="w-4 h-4" />
        <span>Pedidos...</span>
      </div>
    )}
    {loadingRecipes && (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>Receitas...</span>
      </div>
    )}
  </div>
);

// Estado vazio melhorado
export const EmptyState = () => (
  <Card>
    <CardContent className="p-8 text-center">
      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <h3 className="font-semibold text-lg text-gray-700 mb-2">
        Nenhum Pedido Encontrado
      </h3>
      <p className="text-gray-500 text-sm">
        Não há pedidos para o dia selecionado com os filtros aplicados.
      </p>
      <div className="mt-4 text-xs text-gray-400">
        Tente alterar os filtros ou selecionar outro dia.
      </div>
    </CardContent>
  </Card>
);