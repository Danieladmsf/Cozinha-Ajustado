
import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function OrderSummary({
  order,
  generalNotes,
  setGeneralNotes,
  onMealsExpectedChange,
  isReadOnly = false,
  hideMealsExpected = false
}) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-4">
        {!hideMealsExpected && (
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="meals-expected">Número de Refeições Esperadas</Label>
            <Input
              id="meals-expected"
              type="text" 
              inputMode="numeric"
              value={order.total_meals_expected || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                if (onMealsExpectedChange) onMealsExpectedChange(value);
              }}
              className="mt-1"
              disabled={isReadOnly}
            />
          </div>
        )}
        
        <div className="flex-1 min-w-[200px]">
          <Label>Total de Itens</Label>
          <div className="text-lg font-medium mt-1">
            {order.total_items?.toFixed(1) || '0'} unidades
          </div>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <Label>Valor Total</Label>
          <div className="text-lg font-medium mt-1">
            {formatCurrency(order.total_amount)}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="general-notes">Observações Gerais</Label>
        <Textarea
          id="general-notes"
          value={generalNotes || ''}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Adicione observações gerais sobre o pedido..."
          className="mt-1"
          disabled={isReadOnly}
        />
      </div>
    </div>
  );
}
