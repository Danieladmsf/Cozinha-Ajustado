
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { format, getWeek, getYear, startOfWeek, addDays } from "date-fns";
import { AlertCircle, Loader2 } from "lucide-react";
import { debounce } from "lodash";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { prepareWasteItemsForDisplay, calculateWasteTotalsAndDiscount } from "@/components/utils/wasteLogic";
import { parseQuantity as utilParseQuantity, formatCurrency } from "@/components/utils/orderUtils";

// Função utilitária para validar e normalizar números de input
const normalizeNumericInputString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[^0-9,]/g, ''); // Permite apenas números e vírgula
};

const validateNumericOnCommit = (value, defaultValue = 0) => {
  const num = parseFloat(String(value).replace(',', '.'));
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

const formatQuantityForDisplay = (value) => {
  const num = validateNumericOnCommit(value);
  if (num === 0) return '0';
  // Retorna com uma casa decimal se não for inteiro
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace('.', ',');
};

const InternalWasteItemList = ({
  wasteItems,
  editingItem,
  onQuantityInputValueChange, // (index, fieldName, value)
  onCommitValueChange,      // (index, fieldName, valueToCommit)
  onUnitTypeChange,         // (index, fieldName, newUnit)
  onItemNotesChange,        // (index, newNotes)
  onInputFocus,             // (e, index, fieldName, currentValue)
  onInputKeyDown,           // (e, index, fieldName)
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Item</TableHead>
            <TableHead className="text-center w-[90px]">Pedido</TableHead>
            <TableHead className="text-center w-[90px]">Sobra Cozinha</TableHead>
            <TableHead className="w-[100px]">Unid. Cozinha</TableHead>
            <TableHead className="text-center w-[90px]">Sobra Cliente</TableHead>
            <TableHead className="w-[100px]">Unid. Cliente</TableHead>
            <TableHead className="w-[90px] text-center">Pagto (%)</TableHead>
            <TableHead className="w-[100px] text-right">Valor Final (R$)</TableHead>
            <TableHead className="min-w-[140px]">Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wasteItems.map((item, index) => {
            const isEditingInternalWaste = editingItem?.index === index && editingItem?.field === 'internal_waste_quantity';
            const displayInternalWaste = isEditingInternalWaste
              ? editingItem.value
              : formatQuantityForDisplay(item.internal_waste_quantity);

            const isEditingClientReturned = editingItem?.index === index && editingItem?.field === 'client_returned_quantity';
            const displayClientReturned = isEditingClientReturned
              ? editingItem.value
              : formatQuantityForDisplay(item.client_returned_quantity);
            
            const isEditingPaymentPercentage = editingItem?.index === index && editingItem?.field === 'payment_percentage';
            const displayPaymentPercentage = isEditingPaymentPercentage
              ? editingItem.value
              : String(item.payment_percentage);

            return (
              <TableRow key={item.recipe_id || index}>
                <TableCell>
                  <div className="font-medium">{item.recipe_name}</div>
                  <div className="text-xs text-gray-500">{item.category}</div>
                </TableCell>
                <TableCell className="text-center">
                  {formatQuantityForDisplay(item.order_quantity)} {item.order_unit_type === 'kg' ? 'kg' : (item.order_quantity === 1 ? 'cuba' : 'cubas')}
                </TableCell>
                {/* Sobra Cozinha */}
                <TableCell>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={displayInternalWaste}
                    onFocus={(e) => onInputFocus(e, index, 'internal_waste_quantity', item.internal_waste_quantity)}
                    onChange={(e) => onQuantityInputValueChange(index, 'internal_waste_quantity', e.target.value)}
                    onBlur={() => {
                      if (isEditingInternalWaste) {
                        onCommitValueChange(index, 'internal_waste_quantity', validateNumericOnCommit(editingItem.value));
                      }
                    }}
                    onKeyDown={(e) => onInputKeyDown(e, index, 'internal_waste_quantity')}
                    className="w-full text-center text-sm border-amber-300 focus:ring-amber-500 focus:border-amber-500"
                  />
                </TableCell>
                {/* Unidade Cozinha */}
                <TableCell>
                  <Select
                    value={item.internal_waste_unit_type}
                    onValueChange={(value) => onUnitTypeChange(index, 'internal_waste_unit_type', value)}
                  >
                    <SelectTrigger className="text-xs h-9 border-amber-300 focus:ring-amber-500 focus:border-amber-500">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuba">Cuba</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                {/* Sobra Cliente */}
                <TableCell>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={displayClientReturned}
                    onFocus={(e) => onInputFocus(e, index, 'client_returned_quantity', item.client_returned_quantity)}
                    onChange={(e) => onQuantityInputValueChange(index, 'client_returned_quantity', e.target.value)}
                    onBlur={() => {
                      if (isEditingClientReturned) {
                        onCommitValueChange(index, 'client_returned_quantity', validateNumericOnCommit(editingItem.value));
                      }
                    }}
                    onKeyDown={(e) => onInputKeyDown(e, index, 'client_returned_quantity')}
                    className="w-full text-center text-sm border-amber-300 focus:ring-amber-500 focus:border-amber-500"
                  />
                </TableCell>
                {/* Unidade Cliente */}
                <TableCell>
                  <Select
                    value={item.client_returned_unit_type}
                    onValueChange={(value) => onUnitTypeChange(index, 'client_returned_unit_type', value)}
                  >
                    <SelectTrigger className="text-xs h-9 border-amber-300 focus:ring-amber-500 focus:border-amber-500">
                      <SelectValue placeholder="Unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cuba">Cuba</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                {/* Percentual de Pagamento */}
                <TableCell>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={displayPaymentPercentage}
                    onFocus={(e) => onInputFocus(e, index, 'payment_percentage', item.payment_percentage)}
                    onChange={(e) => onQuantityInputValueChange(index, 'payment_percentage', e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={() => {
                      if (isEditingPaymentPercentage) {
                        let val = validateNumericOnCommit(editingItem.value, 100);
                        if (val < 0) val = 0;
                        if (val > 100) val = 100;
                        onCommitValueChange(index, 'payment_percentage', val);
                      }
                    }}
                    onKeyDown={(e) => onInputKeyDown(e, index, 'payment_percentage')}
                    className="w-full text-center text-sm border-amber-300 focus:ring-amber-500 focus:border-amber-500"
                    maxLength={3}
                  />
                </TableCell>
                {/* Valor Final do Item (R$) - Baseado APENAS na sobra do cliente */}
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(item.final_value_this_item || 0)}
                  </span>
                </TableCell>
                {/* Observações */}
                <TableCell>
                  <Input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => onItemNotesChange(index, e.target.value)}
                    placeholder="Notas..."
                    className="text-sm border-amber-300 focus:ring-amber-500 focus:border-amber-500"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default function WasteRegister({
  customer,
  dayIndex,
  currentDate,
  recipes,
  menuData, // Vem de getMenuForDay(currentDay, weeklyMenus)?.menu_data?.[currentDay]
  menu_id,  // Vem de getMenuForDay(currentDay, weeklyMenus)?.id
  existingWaste, // Vem de wasteRecords[selectedCustomer?.id]?.[currentDay]
  onWasteChange,
  orders // orders da semana
}) {
  const { toast } = useToast();
  const [wasteItems, setWasteItems] = useState([]);
  const [generalNotes, setGeneralNotes] = useState(existingWaste?.general_notes || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState({ index: null, field: null, value: '' });
  const [isDirty, setIsDirty] = useState(false);

  const lastSavedStateRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    // Prepara os itens base para exibição, sem o cálculo final ainda.
    // O cálculo final será feito no debouncedSave ou ao popular com existingWaste.
    const basePreparedItems = prepareWasteItemsForDisplay(
      customer,
      dayIndex,
      menuData,
      recipes,
      null, // Passa null para existingWaste aqui, pois o cálculo será feito abaixo
      orders
    );

    let initialItems = [];
    let initialNotes = existingWaste?.general_notes || "";

    if (existingWaste && existingWaste.items) {
        // Se há um registro existente, os valores já foram calculados e salvos.
        // Precisamos reconstruir o estado `wasteItems` para a UI, incluindo `final_value_this_item`.
        const itemsMergedWithExisting = basePreparedItems.map(baseItem => {
            const savedItemData = existingWaste.items.find(ei => ei.recipe_id === baseItem.recipe_id);
            return {
                ...baseItem,
                internal_waste_quantity: savedItemData?.internal_waste_quantity || 0,
                internal_waste_unit_type: savedItemData?.internal_waste_unit_type || baseItem.internal_waste_unit_type,
                client_returned_quantity: savedItemData?.client_returned_quantity || 0,
                client_returned_unit_type: savedItemData?.client_returned_unit_type || baseItem.client_returned_unit_type,
                payment_percentage: savedItemData?.payment_percentage || 100,
                notes: savedItemData?.notes || '',
            };
        });
        const calculatedFromExisting = calculateWasteTotalsAndDiscount(itemsMergedWithExisting);
        initialItems = calculatedFromExisting.items_with_final_value_for_ui;

    } else {
        // Se não há registro existente, calculamos os valores iniciais (provavelmente R$ 0,00 para cada)
        const initialCalculated = calculateWasteTotalsAndDiscount(basePreparedItems);
        initialItems = initialCalculated.items_with_final_value_for_ui;
    }
    
    setWasteItems(initialItems);
    setGeneralNotes(initialNotes);
    lastSavedStateRef.current = { items: initialItems, notes: initialNotes };
    setLoading(false);
    setIsDirty(false);
  }, [customer, dayIndex, menuData, recipes, existingWaste, orders]);

  const debouncedSave = useCallback(debounce(async (currentWasteItemsState, currentGeneralNotesState) => {
    if (!customer) return;
    setSaving(true);

    // Recalcula tudo com os valores atuais da UI antes de salvar
    const calculatedData = calculateWasteTotalsAndDiscount(currentWasteItemsState);
    
    // Atualiza o estado local dos wasteItems para refletir os valores calculados (ex: final_value_this_item)
    // Isso garante que a UI esteja sincronizada com o que será salvo.
    setWasteItems(calculatedData.items_with_final_value_for_ui);

    const currentStateForSave = { items: calculatedData.items_with_final_value_for_ui, notes: currentGeneralNotesState };

    // Compara com o último estado *calculado* salvo para evitar saves desnecessários
    // Filtra campos que são puramente de exibição ou temporários para comparação mais precisa
    const compareItems = (items) => items.map(i => {
      const { recipe_name, category, order_quantity, order_unit_type, cuba_weight_kg, cost_per_kg_yield, ...rest } = i;
      return rest;
    });

    if (existingWaste?.id && 
        JSON.stringify(compareItems(currentStateForSave.items)) === JSON.stringify(compareItems(lastSavedStateRef.current?.items)) && 
        currentStateForSave.notes === lastSavedStateRef.current?.notes
    ) {
        setSaving(false);
        setIsDirty(false);
        return;
    }
    
    const dataToSavePayload = {
      items: calculatedData.items_payload, // Somente o payload para o backend
      notes: currentGeneralNotesState,
      menu_id: menu_id,
      total_internal_waste_weight_kg: calculatedData.total_internal_waste_weight_kg,
      total_client_returned_weight_kg: calculatedData.total_client_returned_weight_kg,
      total_combined_waste_weight_kg: calculatedData.total_combined_waste_weight_kg,
      total_original_value_of_waste: calculatedData.total_original_value_of_waste,
      total_discount_value_applied: calculatedData.total_discount_value_applied,
      final_value_after_discount: calculatedData.final_value_after_discount,
    };

    try {
      await onWasteChange(dataToSavePayload, dayIndex);
      lastSavedStateRef.current = currentStateForSave; // Salva o estado que foi efetivamente usado para o payload
      setIsDirty(false);
    } catch (error) {toast({ variant: "destructive", title: "Erro ao Salvar", description: error.message });
    } finally {
      setSaving(false);
    }
  }, 1500), [customer, dayIndex, menu_id, toast, onWasteChange, existingWaste]);

  const handleItemChange = useCallback((index, field, value) => {
    setWasteItems(prevItems => {
      const updatedItems = prevItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      );
      // Recalcular e atualizar os itens com o valor final para a UI imediatamente
      const recalculatedDisplayItems = calculateWasteTotalsAndDiscount(updatedItems).items_with_final_value_for_ui;
      
      setIsDirty(true);
      debouncedSave(recalculatedDisplayItems, generalNotes); // Passa os itens recalculados para o debounce
      return recalculatedDisplayItems; // Retorna os itens recalculados para o estado
    });
  }, [generalNotes, debouncedSave]);

  // Foco no input
  const handleInputFocus = useCallback((e, index, fieldName, currentValue) => {
    let initialValue = '';
    if (fieldName === 'payment_percentage') {
        initialValue = String(currentValue);
    } else { // Quantidades
        initialValue = (currentValue === 0 || currentValue === '0' || currentValue === '0,0') ? '' : formatQuantityForDisplay(currentValue);
    }
    setEditingItem({ index, field: fieldName, value: initialValue });
    if(e.target.select) e.target.select();
  }, []);

  // Mudança de valor no input (antes do blur/commit)
  const handleQuantityInputValueChange = useCallback((itemIndex, fieldName, inputValue) => {
    let sanitizedValue = '';
    if (fieldName === 'payment_percentage') {
        sanitizedValue = inputValue.replace(/[^0-9]/g, '').substring(0, 3); // Apenas números, max 3 chars
    } else { // Quantidades
        sanitizedValue = normalizeNumericInputString(inputValue);
        if (sanitizedValue.includes(',')) {
            const parts = sanitizedValue.split(',');
            const decimalPart = parts[1] ? parts[1].substring(0, 1) : '';
            sanitizedValue = `${parts[0]},${decimalPart}`;
        }
    }
    setEditingItem({ index: itemIndex, field: fieldName, value: sanitizedValue });
    setIsDirty(true);
  }, []);

  // Commit da mudança de valor (onBlur ou Enter)
  const commitValueChange = useCallback((itemIndex, fieldName, valueToCommit) => {
    if (editingItem.index === itemIndex && editingItem.field === fieldName) {
      let finalValue = valueToCommit;
      if (fieldName === 'payment_percentage') {
        finalValue = Math.max(0, Math.min(100, validateNumericOnCommit(valueToCommit, 100)));
      } else {
        finalValue = validateNumericOnCommit(valueToCommit); // Para quantidades
      }
      
      handleItemChange(itemIndex, fieldName, finalValue);
      setEditingItem({ index: null, field: null, value: '' });
    }
  }, [editingItem, handleItemChange]);
  
  const handleInputKeyDown = useCallback((e, itemIndex, fieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingItem.index === itemIndex && editingItem.field === fieldName) {
        let valueToCommit = editingItem.value;
         if (fieldName === 'payment_percentage') {
          let val = validateNumericOnCommit(valueToCommit, 100);
          valueToCommit = Math.max(0, Math.min(100, val));
        } else {
          valueToCommit = validateNumericOnCommit(valueToCommit);
        }
        commitValueChange(itemIndex, fieldName, valueToCommit);
      }
      if(e.target.blur) e.target.blur();
    }
  }, [editingItem, commitValueChange]);

  const handleUnitTypeChange = useCallback((itemIndex, fieldName, newUnit) => {
    // Agora temos internal_waste_unit_type e client_returned_unit_type
    if (fieldName === 'internal_waste_unit_type' || fieldName === 'client_returned_unit_type') {
      handleItemChange(itemIndex, fieldName, newUnit);
    }
  }, [handleItemChange]);

  const handleItemNotesChange = useCallback((itemIndex, newNotes) => {
    // Não precisa de cálculo imediato de valor, mas dispara o save
    setWasteItems(prevItems => {
      const updatedItems = prevItems.map((item, i) => 
        i === itemIndex ? { ...item, notes: newNotes } : item
      );
      setIsDirty(true);
      debouncedSave(updatedItems, generalNotes);
      return updatedItems;
    });
  }, [generalNotes, debouncedSave]);

  const handleGeneralNotesChange = useCallback((newNotes) => {
    setGeneralNotes(newNotes);
    setIsDirty(true);
    debouncedSave(wasteItems, newNotes); // wasteItems aqui é o estado atual
  }, [wasteItems, debouncedSave]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        <p className="ml-3 text-amber-600">Carregando dados de sobras...</p>
      </div>
    );
  }

  if (!customer) {
    return <div className="p-6 text-center text-slate-500">Selecione um cliente para registrar sobras.</div>;
  }
  
  if (wasteItems.length === 0 && !menuData) {
    return (
       <div className="p-8 text-center bg-white rounded-lg border border-amber-200 shadow-md">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-400" />
          <h3 className="font-semibold text-lg text-amber-700">Nenhum Item de Cardápio</h3>
          <p className="text-sm text-amber-600 mt-2">
            Não foi possível encontrar itens de cardápio para {customer.name} neste dia para registrar sobras.
          </p>
       </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-amber-300 shadow-lg overflow-hidden">
      <div className="p-4 md:p-6 border-b border-amber-200 bg-amber-50 text-amber-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-lg">Registro de Sobras do Dia</h3>
              <p className="text-sm text-amber-700">
                Informe as quantidades de sobra interna (cozinha) e as retornadas pelo cliente.
              </p>
            </div>
          </div>
          <div className="self-start sm:self-center">
            {saving && (
                <div className="text-sm text-amber-600 flex items-center gap-2 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </div>
            )}
            {isDirty && !saving && (
                <div className="text-sm text-blue-600 flex items-center gap-1 font-medium">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                    <span>Alterações pendentes</span>
                </div>
            )}
          </div>
        </div>
      </div>

      <InternalWasteItemList
        wasteItems={wasteItems}
        editingItem={editingItem}
        onQuantityInputValueChange={handleQuantityInputValueChange}
        onCommitValueChange={commitValueChange} 
        onUnitTypeChange={handleUnitTypeChange}
        onItemNotesChange={handleItemNotesChange}
        onInputFocus={handleInputFocus}
        onInputKeyDown={handleInputKeyDown}
      />

      <div className="p-4 md:p-6 border-t border-amber-200 bg-amber-50/50">
        <label htmlFor="generalWasteNotes" className="block text-sm font-medium text-amber-700 mb-1.5">
          Observações Gerais sobre as Sobras
        </label>
        <Textarea
          id="generalWasteNotes"
          value={generalNotes}
          onChange={(e) => handleGeneralNotesChange(e.target.value)}
          placeholder="Ex: Muitos itens de salada não foram consumidos devido ao clima frio..."
          className="min-h-[80px] resize-y border-amber-300 focus:border-amber-500 focus:ring-amber-500 focus:ring-1 rounded-md shadow-sm"
          rows={3}
        />
      </div>
    </div>
  );
}
