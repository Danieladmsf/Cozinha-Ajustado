import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { createItemKey } from '../utils/itemKeyUtils';
import { formatRecipeName } from '../utils/formatUtils';
import { EmpresaBlockContent } from './EditableBlock/EmpresaBlockContent';
import { DetailedSectionBlock } from './EditableBlock/DetailedSectionBlock';
import { EmbalagemBlock } from './EditableBlock/EmbalagemBlock';

// Constantes de tamanho A4 (baseadas em dimensões físicas reais)
const A4_WIDTH_PX = 794;   // 210mm = 794px
const A4_HEIGHT_PX = 1123;  // 297mm = 1123px
const PAGE_PADDING_PX = 10; // Padding definido em .a4-page (print-preview.css)

/**
 * Componente de bloco editável para o editor de programação
 * Permite edição inline, ajuste de fonte, auto-fit e detecção de overflow
 */
export function EditableBlock({
  block,
  isSelected,
  onSelect,
  onFontSizeChange,
  onAutoFit,
  onAutoFitComplete,
  onContentEdit,
  onItemEdit,
  onStatusUpdate,
  formatQuantityDisplay,
  isItemEdited,
  getItemEditInfo,
  isItemChanged,
  getItemChangeInfo,
  acceptPortalChange,
  rejectPortalChange,
  getResolutionStatus,
  isLocked
}) {
  const blockRef = useRef(null);
  const contentRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [isAutoFitting, setIsAutoFitting] = useState(false);

  // Armazenar valores originais para detectar mudanças
  const originalValuesRef = useRef({});

  // Handler para capturar valor antes de editar
  const handleEditStart = (e, itemName, clientName, blockTitle = null) => {
    const itemKey = createItemKey(itemName, clientName, blockTitle);
    originalValuesRef.current[itemKey] = e.target.textContent;
  };

  // Handler para detectar mudanças após editar
  const handleEditEnd = (e, itemName, clientName, field, blockTitle = null) => {
    const itemKey = createItemKey(itemName, clientName, blockTitle);
    const originalValue = originalValuesRef.current[itemKey];
    const newValue = e.target.textContent;

    if (originalValue !== newValue && onItemEdit) {
      onItemEdit(itemName, clientName, originalValue, newValue, field, blockTitle);
    }
  };

  // Função para medir altura com um fontSize específico
  const measureHeight = (fontSize) => {
    if (!contentRef.current) return 0;
    const originalFontSize = contentRef.current.style.fontSize;
    contentRef.current.style.fontSize = `${fontSize}px`;
    const height = contentRef.current.scrollHeight;
    contentRef.current.style.fontSize = originalFontSize;
    return height;
  };

  // Auto-fit: encontrar maior fonte que cabe em 1 página
  useEffect(() => {
    if (block.autoFitting) {
      setIsAutoFitting(true);

      // Cálculo automático baseado em dimensões reais de A4
      const A4_USABLE_HEIGHT = A4_HEIGHT_PX - (PAGE_PADDING_PX * 2); // 1103px
      let bestSize = 8;

      // Busca binária para encontrar o tamanho ideal
      let min = 8;
      let max = 30;

      const findBestSize = () => {
        // Verificar se contentRef está disponível antes de começar
        if (!contentRef.current) {
          setTimeout(findBestSize, 200);
          return;
        }

        while (min <= max) {
          const mid = Math.floor((min + max) / 2);
          const height = measureHeight(mid);

          if (height <= A4_USABLE_HEIGHT) {
            bestSize = mid;
            min = mid + 1;
          } else {
            max = mid - 1;
          }
        }

        // Aplicar o melhor tamanho encontrado
        onFontSizeChange(bestSize - block.fontSize);
        setIsAutoFitting(false);
        onAutoFitComplete();
      };

      setTimeout(findBestSize, 300);
    }
  }, [block.autoFitTimestamp]);

  // Detectar overflow
  useEffect(() => {
    if (isAutoFitting) return; // Não recalcular durante auto-fit

    // Forçar recálculo limpo
    setIsOverflowing(false);
    setNumPages(1);

    // Delay para garantir renderização completa após mudança de fonte
    const timer = setTimeout(() => {
      if (contentRef.current) {
        // Cálculo automático baseado em dimensões reais de A4
        const A4_USABLE_HEIGHT = A4_HEIGHT_PX - (PAGE_PADDING_PX * 2); // 1103px

        const contentHeight = contentRef.current.scrollHeight;
        const overflow = contentHeight > A4_USABLE_HEIGHT;
        const pages = Math.ceil(contentHeight / A4_USABLE_HEIGHT);

        setIsOverflowing(overflow);
        setNumPages(pages);

        // Notificar parent component sobre mudança de status
        onStatusUpdate(block.id, overflow, pages);
      }
    }, 250); // Aumentado de 150ms para 250ms para melhor precisão

    return () => clearTimeout(timer);
  }, [block.fontSize, block.id, isAutoFitting]);

  return (
    <div
      id={`block-${block.id}`}
      ref={blockRef}
      className={`editable-block ${isSelected ? 'selected' : ''} ${isOverflowing ? 'overflowing' : ''}`}
      onClick={onSelect}
      style={{ fontSize: `${block.fontSize}px` }}
    >
      {/* Status Badge */}
      <div className="block-status">
        {isOverflowing && (
          <span className="overflow-badge">⚠️ {numPages} páginas</span>
        )}
        <span className="font-badge">{block.fontSize}px</span>
      </div>

      {/* Resize Handle */}
      {isSelected && (
        <div className="resize-controls">
          <Button size="sm" variant="ghost" onClick={() => onFontSizeChange(-1)} title="Diminuir fonte" disabled={isAutoFitting}>
            <span className="text-lg font-bold">A-</span>
          </Button>
          <span className="px-2 text-sm font-semibold text-gray-600">{block.fontSize}px</span>
          <Button size="sm" variant="ghost" onClick={() => onFontSizeChange(1)} title="Aumentar fonte" disabled={isAutoFitting}>
            <span className="text-lg font-bold">A+</span>
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={onAutoFit}
            title="Auto-ajustar: encontra o maior tamanho que cabe em 1 página"
            disabled={isAutoFitting}
            className="ml-2 bg-green-600 hover:bg-green-700 text-white"
          >
            {isAutoFitting ? '...' : 'Auto'}
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="block-content a4-page">
        {/* Wrapper interno para medir altura real do conteúdo */}
        <div ref={contentRef}>
          <h1
            contentEditable={isSelected && !isLocked}
            suppressContentEditableWarning
            onBlur={(e) => onContentEdit('title', e.target.textContent)}
            className="block-title"
            style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
          >
            {formatRecipeName(block.title)}
          </h1>

          <div
            contentEditable={isSelected && !isLocked}
            suppressContentEditableWarning
            onBlur={(e) => onContentEdit('subtitle', e.target.textContent)}
            className="block-subtitle"
            style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
          >
            {block.subtitle}
          </div>

        {block.type === 'empresa' && (
          <EmpresaBlockContent
            block={block}
            isSelected={isSelected}
            isLocked={isLocked}
            handleEditStart={handleEditStart}
            handleEditEnd={handleEditEnd}
            formatQuantityDisplay={formatQuantityDisplay}
            isItemEdited={isItemEdited}
            getItemEditInfo={getItemEditInfo}
            isItemChanged={isItemChanged}
            getItemChangeInfo={getItemChangeInfo}
            acceptPortalChange={acceptPortalChange}
            rejectPortalChange={rejectPortalChange}
            getResolutionStatus={getResolutionStatus}
          />
        )}

        {block.type === 'detailed-section' && (
          <DetailedSectionBlock
            block={block}
            isSelected={isSelected}
            isLocked={isLocked}
            handleEditStart={handleEditStart}
            handleEditEnd={handleEditEnd}
            formatQuantityDisplay={formatQuantityDisplay}
            isItemEdited={isItemEdited}
            getItemEditInfo={getItemEditInfo}
            isItemChanged={isItemChanged}
            getItemChangeInfo={getItemChangeInfo}
            acceptPortalChange={acceptPortalChange}
            rejectPortalChange={rejectPortalChange}
            getResolutionStatus={getResolutionStatus}
          />
        )}

        {block.type === 'embalagem-category' && (
          <EmbalagemBlock
            block={block}
            isSelected={isSelected}
            isLocked={isLocked}
            handleEditStart={handleEditStart}
            handleEditEnd={handleEditEnd}
            formatQuantityDisplay={formatQuantityDisplay}
            isItemEdited={isItemEdited}
            getItemEditInfo={getItemEditInfo}
            isItemChanged={isItemChanged}
            getItemChangeInfo={getItemChangeInfo}
            acceptPortalChange={acceptPortalChange}
            rejectPortalChange={rejectPortalChange}
            getResolutionStatus={getResolutionStatus}
          />
        )}
        </div> {/* Fecha wrapper de medição de conteúdo */}
      </div>

      {/* Page Overflow Indicator */}
      {isOverflowing && (
        <div className="overflow-indicator">
          Conteúdo continua na próxima página...
        </div>
      )}
    </div>
  );
}
