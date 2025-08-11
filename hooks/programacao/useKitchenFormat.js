import { useState } from 'react';
import { convertQuantityForKitchen } from '@/lib/cubaConversionUtils';

/**
 * Hook para gerenciar formato de cozinha em todas as abas de programação
 * Mantém estado sincronizado no localStorage e fornece função de formatação
 */
export const useKitchenFormat = (tabName = 'default') => {
  const [kitchenFormat, setKitchenFormat] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${tabName}-kitchen-format`);
      return saved === 'true';
    }
    return false;
  });

  // Função para alternar formato e salvar preferência
  const toggleKitchenFormat = () => {
    const newFormat = !kitchenFormat;
    setKitchenFormat(newFormat);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${tabName}-kitchen-format`, newFormat.toString());
    }
  };

  // Função para formatar quantidade baseada no modo selecionado
  const formatQuantity = (quantity, unitType) => {
    if (kitchenFormat && unitType?.toLowerCase() === 'cuba-g') {
      const convertedQuantity = convertQuantityForKitchen(quantity, unitType);
      return convertedQuantity || `${quantity} ${unitType}`;
    }
    
    // Formato padrão
    if (!unitType) return quantity.toString();
    
    const unit = unitType.toLowerCase();
    
    if (unit.includes('cuba-g')) {
      return `${quantity} ${quantity === 1 ? 'cuba G' : 'cubas G'}`;
    } else if (unit.includes('cuba-p')) {
      return `${quantity} ${quantity === 1 ? 'cuba P' : 'cubas P'}`;
    } else if (unit.includes('pote')) {
      return `${quantity} ${quantity === 1 ? 'pote' : 'potes'}`;
    } else if (unit.includes('pacote')) {
      return `${quantity} ${quantity === 1 ? 'pacote' : 'pacotes'}`;
    } else if (unit.includes('kg')) {
      return `${quantity} kg`;
    } else if (unit.includes('unid')) {
      return `${quantity} ${quantity === 1 ? 'unid.' : 'unid.'}`;
    }
    
    return `${quantity} ${unitType}`;
  };

  // Função para formatar quantidade no estilo de display (com hífen)
  const formatQuantityDisplay = (item) => {
    if (kitchenFormat && item.unit_type?.toLowerCase() === 'cuba-g') {
      const convertedQuantity = convertQuantityForKitchen(item.quantity, item.unit_type);
      return `${convertedQuantity} –`;
    } else {
      // Formato padrão
      const formattedQuantity = formatQuantity(item.quantity, item.unit_type);
      return `${formattedQuantity} –`;
    }
  };

  return {
    kitchenFormat,
    toggleKitchenFormat,
    formatQuantity,
    formatQuantityDisplay
  };
};