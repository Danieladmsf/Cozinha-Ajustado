import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRecipeMetrics } from '@/hooks/ficha-tecnica/useRecipeStore';

export default function RecipeMetricsDashboard() {
  const { raw: metrics, formatted } = useRecipeMetrics();
  
  // Fallback para dados em falta
  const safeMetrics = {
    total_weight: metrics?.total_weight || 0,
    yield_weight: metrics?.yield_weight || 0,
    cost_per_kg_raw: metrics?.cost_per_kg_raw || 0,
    cost_per_kg_yield: metrics?.cost_per_kg_yield || 0,
    cuba_weight: metrics?.cuba_weight || 0,
    cuba_cost: metrics?.cuba_cost || 0,
    total_cost: metrics?.total_cost || 0,
  };

  const formatDisplayValue = (value, type) => {
    const num = parseFloat(value) || 0;
    if (type === 'weight') return num.toFixed(3).replace('.', ',');
    if (type === 'currency') return num.toFixed(2).replace('.', ',');
    return num.toString().replace('.', ',');
  };
  return (
    <Card className="bg-white backdrop-blur-sm bg-opacity-90 border border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-700">
          Informações de Custo e Peso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200">
            <div className="text-sm font-medium text-gray-500 mb-1">Peso Total (Bruto)</div>
            <div className="text-xl font-bold flex items-center text-gray-700">
              <span className="text-gray-400 mr-1">kg</span>
              {formatDisplayValue(safeMetrics.total_weight, 'weight')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200">
            <div className="text-sm font-medium text-blue-600 mb-1">Peso Total (Rendimento)</div>
            <div className="text-xl font-bold flex items-center text-blue-700">
              <span className="text-blue-400 mr-1">kg</span>
              {formatDisplayValue(safeMetrics.yield_weight, 'weight')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 hover:shadow-md transition-all duration-200">
            <div className="text-sm font-medium text-green-600 mb-1">Custo por Kg (Bruto)</div>
            <div className="text-xl font-bold flex items-center text-green-700">
              <span className="text-green-400 mr-1">R$</span>
              {formatDisplayValue(safeMetrics.cost_per_kg_raw, 'currency')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200 hover:shadow-md transition-all duration-200">
            <div className="text-sm font-medium text-indigo-600 mb-1">Custo por Kg (Rendimento)</div>
            <div className="text-xl font-bold flex items-center text-indigo-700">
              <span className="text-indigo-400 mr-1">R$</span>
              {formatDisplayValue(safeMetrics.cost_per_kg_yield, 'currency')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 hover:shadow-md transition-all duration-200">
            <div className="text-sm font-medium text-purple-600 mb-1">Peso da Cuba</div>
            <div className="text-xl font-bold flex items-center text-purple-700">
              <span className="text-purple-400 mr-1">kg</span>
              {formatDisplayValue(safeMetrics.cuba_weight, 'weight')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200 hover:shadow-md transition-all duration-200">
            <div className="text-sm font-medium text-pink-600 mb-1">Custo da Cuba</div>
            <div className="text-xl font-bold flex items-center text-pink-700">
              <span className="text-pink-400 mr-1">R$</span>
              {formatDisplayValue(safeMetrics.cuba_cost,
                'currency'
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}