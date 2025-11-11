import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/formatUtils";

export default function PriceEditor({ ingredient, onEdit }) {
  return (
    <div className="flex items-center gap-1 group/price font-mono text-xs">
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-500 font-medium">R$</span>
        <span className="font-bold text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 px-2 py-0.5 rounded text-xs border border-green-200">
          {formatCurrency(ingredient.displayPrice || 0).replace('R$ ', '').replace('R$', '')}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 opacity-0 group-hover/price:opacity-100 hover:bg-blue-100 rounded transition-all duration-200 hover:scale-110"
        onClick={() => onEdit(ingredient)}
        title="Atualizar preço"
      >
        <DollarSign className="h-3 w-3 text-blue-600" />
      </Button>
    </div>
  );
}