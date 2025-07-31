import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function OrderItems({
  items,
  editingItem,
  handleQuantityInputChange,
  handleQuantityBlur,
  handleQuantityFocus,
  handleEnterKey,
  handlePorcionamentoInputChange,
  handlePorcionamentoBlur,
  handlePorcionamentoFocus,
  handlePorcionamentoEnterKey,
  handleUnitTypeChange,
  handleItemNotesChange,
  onFieldBlur, 
  formatWeight,
  calculateTotalWeight,
  formatCurrency,
  formattedQuantity,
  parseQuantity,
  quantityInputRefs,
  portioningInputRefs
}) {

  return (
    <div className="overflow-x-auto p-2 md:p-0">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {/* ITEM PRIMEIRO */}
            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Item
            </th>
            {/* PEDIDO (ANTES QTD. FINAL) */}
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>
              Pedido
            </th>
            {/* PORCIONAMENTO DEPOIS */}
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '120px'}}>
              Porcionar (%)
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Unidade
            </th>
            
            {/* OUTPUTS DEPOIS */}
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Peso Total
            </th>
            <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Sugestão
            </th>
            <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Subtotal
            </th>
            
            {/* INPUT DE OBSERVAÇÕES POR ÚLTIMO */}
            <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{minWidth: '200px'}}>
              Obs. Item
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {(items || []).map((item, index) => {
            const totalWeight = calculateTotalWeight(item);
            const isThisQuantityInputEditing = editingItem?.index === index && editingItem?.field === 'quantity';
            const quantityEditingValue = isThisQuantityInputEditing ? editingItem?.value : '';

            const isThisPortioningInputEditing = editingItem?.index === index && editingItem?.field === 'portioning_percentage';
            const portioningEditingValue = isThisPortioningInputEditing ? editingItem?.value : '';
            
            const displayPortioningValue = isThisPortioningInputEditing 
                ? portioningEditingValue 
                : (item.portioning_percentage !== undefined && item.portioning_percentage !== null ? String(item.portioning_percentage).replace('.', ',') : '0');

            return (
              <tr key={item.recipe_id || index} className={cn("transition-colors duration-150", index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70', 'hover:bg-blue-50/50')}>
                {/* ITEM PRIMEIRO */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-800 block">{item.recipe_name}</span>
                  <span className="text-xs text-slate-500">{item.category}</span>
                </td>
                {/* PEDIDO (ANTES QTD. FINAL) */}
                <td className="px-3 py-3 whitespace-nowrap" style={{ minWidth: '100px' }}>
                  <Input
                    ref={el => quantityInputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    value={isThisQuantityInputEditing ? quantityEditingValue : formattedQuantity(item.quantity)}
                    onFocus={(e) => handleQuantityFocus(e, index, formattedQuantity(item.quantity))}
                    onChange={(e) => handleQuantityInputChange(index, e.target.value)}
                    onBlur={() => handleQuantityBlur(index)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterKey(index);}}}
                    className="w-24 text-sm text-center font-medium border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm"
                  />
                </td>
                {/* PORCIONAMENTO DEPOIS */}
                <td className="px-3 py-3 whitespace-nowrap" style={{ minWidth: '100px' }}>
                  <Input
                    ref={el => portioningInputRefs.current[index] = el}
                    type="text"
                    inputMode="decimal"
                    value={displayPortioningValue}
                    onFocus={(e) => handlePorcionamentoFocus(e, index, item.portioning_percentage)}
                    onChange={(e) => handlePorcionamentoInputChange(index, e.target.value)}
                    onBlur={() => handlePorcionamentoBlur(index)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePorcionamentoEnterKey(index);}}}
                    className="w-24 text-sm text-center border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm"
                    placeholder="%"
                  />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600">
                  <Select
                    value={item.unit_type || "cuba"}
                    onValueChange={(value) => handleUnitTypeChange(index, value)}
                  >
                    <SelectTrigger className="w-[100px] text-xs h-9 border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuba">Cuba</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                
                {/* OUTPUTS DEPOIS */}
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 text-center">
                  {formatWeight(totalWeight)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                  <span className={cn("font-medium", 
                    (item.suggested_quantity !== null && item.suggested_quantity !== undefined && item.suggested_quantity > 0) 
                    ? "text-blue-600" 
                    : "text-slate-400"
                  )}>
                    {(item.suggested_quantity !== null && item.suggested_quantity !== undefined && item.suggested_quantity > 0)
                        ? formattedQuantity(item.suggested_quantity)
                        : '-'}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 text-right font-medium">
                  {formatCurrency(item.total_price)}
                </td>
                
                {/* INPUT DE OBSERVAÇÕES POR ÚLTIMO */}
                <td className="px-3 py-3 whitespace-nowrap" style={{ minWidth: '200px' }}>
                  <Textarea
                    value={item.notes || ''}
                    onChange={(e) => handleItemNotesChange(index, e.target.value)}
                    onBlur={() => {
                        if (onFieldBlur) onFieldBlur();
                    }}
                    placeholder="Obs. do item..."
                    className="w-full text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm min-h-[40px] resize-none"
                    rows={1}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}