import { useState, useCallback } from 'react';
import {
  saveBlockOrder,
  loadBlockOrderFromLocal
} from '../utils/simpleEditManager';

/**
 * Hook para gerenciar tamanhos de fonte e ordem de páginas
 * Persiste configurações no localStorage + Firebase (sync)
 */
export function useFontSizeManager() {
  const [hasSavedSizes, setHasSavedSizes] = useState(false);

  // Carregar tamanhos salvos do localStorage
  const loadSavedFontSizes = useCallback(() => {
    try {
      const saved = localStorage.getItem('print-preview-font-sizes');
      if (saved) {
        setHasSavedSizes(true);
        return JSON.parse(saved);
      }
      return {};
    } catch (error) {
      return {};
    }
  }, []);

  // Carregar ordem salva do localStorage
  const loadSavedOrder = useCallback(() => {
    return loadBlockOrderFromLocal();
  }, []);

  // Salvar ordem no localStorage + Firebase
  const savePageOrder = useCallback((blocks, weekDayKey = null) => {
    try {
      const order = blocks.map(block => block.id);

      // Salvar com sincronização Firebase
      saveBlockOrder(order, weekDayKey);

      // Salvar também a ordem dos nomes dos clientes (para uso nas abas)
      const customerOrder = blocks
        .filter(block => block.type === 'empresa')
        .map(block => block.title);
      localStorage.setItem('print-preview-customer-order', JSON.stringify(customerOrder));
    } catch (error) {
      // Silenciar erro
    }
  }, []);

  // Salvar tamanhos no localStorage
  const saveFontSizes = useCallback((blocks) => {
    try {
      const fontSizes = {};
      blocks.forEach(block => {
        // Criar chave única baseada no tipo e título
        const key = `${block.type}:${block.title}`;
        fontSizes[key] = block.fontSize;
      });
      localStorage.setItem('print-preview-font-sizes', JSON.stringify(fontSizes));
    } catch (error) {
      // Silenciar erro
    }
  }, []);

  // Limpar tamanhos salvos
  const clearSavedFontSizes = useCallback(() => {
    try {
      localStorage.removeItem('print-preview-font-sizes');
      setHasSavedSizes(false);
    } catch (error) {
      // Silenciar erro
    }
  }, []);

  // Limpar ordem salva
  const clearSavedOrder = useCallback(() => {
    try {
      localStorage.removeItem('print-preview-page-order');
    } catch (error) {
      // Silenciar erro
    }
  }, []);

  return {
    // Estado
    hasSavedSizes,
    setHasSavedSizes,

    // Funções
    loadSavedFontSizes,
    loadSavedOrder,
    savePageOrder,
    saveFontSizes,
    clearSavedFontSizes,
    clearSavedOrder
  };
}
