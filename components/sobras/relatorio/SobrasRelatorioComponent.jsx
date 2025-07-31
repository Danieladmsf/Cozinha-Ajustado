'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingDown, AlertTriangle } from 'lucide-react';

export default function SobrasRelatorioComponent() {
  return (
    <div className="space-y-6">
      <Card className="border-amber-200">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
          <CardTitle className="flex items-center gap-3 text-amber-900">
            <BarChart3 className="h-6 w-6" />
            Relatórios de Sobras
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-amber-600">
            <TrendingDown className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Relatórios em Desenvolvimento</h3>
            <p className="text-sm">
              Esta seção conterá relatórios detalhados sobre:
            </p>
            <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-sm">
              <li>• Análise de sobras por período</li>
              <li>• Comparativo de desperdício por cliente</li>
              <li>• Gráficos de tendências</li>
              <li>• Relatórios financeiros de sobras</li>
              <li>• Exportação para PDF/Excel</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}