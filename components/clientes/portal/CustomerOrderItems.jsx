import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { convertCubaGToKitchenFormat } from "@/lib/cubaConversionUtils";

export default function CustomerOrderItems({
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
  formatWeight,
  calculateTotalWeight,
  formatCurrency,
  formattedQuantity,
  parseQuantity, // ✅ Já recebido como prop
  quantityInputRefs,
  portioningInputRefs,
  showSuggestions = true,
  isCompactMode = false
}) {

  if (isCompactMode) {
    // Organizar itens por categoria
    const itemsByCategory = (items || []).reduce((acc, item, index) => {
      const category = item.category || 'Outros';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ ...item, originalIndex: index });
      return acc;
    }, {});

    // Modo mobile compacto - Cards organizados por categoria
    return (
      <div className="space-y-4">
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
          <div key={category} className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* Header da categoria */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2">
              <h3 className="font-semibold text-white text-sm">{category}</h3>
            </div>
            
            {/* Itens da categoria */}
            <div className="p-3 space-y-3">
              {categoryItems.map((item) => {
                const index = item.originalIndex;
                const totalWeight = calculateTotalWeight(item);
                const isThisQuantityInputEditing = editingItem?.index === index && editingItem?.field === 'quantity';
                const quantityEditingValue = isThisQuantityInputEditing ? editingItem?.value : '';

                const isThisPortioningInputEditing = editingItem?.index === index && editingItem?.field === 'portioning_percentage';
                const portioningEditingValue = isThisPortioningInputEditing ? editingItem?.value : '';
                
                const displayPortioningValue = isThisPortioningInputEditing 
                    ? portioningEditingValue 
                    : (item.portioning_percentage !== undefined && item.portioning_percentage !== null ? String(item.portioning_percentage).replace('.', ',') : '0');

                return (
                  <div key={item.recipe_id} className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                    {/* Header do item */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-800 text-sm mb-1">{item.recipe_name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {totalWeight > 0 && (
                            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                              {formatWeight(totalWeight)}
                            </span>
                          )}
                          {showSuggestions && item.suggested_quantity > 0 && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                              Sugestão: {formattedQuantity(item.suggested_quantity)}
                              {item.unit_type?.toLowerCase() === 'cuba-g' && (
                                <span className="text-xs ml-1 font-semibold">
                                  ({convertCubaGToKitchenFormat(parseQuantity(item.suggested_quantity))})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-blue-600">
                          {formatCurrency(item.total_price)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatCurrency(item.unit_price)}/{item.unit_type}
                        </div>
                      </div>
                    </div>

                    {/* Controles lado a lado em grid mais compacto */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {/* Pedido */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Pedido</label>
                        <Input
                          ref={el => quantityInputRefs?.current && (quantityInputRefs.current[index] = el)}
                          type="text"
                          inputMode="decimal"
                          value={isThisQuantityInputEditing ? quantityEditingValue : formattedQuantity(item.quantity)}
                          onFocus={(e) => handleQuantityFocus(e, index, formattedQuantity(item.quantity))}
                          onChange={(e) => handleQuantityInputChange(index, e.target.value)}
                          onBlur={() => handleQuantityBlur(index)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterKey(index);}}}
                          className="text-xs text-center font-medium h-8"
                        />
                      </div>
                      
                      {/* Porcionar */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">% Ajuste</label>
                        <Input
                          ref={el => portioningInputRefs?.current && (portioningInputRefs.current[index] = el)}
                          type="text"
                          inputMode="decimal"
                          value={displayPortioningValue}
                          onFocus={(e) => handlePorcionamentoFocus(e, index, item.portioning_percentage)}
                          onChange={(e) => handlePorcionamentoInputChange(index, e.target.value)}
                          onBlur={() => handlePorcionamentoBlur(index)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePorcionamentoEnterKey(index);}}}
                          className="text-xs text-center h-8"
                          placeholder="0"
                        />
                      </div>
                      
                      {/* Unidade */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Unidade</label>
                        <Select
                          value={item.unit_type || "cuba"}
                          onValueChange={(value) => handleUnitTypeChange(index, value)}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Un." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cuba">Cuba</SelectItem>
                            <SelectItem value="kg">Kg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantidade final (somente leitura) */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Final</label>
                        <div className="h-8 bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-700">
                            {formattedQuantity(item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                      <Textarea
                        value={item.notes || ''}
                        onChange={(e) => handleItemNotesChange(index, e.target.value)}
                        placeholder="Observações específicas do item..."
                        className="text-xs resize-none h-14"
                        rows={2}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Organizar itens por categoria para desktop também
  const itemsByCategory = (items || []).reduce((acc, item, index) => {
    const category = item.category || 'Outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({ ...item, originalIndex: index });
    return acc;
  }, {});

  // Modo desktop - Tabelas organizadas por categoria
  return (
    <div className="space-y-6">
      {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
        <div key={category} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Header da categoria */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3">
            <h3 className="font-semibold text-white">{category}</h3>
          </div>
          
          {/* Tabela da categoria */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Item
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>
                    Pedido
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap" style={{minWidth: '100px'}}>
                    % Ajuste
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Unidade
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Peso Total
                  </th>
                  {showSuggestions && (
                    <th scope="col" className="px-3 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Sugestão
                    </th>
                  )}
                  <th scope="col" className="px-3 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Subtotal
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider" style={{minWidth: '180px'}}>
                    Obs. Item
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {categoryItems.map((item) => {
                  const index = item.originalIndex;
                  const totalWeight = calculateTotalWeight(item);
                  const isThisQuantityInputEditing = editingItem?.index === index && editingItem?.field === 'quantity';
                  const quantityEditingValue = isThisQuantityInputEditing ? editingItem?.value : '';

                  const isThisPortioningInputEditing = editingItem?.index === index && editingItem?.field === 'portioning_percentage';
                  const portioningEditingValue = isThisPortioningInputEditing ? editingItem?.value : '';
                  
                  const displayPortioningValue = isThisPortioningInputEditing 
                      ? portioningEditingValue 
                      : (item.portioning_percentage !== undefined && item.portioning_percentage !== null ? String(item.portioning_percentage).replace('.', ',') : '0');

                  return (
                    <tr key={item.recipe_id} className="transition-colors duration-150 hover:bg-blue-50/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-800 block">{item.recipe_name}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ minWidth: '80px' }}>
                        <Input
                          ref={el => quantityInputRefs?.current && (quantityInputRefs.current[index] = el)}
                          type="text"
                          inputMode="decimal"
                          value={isThisQuantityInputEditing ? quantityEditingValue : formattedQuantity(item.quantity)}
                          onFocus={(e) => handleQuantityFocus(e, index, formattedQuantity(item.quantity))}
                          onChange={(e) => handleQuantityInputChange(index, e.target.value)}
                          onBlur={() => handleQuantityBlur(index)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleEnterKey(index);}}}
                          className="w-20 text-sm text-center font-medium border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ minWidth: '80px' }}>
                        <Input
                          ref={el => portioningInputRefs?.current && (portioningInputRefs.current[index] = el)}
                          type="text"
                          inputMode="decimal"
                          value={displayPortioningValue}
                          onFocus={(e) => handlePorcionamentoFocus(e, index, item.portioning_percentage)}
                          onChange={(e) => handlePorcionamentoInputChange(index, e.target.value)}
                          onBlur={() => handlePorcionamentoBlur(index)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePorcionamentoEnterKey(index);}}}
                          className="w-20 text-sm text-center border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600">
                        <Select
                          value={item.unit_type || "cuba"}
                          onValueChange={(value) => handleUnitTypeChange(index, value)}
                        >
                          <SelectTrigger className="w-20 text-xs h-9 border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm">
                            <SelectValue placeholder="Un." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cuba">Cuba</SelectItem>
                            <SelectItem value="kg">Kg</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 text-center">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          {formatWeight(totalWeight)}
                        </span>
                      </td>
                      {showSuggestions && (
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                          {(item.suggested_quantity !== null && item.suggested_quantity !== undefined && item.suggested_quantity > 0) ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-bold">
                                {formattedQuantity(item.suggested_quantity)}
                              </span>
                              {item.unit_type?.toLowerCase() === 'cuba-g' && (
                                <span className="text-xs text-green-600 font-semibold">
                                  ({convertCubaGToKitchenFormat(parseQuantity(item.suggested_quantity))})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="bg-slate-100 text-slate-400 px-2 py-1 rounded-full text-xs font-medium">
                              -
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 text-right font-bold">
                        {formatCurrency(item.total_price)}
                      </td>
                      <td className="px-4 py-3" style={{ minWidth: '180px' }}>
                        <Textarea
                          value={item.notes || ''}
                          onChange={(e) => handleItemNotesChange(index, e.target.value)}
                          placeholder="Observações específicas..."
                          className="w-full text-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm min-h-[36px] resize-none"
                          rows={1}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}