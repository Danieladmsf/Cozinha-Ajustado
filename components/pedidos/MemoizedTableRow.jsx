import React, { memo, useCallback } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Debug logging removed for production cleanup

const MemoizedTableRow = ({
  item,
  index,
  isThisInputEditing,
  editingValue,
  inputRef,
  handleQuantityInputChange,
  handleQuantityBlur,
  handleUnitTypeChange,
  handleItemNotesChange,
  handleQuantityFocus,
  handleEnterKey,
  onFieldBlur,
  formatWeight,
  calculateTotalWeight,
  formatCurrency,
  formattedQuantity
}) => {
  // Capturar quando um item recebe foco
  const onQuantityFocus = useCallback((e) => {
    debugLog('onQuantityFocus', {
      index,
      itemName: item.recipe_name,
      currentValue: e.target.value
    });
    handleQuantityFocus(e, index, formattedQuantity(item.quantity));
  }, [index, item.recipe_name, item.quantity, handleQuantityFocus, formattedQuantity]);

  // Capturar quando um item perde foco
  const onQuantityBlur = useCallback(() => {
    debugLog('onQuantityBlur', {
      index,
      itemName: item.recipe_name,
      isThisInputEditing,
      editingValue
    });
    // handleQuantityBlur agora só precisa do index, pois pegará o valor de editingItem
    handleQuantityBlur(index);
  }, [index, item.recipe_name, isThisInputEditing, editingValue, handleQuantityBlur]);

  // Capturar tecla Enter e Tab
  const onQuantityKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      debugLog(`onQuantityKeyDown ${e.key}`, {
        index,
        itemName: item.recipe_name,
        value: e.target.value
      });
      
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevenir submit de formulário
        
        // Acionar o blur programaticamente
        e.target.blur();
        
        // Focar no próximo input
        handleEnterKey(index);
      }
      // Para Tab, deixamos o comportamento padrão do navegador
    }
  }, [index, item.recipe_name, handleEnterKey]);
  
  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell className="font-mono">{item.recipe_name}</TableCell>
      <TableCell className="font-mono">{item.category}</TableCell>
      <TableCell className="font-mono">
        <span className="text-sm text-gray-500">
          {item.suggested_quantity ? item.suggested_quantity.toFixed(1).replace('.', ',') : '0'}
        </span>
      </TableCell>
      <TableCell className="font-mono">
        <Select
          value={item.unit_type}
          onValueChange={(value) => handleUnitTypeChange(index, value)}
        >
          <SelectTrigger className="w-[80px] font-mono">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cuba">Cuba</SelectItem>
            <SelectItem value="kg">Kg</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="font-mono">
        <Input
          data-quantity-input
          ref={inputRef}
          className="w-20 font-mono"
          type="text"
          value={isThisInputEditing ? editingValue : formattedQuantity(item.quantity)}
          onChange={(e) => handleQuantityInputChange(index, e.target.value)}
          onFocus={onQuantityFocus}
          onBlur={onQuantityBlur}
          onKeyDown={onQuantityKeyDown}
        />
      </TableCell>
      <TableCell className="font-mono">
        {formatWeight(calculateTotalWeight(item))}
      </TableCell>
      <TableCell className="font-mono">
        {formatCurrency(item.unit_price || 0)}
      </TableCell>
      <TableCell className="font-mono">
        {formatCurrency(item.total_price || 0)}
      </TableCell>
      <TableCell className="font-mono">
        <Textarea
          className="min-h-[35px] resize-none"
          placeholder="Observações do item"
          value={item.notes || ""}
          onChange={(e) => handleItemNotesChange(index, e.target.value)}
          onBlur={onFieldBlur}
        />
      </TableCell>
    </TableRow>
  );
};

// Otimizar com memo para evitar re-renderizações desnecessárias
export default memo(MemoizedTableRow, (prevProps, nextProps) => {
  // Só re-renderizar se algo relevante mudou
  const relevantPropsEqual = (
    prevProps.item.recipe_id === nextProps.item.recipe_id &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.unit_type === nextProps.item.unit_type &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.suggested_quantity === nextProps.item.suggested_quantity &&
    prevProps.isThisInputEditing === nextProps.isThisInputEditing &&
    (prevProps.isThisInputEditing ? prevProps.editingValue === nextProps.editingValue : true)
  );
  
  return relevantPropsEqual;
});