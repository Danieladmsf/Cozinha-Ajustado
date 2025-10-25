import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar operações de blocos (drag/drop, auto-fit, font size, etc)
 * @param {Array} editableBlocks - Array de blocos editáveis
 * @param {Function} setEditableBlocks - Setter de blocos editáveis
 * @param {Object} previewAreaRef - Ref do container de preview
 * @param {number} zoom - Nível de zoom atual
 * @returns {Object} Handlers e estado
 */
export function useBlockManagement(editableBlocks, setEditableBlocks, previewAreaRef, zoom) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [blockStatus, setBlockStatus] = useState({});

  // Alterar tamanho de fonte
  const handleFontSizeChange = useCallback((blockId, delta) => {
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, fontSize: Math.max(8, Math.min(30, block.fontSize + delta)) }
          : block
      )
    );
  }, [setEditableBlocks]);

  // Iniciar auto-fit
  const handleAutoFit = useCallback((blockId) => {
    // Marcar bloco para auto-fit
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, autoFitting: true, autoFitTimestamp: Date.now() }
          : block
      )
    );
  }, [setEditableBlocks]);

  // Auto-fit concluído
  const handleAutoFitComplete = useCallback((blockId) => {
    // Limpar flag de auto-fitting
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, autoFitting: false }
          : block
      )
    );
  }, [setEditableBlocks]);

  // Atualizar status de overflow
  const handleStatusUpdate = useCallback((blockId, isOverflowing, numPages) => {
    setBlockStatus(prev => ({
      ...prev,
      [blockId]: { isOverflowing, numPages }
    }));
  }, []);

  // Scroll até bloco
  const scrollToBlock = useCallback((blockId) => {
    const element = document.getElementById(`block-${blockId}`);
    if (element && previewAreaRef.current) {
      const container = previewAreaRef.current;

      // Obter posição do elemento no wrapper escalado
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calcular posição relativa considerando o scroll atual
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop;

      // Compensar pelo scale/zoom
      const scaledOffset = 50 / (zoom / 100); // Offset ajustado pelo zoom

      container.scrollTo({
        top: relativeTop - scaledOffset,
        behavior: 'smooth'
      });

      setSelectedBlock(blockId);
    }
  }, [previewAreaRef, zoom]);

  // Corrigir bloco com overflow
  const handleFixBlock = useCallback((blockId, e) => {
    e.stopPropagation(); // Evitar que o click no badge também acione o click do item

    // Primeiro seleciona o bloco (necessário para o auto-fit funcionar)
    setSelectedBlock(blockId);

    // Navega para o bloco
    scrollToBlock(blockId);

    // Executa o auto-fit após dar tempo para o elemento renderizar e estar pronto
    setTimeout(() => {
      handleAutoFit(blockId);
    }, 600);
  }, [scrollToBlock, handleAutoFit]);

  // Resetar todos os tamanhos
  const handleResetFontSizes = useCallback(() => {
    if (confirm('Deseja resetar todos os tamanhos de fonte e ordem das páginas para os valores padrão?')) {
      localStorage.removeItem('print-preview-font-sizes');
      localStorage.removeItem('print-preview-page-order');
      // Recarregar página para aplicar os padrões
      window.location.reload();
    }
  }, []);

  // Drag and Drop handlers
  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Reordenar blocos
    const newBlocks = [...editableBlocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(dropIndex, 0, draggedBlock);

    setEditableBlocks(newBlocks);
    setDraggedIndex(null);
  }, [draggedIndex, editableBlocks, setEditableBlocks]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // Editar conteúdo do bloco
  const handleContentEdit = useCallback((blockId, field, value) => {
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, [field]: value }
          : block
      )
    );
  }, [setEditableBlocks]);

  return {
    // Estado
    draggedIndex,
    selectedBlock,
    setSelectedBlock,
    blockStatus,

    // Handlers
    handleFontSizeChange,
    handleAutoFit,
    handleAutoFitComplete,
    handleStatusUpdate,
    scrollToBlock,
    handleFixBlock,
    handleResetFontSizes,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleContentEdit
  };
}
