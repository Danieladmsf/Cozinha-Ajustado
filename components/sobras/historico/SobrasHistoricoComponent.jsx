'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Calendar, AlertTriangle } from 'lucide-react';

export default function SobrasHistoricoComponent() {
  return (
    <div className="space-y-6">
      <Card className="border-amber-200">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
          <CardTitle className="flex items-center gap-3 text-amber-900">
            <History className="h-6 w-6" />
            Histórico de Sobras
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-amber-600">
            <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Histórico em Desenvolvimento</h3>
            <p className="text-sm">
              Esta seção conterá o histórico detalhado de:
            </p>
            <ul className="mt-4 text-left max-w-md mx-auto space-y-2 text-sm">
              <li>• Histórico de registros de sobras</li>
              <li>• Filtros por cliente, período e status</li>
              <li>• Edição de registros anteriores</li>
              <li>• Visualização detalhada por dia</li>
              <li>• Timeline de alterações</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}