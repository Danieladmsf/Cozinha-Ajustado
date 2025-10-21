import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MetricDisplay = ({ label, value, unit, gradient }) => (
  <div className={`bg-gradient-to-br ${gradient} p-4 rounded-lg border hover:shadow-md transition-all duration-200`}>
    <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
    <div className="text-xl font-bold flex items-center text-gray-700">
      <span className="text-gray-400 mr-1">{unit}</span>
      {value}
    </div>
  </div>
);

const RecipeMetrics = ({ recipe, formattedMetrics }) => {
  const metrics = [
    { label: 'Peso Total (Bruto)', value: formattedMetrics.totalWeight, unit: 'kg', gradient: 'from-gray-50 to-gray-100' },
    { label: 'Peso Total (Rendimento)', value: formattedMetrics.yieldWeight, unit: 'kg', gradient: 'from-blue-50 to-blue-100' },
    { label: 'Custo por Kg (Bruto)', value: formattedMetrics.costPerKgRaw, unit: 'R$', gradient: 'from-green-50 to-green-100' },
    { label: 'Custo por Kg (Rendimento)', value: formattedMetrics.costPerKgYield, unit: 'R$', gradient: 'from-indigo-50 to-indigo-100' },
    { label: recipe.weight_field_name || 'Peso da Cuba', value: formattedMetrics.cubaWeight, unit: 'kg', gradient: 'from-purple-50 to-purple-100' },
    { label: recipe.cost_field_name || 'Custo da Cuba', value: formattedMetrics.cubaCost, unit: 'R$', gradient: 'from-pink-50 to-pink-100' },
  ];

  return (
    <Card className="bg-white backdrop-blur-sm bg-opacity-90 border border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-700">
          Informações de Custo e Peso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {metrics.map(metric => (
            <MetricDisplay key={metric.label} {...metric} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(RecipeMetrics);
