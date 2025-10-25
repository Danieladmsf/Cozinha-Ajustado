import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar tamanhos de fonte e ordem de páginas
 * Persiste configurações no localStorage
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
    try {
      const saved = localStorage.getItem('print-preview-page-order');
      if (saved) {
        return JSON.parse(saved);
      }
      return [];
    } catch (error) {
      return [];
    }
  }, []);

  // Salvar ordem no localStorage
  const savePageOrder = useCallback((blocks) => {
    try {
      const order = blocks.map(block => block.id);
      localStorage.setItem('print-preview-page-order', JSON.stringify(order));
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
