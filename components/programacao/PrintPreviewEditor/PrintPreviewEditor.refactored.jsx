'use client';

/**
 * PrintPreviewEditor - VERSÃO REFATORADA
 *
 * Mudanças principais:
 * 1. Usa useReducer para centralizar todas as modificações de blocos
 * 2. Remove múltiplos useEffect competindo
 * 3. Usa useCallback para estabilizar funções
 * 4. Sistema de sincronização mais previsível
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Save, Edit3, Maximize2, RefreshCw, GripVertical, Download, Users, Lock, AlertTriangle, Cloud, CheckCircle } from "lucide-react";
import { useImpressaoProgramacao } from '@/hooks/programacao/useImpressaoProgramacao';
import { formatRecipeName } from './utils/formatUtils';
import { createItemKey } from './utils/itemKeyUtils';
import { useConflictResolution } from './hooks/useConflictResolution';
import { useFontSizeManager } from './hooks/useFontSizeManager';
import { useBlockManagement } from './hooks/useBlockManagement';
import { EditableBlock } from './components/EditableBlock';
import { generateAndDownloadPDF } from './services/pdfGenerator';
import './print-preview.css';

// Importar sistema de gerenciamento de estado
import {
  ensureCategoryOrderInBlocks,
  reorganizeBlockItems,
  createEditKey,
  createEditRecord,
  saveEditStateToLocal,
  loadEditStateFromLocal,
  getEditStateSummary,
  processBlockItemsWithStates,
  getItemDisplayInfo
} from './utils';

export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo, formatQuantityDisplay, consolidateCustomerItems, recipes, originalOrders } = data;

  // Simplificar: usar useState ao invés de useReducer
  const [editableBlocks, setEditableBlocks] = useState([]);
  const [zoom, setZoom] = useState(50);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const previewAreaRef = useRef(null);

  // Estados para gerenciamento de edições e conflitos
  const [editState, setEditState] = useState({});
  const [portalUpdates, setPortalUpdates] = useState({});
  const [resolvedConflicts, setResolvedConflicts] = useState({});
  const [isLoadingState, setIsLoadingState] = useState(false);

  // Refs para controle de inicialização
  const hasInitializedRef = useRef(false);
  const canSaveToLocalStorageRef = useRef(false);

  // Hook de gerenciamento de fontes e ordem
  const {
    hasSavedSizes,
    setHasSavedSizes,
    loadSavedFontSizes,
    loadSavedOrder,
    savePageOrder,
    saveFontSizes
  } = useFontSizeManager();

  // Hook de gerenciamento de blocos
  const {
    draggedIndex,
    selectedBlock,
    setSelectedBlock,
    blockStatus,
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
  } = useBlockManagement(editableBlocks, setEditableBlocks, previewAreaRef, zoom);

  // Extrair informações de semana/ano/dia
  const weekNumber = selectedDayInfo?.weekNumber || 0;
  const year = selectedDayInfo?.year || new Date().getFullYear();
  const dayNumber = selectedDayInfo?.dayNumber || 0;

  // Carregar estado salvo ao montar o componente
  useEffect(() => {
    // Desabilitar salvamento durante carregamento
    canSaveToLocalStorageRef.current = false;
    setIsLoadingState(true);

    const weekKey = `programacao-edits-${weekNumber}-${year}`;
    const savedState = loadEditStateFromLocal(weekKey);

    console.log('[PrintPreviewEditor] Carregando estado salvo:', {
      weekKey,
      savedState
    });

    if (savedState && typeof savedState === 'object') {
      if (savedState.edits) {
        console.log('[PrintPreviewEditor] Restaurando edições:', Object.keys(savedState.edits).length);
        setEditState(savedState.edits);
      }
      if (savedState.portalUpdates) setPortalUpdates(savedState.portalUpdates);
      if (savedState.resolved) setResolvedConflicts(savedState.resolved);
    } else {
      // Limpar estados se não há nada salvo
      setEditState({});
      setPortalUpdates({});
      setResolvedConflicts({});
    }

    // Marcar que terminou de carregar e HABILITAR salvamento após delay maior
    setTimeout(() => {
      setIsLoadingState(false);
      console.log('[PrintPreviewEditor] Estado carregado');
    }, 100);

    // Habilitar salvamento somente após tudo estar pronto (delay maior)
    setTimeout(() => {
      canSaveToLocalStorageRef.current = true;
      console.log('[PrintPreviewEditor] Salvamento habilitado');
    }, 500);
  }, [weekNumber, year]);

  // Salvar estado quando mudar
  useEffect(() => {
    // NÃO salvar se está carregando estado inicial
    if (isLoadingState) {
      console.log('[PrintPreviewEditor] Salvamento bloqueado (carregando estado inicial)');
      return;
    }

    // NÃO salvar se ainda não foi habilitado (durante inicialização)
    if (!canSaveToLocalStorageRef.current) {
      console.log('[PrintPreviewEditor] Salvamento bloqueado (ainda não habilitado)');
      return;
    }

    const weekKey = `programacao-edits-${weekNumber}-${year}`;

    const stateToSave = {
      edits: editState,
      portalUpdates,
      resolved: resolvedConflicts
    };

    console.log('[PrintPreviewEditor] Salvando estado:', {
      weekKey,
      numEdits: Object.keys(editState).length,
      numPortalUpdates: Object.keys(portalUpdates).length,
      numResolved: Object.keys(resolvedConflicts).length
    });

    saveEditStateToLocal(weekKey, stateToSave);
  }, [editState, portalUpdates, resolvedConflicts, weekNumber, year, isLoadingState]);

  // Desabilitar Firebase temporariamente para corrigir loop infinito
  // TODO: Reabilitar quando o hook useImpressaoProgramacao for corrigido
  const editedItems = {};
  const markItemAsEdited = () => {};
  const isItemEdited = () => false;
  const getItemEditInfo = () => null;
  const editingUsers = [];
  const isLocked = false;
  const isSyncing = false;
  const lastSyncTime = null;
  const sessionId = null;

  // const {
  //   blocks: firebaseBlocks,
  //   updateBlocks: updateFirebaseBlocks,
  //   editedItems,
  //   markItemAsEdited,
  //   isItemEdited,
  //   getItemEditInfo,
  //   acceptPortalChange,
  //   rejectPortalChange,
  //   editingUsers,
  //   isLocked,
  //   isSyncing,
  //   lastSyncTime,
  //   sessionId
  // } = useImpressaoProgramacao(weekNumber, year, dayNumber, data);

  // Desabilitar resolução de conflitos antiga temporariamente
  const changedItems = {};
  // resolvedConflicts agora está sendo usado pelo novo sistema (linha 52)
  const hasChanges = false;
  const isItemChanged = () => false;
  const getItemChangeInfo = () => null;
  const getResolutionStatus = () => null;
  const handleAcceptPortalChange = () => {};
  const handleRejectPortalChange = () => {};
  const handleResetSnapshot = () => {};

  // const {
  //   changedItems,
  //   resolvedConflicts,
  //   initialSnapshot,
  //   hasChanges,
  //   isItemChanged,
  //   getItemChangeInfo,
  //   getResolutionStatus,
  //   handleAcceptPortalChange,
  //   handleRejectPortalChange,
  //   handleResetSnapshot
  // } = useConflictResolution(
  //   originalOrders,
  //   weekNumber,
  //   year,
  //   dayNumber,
  //   markItemAsEdited,
  //   rejectPortalChange
  // );

  // Função estável para aplicar edições (usando useCallback)
  const applyEditsToBlocks = useCallback((blocks, editedItemsMap) => {
    // Garantir que blocks é sempre um array
    if (!Array.isArray(blocks)) {
      console.error('applyEditsToBlocks: blocks is not an array');
      return [];
    }

    if (!editedItemsMap || Object.keys(editedItemsMap).length === 0) {
      return blocks;
    }

    return blocks.map(block => {
      const updatedBlock = { ...block };

      if (updatedBlock.type === 'empresa' && updatedBlock.items) {
        const newItems = {};
        Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
          newItems[category] = categoryItems.map(item => {
            const normalizedCustomerName = item.customer_name || 'sem_cliente';
            // Usar createEditKey (novo formato com ::)
            const itemKey = createEditKey(item.recipe_name, normalizedCustomerName, updatedBlock.title);
            const editInfo = editedItemsMap[itemKey];

            if (editInfo && editInfo.field === 'quantity') {
              const numMatch = editInfo.editedValue.match(/[\d.,]+/);
              if (numMatch) {
                return { ...item, quantity: parseFloat(numMatch[0].replace(',', '.')) };
              }
            } else if (editInfo && editInfo.field === 'name') {
              return { ...item, recipe_name: editInfo.editedValue };
            }
            return item;
          });
        });
        updatedBlock.items = newItems;
      }

      if ((updatedBlock.type === 'detailed-section' || updatedBlock.type === 'embalagem-category') && updatedBlock.items) {
        updatedBlock.items = updatedBlock.items.map(recipe => {
          const newClientes = recipe.clientes.map(cliente => {
            // Usar createEditKey (novo formato com ::)
            const itemKey = createEditKey(recipe.recipe_name, cliente.customer_name);
            const editInfo = editedItemsMap[itemKey];

            if (editInfo && editInfo.field === 'quantity') {
              const numMatch = editInfo.editedValue.match(/[\d.,]+/);
              if (numMatch) {
                return { ...cliente, quantity: parseFloat(numMatch[0].replace(',', '.')) };
              }
            } else if (editInfo && editInfo.field === 'customer') {
              return { ...cliente, customer_name: editInfo.editedValue };
            }
            return cliente;
          });

          if (recipe.showTotal) {
            const newTotal = newClientes.reduce((sum, c) => sum + (c.quantity || 0), 0);
            return { ...recipe, clientes: newClientes, total: Math.round(newTotal * 100) / 100 };
          }

          return { ...recipe, clientes: newClientes };
        });
      }

      return updatedBlock;
    });
  }, []);

  // Inicializar blocos APENAS UMA VEZ com useMemo
  const initialBlocks = useMemo(() => {
    if (!porEmpresaData && !saladaData && !acougueData && !embalagemData) return [];

    console.log('[PrintPreviewEditor] Inicializando blocos...');

    const blocks = [];
    const savedFontSizes = loadSavedFontSizes();

    // Criar blocos (código simplificado - você mantém a lógica original)
    if (porEmpresaData && porEmpresaData.length > 0) {
      porEmpresaData.forEach((customerData, index) => {
        const consolidatedItems = consolidateCustomerItems(customerData.orders);
        const totalItems = Object.values(consolidatedItems).reduce((sum, items) => sum + items.length, 0);
        let initialFontSize = 16;
        if (totalItems <= 10) initialFontSize = 18;
        if (totalItems <= 8) initialFontSize = 20;
        if (totalItems <= 6) initialFontSize = 22;

        const savedKey = `empresa:${customerData.customer_name}`;
        const fontSize = savedFontSizes[savedKey] || initialFontSize;

        blocks.push({
          id: `empresa-${index}`,
          type: 'empresa',
          title: customerData.customer_name,
          subtitle: `${selectedDayInfo?.fullDate} • ${customerData.total_meals} refeições`,
          items: consolidatedItems,
          fontSize: fontSize,
          width: 100,
          editable: true
        });
      });
    }

    // Adicionar Salada (uma única página)
    if (saladaData && Object.keys(saladaData).length > 0) {
      const saladaItems = [];
      Object.entries(saladaData).forEach(([recipeName, clientes]) => {
        const clientesList = [];

        Object.entries(clientes).forEach(([customerName, clienteData]) => {
          clientesList.push({
            customer_name: customerName,
            quantity: clienteData.quantity,
            unit_type: clienteData.unitType
          });
        });

        saladaItems.push({
          recipe_name: recipeName,
          clientes: clientesList,
          showTotal: false  // Salada não mostra total
        });
      });

      const savedKey = 'detailed-section:Salada';
      const fontSize = savedFontSizes[savedKey] || 16;

      blocks.push({
        id: 'salada',
        type: 'detailed-section',
        title: 'Salada',
        subtitle: selectedDayInfo?.fullDate,
        items: saladaItems,
        fontSize: fontSize,
        width: 100,
        editable: true
      });
    }

    // Adicionar Açougue (uma única página)
    if (acougueData && Object.keys(acougueData).length > 0) {
      const acougueItems = [];
      Object.entries(acougueData).forEach(([recipeName, clientes]) => {
        const clientesList = [];
        let totalQuantity = 0;
        let unitType = '';

        Object.entries(clientes).forEach(([customerName, clienteData]) => {
          clientesList.push({
            customer_name: customerName,
            quantity: clienteData.quantity,
            unit_type: clienteData.unitType
          });
          totalQuantity += clienteData.quantity;
          if (!unitType) unitType = clienteData.unitType;
        });

        totalQuantity = Math.round(totalQuantity * 100) / 100;

        acougueItems.push({
          recipe_name: recipeName,
          clientes: clientesList,
          showTotal: true,
          total: totalQuantity,
          unit_type: unitType
        });
      });

      const savedKey = 'detailed-section:Porcionamento Carnes';
      const fontSize = savedFontSizes[savedKey] || 16;

      blocks.push({
        id: 'acougue',
        type: 'detailed-section',
        title: 'Porcionamento Carnes',
        subtitle: selectedDayInfo?.fullDate,
        items: acougueItems,
        fontSize: fontSize,
        width: 100,
        editable: true
      });
    }

    // Adicionar Embalagem - uma página por categoria
    if (embalagemData && Object.keys(embalagemData).length > 0) {
      const categorias = {
        'PADRÃO': [],
        'REFOGADO': [],
        'ACOMPANHAMENTO': []
      };

      // Agrupar receitas por categoria
      Object.entries(embalagemData).forEach(([recipeName, clientes]) => {
        // Encontrar a receita para verificar sua categoria
        const recipe = recipes.find(r => r.name === recipeName);
        if (!recipe) return;

        const category = recipe.category?.toLowerCase();
        let targetCategory = null;

        if (category?.includes('padrão') || category?.includes('padrao')) {
          targetCategory = 'PADRÃO';
        } else if (category?.includes('refogado')) {
          targetCategory = 'REFOGADO';
        } else if (category?.includes('acompanhamento')) {
          targetCategory = 'ACOMPANHAMENTO';
        }

        if (targetCategory) {
          const clientesList = [];
          let totalQuantity = 0;
          let unitType = '';

          Object.entries(clientes).forEach(([customerName, clienteData]) => {
            if (clienteData && clienteData.quantity !== undefined) {
              clientesList.push({
                customer_name: customerName,
                quantity: clienteData.quantity,
                unit_type: clienteData.unitType
              });
              totalQuantity += clienteData.quantity;
              if (!unitType) unitType = clienteData.unitType;
            }
          });

          totalQuantity = Math.round(totalQuantity * 100) / 100;

          categorias[targetCategory].push({
            recipe_name: recipeName,
            clientes: clientesList,
            showTotal: true,
            total: totalQuantity,
            unit_type: unitType
          });
        }
      });

      // Criar um bloco para cada categoria que tem itens
      Object.entries(categorias).forEach(([categoryName, itemsList]) => {
        if (itemsList.length > 0) {
          const savedKey = `embalagem-category:${categoryName}`;
          const fontSize = savedFontSizes[savedKey] || 16;

          blocks.push({
            id: `embalagem-${categoryName.toLowerCase()}`,
            type: 'embalagem-category',
            title: categoryName,
            subtitle: selectedDayInfo?.fullDate,
            categoryName: categoryName,
            items: itemsList,
            fontSize: fontSize,
            width: 100,
            editable: true
          });
        }
      });
    }

    const savedOrder = loadSavedOrder();
    const orderedBlocks = savedOrder.length > 0
      ? savedOrder.map(id => blocks.find(b => b.id === id)).filter(Boolean)
      : blocks;

    // GARANTIR ordem correta das categorias
    const blocksWithOrderedCategories = ensureCategoryOrderInBlocks(orderedBlocks);

    return Array.isArray(blocksWithOrderedCategories) ? blocksWithOrderedCategories : [];
  }, [porEmpresaData, saladaData, acougueData, embalagemData, loadSavedFontSizes, loadSavedOrder, consolidateCustomerItems, selectedDayInfo, recipes]);

  // Inicializar blocks quando initialBlocks estiver pronto
  useEffect(() => {
    if (initialBlocks.length > 0 && editableBlocks.length === 0 && !isLoadingState) {
      console.log('[PrintPreviewEditor] Setando blocos iniciais:', initialBlocks.length);

      // Aplicar edições salvas aos blocos iniciais
      if (Object.keys(editState).length > 0) {
        const blocksWithEdits = applyEditsToBlocks(initialBlocks, editState);
        console.log('[PrintPreviewEditor] Aplicando', Object.keys(editState).length, 'edições salvas aos blocos');
        setEditableBlocks(blocksWithEdits);
      } else {
        console.log('[PrintPreviewEditor] Sem edições para aplicar, usando blocos originais');
        setEditableBlocks(initialBlocks);
      }
    }
  }, [initialBlocks, editState, applyEditsToBlocks, isLoadingState]);

  const handleItemEdit = useCallback((itemName, clientName, originalValue, editedValue, field = 'content', blockTitle = null) => {
    const normalizedClientName = clientName || 'sem_cliente';

    // Criar chave única usando o novo sistema
    const itemKey = createEditKey(itemName, normalizedClientName, blockTitle);

    console.log('[PrintPreviewEditor] Editando item:', {
      itemKey,
      originalValue,
      editedValue,
      field
    });

    // Criar registro de edição
    const editRecord = createEditRecord({
      itemKey,
      originalValue,
      editedValue,
      field,
      userId: 'local-user',
      userName: 'Usuário Local'
    });

    // Atualizar estado de edições
    setEditState(prev => {
      const newState = {
        ...prev,
        [itemKey]: editRecord
      };
      console.log('[PrintPreviewEditor] Novo editState:', newState);
      return newState;
    });

    // Chamar markItemAsEdited original (Firebase - quando reabilitado)
    markItemAsEdited(itemKey, originalValue, editedValue, field);

    // Usar atualização funcional para evitar dependência de editableBlocks
    setEditableBlocks(prevBlocks => {
      if (!Array.isArray(prevBlocks)) {
        console.error('editableBlocks is not an array in handleItemEdit');
        return prevBlocks;
      }

      const updatedBlocks = prevBlocks.map(block => {
        const updatedBlock = { ...block };
        let modified = false;

        if (updatedBlock.type === 'empresa' && updatedBlock.items) {
          const newItems = {};
          Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
            newItems[category] = categoryItems.map(item => {
              const matchesBlock = blockTitle ? updatedBlock.title === blockTitle : true;
              if (matchesBlock &&
                  item.recipe_name === itemName &&
                  (item.customer_name || 'sem_cliente') === normalizedClientName) {
                modified = true;
                if (field === 'quantity') {
                  const numMatch = editedValue.match(/[\d.,]+/);
                  if (numMatch) {
                    return { ...item, quantity: parseFloat(numMatch[0].replace(',', '.')) };
                  }
                } else if (field === 'name') {
                  return { ...item, recipe_name: editedValue };
                }
              }
              return item;
            });
          });
          if (modified) {
            updatedBlock.items = newItems;
            // IMPORTANTE: Reorganizar para manter ordem das categorias
            return reorganizeBlockItems(updatedBlock);
          }
        }

        // Atualizar blocos tipo 'detailed-section' e 'embalagem-category'
        if ((updatedBlock.type === 'detailed-section' || updatedBlock.type === 'embalagem-category') && updatedBlock.items) {
          updatedBlock.items = updatedBlock.items.map(recipe => {
            if (recipe.recipe_name === itemName || recipe.clientes?.some(c => c.customer_name === normalizedClientName)) {
              const newClientes = recipe.clientes.map(cliente => {
                if (cliente.customer_name === normalizedClientName) {
                  modified = true;
                  if (field === 'quantity') {
                    const numMatch = editedValue.match(/[\d.,]+/);
                    if (numMatch) {
                      return { ...cliente, quantity: parseFloat(numMatch[0].replace(',', '.')) };
                    }
                  } else if (field === 'customer') {
                    return { ...cliente, customer_name: editedValue };
                  }
                }
                return cliente;
              });

              // Recalcular total se necessário
              if (modified && recipe.showTotal) {
                const newTotal = newClientes.reduce((sum, c) => sum + (c.quantity || 0), 0);
                return { ...recipe, clientes: newClientes, total: Math.round(newTotal * 100) / 100 };
              }

              return { ...recipe, clientes: newClientes };
            }
            return recipe;
          });
        }

        return updatedBlock;
      });

      return updatedBlocks;
    });
  }, [markItemAsEdited]);

  const handlePrintFinal = useCallback(() => {
    if (!Array.isArray(editableBlocks)) {
      console.error('editableBlocks is not an array');
      return;
    }

    const blocksWithEditedContent = editableBlocks.map(block => {
      const element = document.getElementById(`block-${block.id}`);
      if (element) {
        const contentElement = element.querySelector('.block-content');
        if (contentElement) {
          const contentWrapper = contentElement.firstElementChild;
          if (!contentWrapper) return block;

          const clone = contentWrapper.cloneNode(true);
          clone.querySelectorAll('.no-print').forEach(el => el.remove());
          clone.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.removeAttribute('suppressContentEditableWarning');
            if (el.style) {
              const textTransform = el.style.textTransform;
              const borderTop = el.style.borderTop;
              const paddingTop = el.style.paddingTop;
              const marginTop = el.style.marginTop;
              const fontWeight = el.style.fontWeight;

              el.removeAttribute('style');

              if (textTransform) el.style.textTransform = textTransform;
              if (borderTop) {
                el.style.borderTop = borderTop;
                el.style.paddingTop = paddingTop;
                el.style.marginTop = marginTop;
                el.style.fontWeight = fontWeight;
              }
            }
          });

          return {
            ...block,
            editedHTML: clone.innerHTML
          };
        }
      }
      return block;
    });

    // Gerar HTML final com conteúdo editado
    const generatePrintHTML = (blocks) => {
      const htmlParts = blocks.map(block => {
        if (block.editedHTML) {
          return `<div class="a4-page" style="font-size: ${block.fontSize}px;">${block.editedHTML}</div>`;
        }
        return '';
      }).filter(Boolean);

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Programação - ${selectedDayInfo?.fullDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; }
            .a4-page {
              width: 794px;
              min-height: 1123px;
              padding: 40px;
              margin: 0 auto;
              page-break-after: always;
              background: white;
            }
            @media print {
              .a4-page { margin: 0; box-shadow: none; page-break-after: always; }
            }
          </style>
        </head>
        <body>
          ${htmlParts.join('\n')}
        </body>
        </html>
      `;
    };

    const printHTML = generatePrintHTML(blocksWithEditedContent);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }, [selectedDayInfo]);

  const handleDownloadPDF = useCallback(async () => {
    await generateAndDownloadPDF({
      setZoom,
      zoom,
      setIsGeneratingPDF,
      setPdfProgress,
      selectedDayInfo
    });
  }, [zoom, selectedDayInfo]);

  // Processar blocos adicionando informações de estado (cores, labels, conflitos)
  const processedBlocks = useMemo(() => {
    if (!Array.isArray(editableBlocks)) return [];

    return editableBlocks.map(block =>
      processBlockItemsWithStates({
        block,
        editedItems: editState,
        portalUpdates,
        resolvedConflicts
      })
    );
  }, [editableBlocks, editState, portalUpdates, resolvedConflicts]);

  return (
    <div className="print-preview-container">
      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <h2 className="text-lg font-bold">Editor de Impressão</h2>
          <span className="text-sm text-gray-600">{Array.isArray(editableBlocks) ? editableBlocks.length : 0} blocos</span>
          {hasSavedSizes && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
              ✓ Ajustes salvos
            </span>
          )}

          {/* Status de sincronização Firebase */}
          {isSyncing && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
              <Cloud className="w-3 h-3 animate-pulse" />
              Sincronizando...
            </span>
          )}
          {!isSyncing && lastSyncTime && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Sincronizado
            </span>
          )}

          {/* Bloqueio de edição */}
          {isLocked && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Bloqueado
            </span>
          )}

          {/* Usuários editando */}
          {editingUsers.length > 0 && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1" title={editingUsers.map(u => u.userName).join(', ')}>
              <Users className="w-3 h-3" />
              {editingUsers.length} {editingUsers.length === 1 ? 'usuário' : 'usuários'}
            </span>
          )}

          {/* Mudanças nos pedidos originais */}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold flex items-center gap-1" title="Pedidos originais foram modificados">
                <AlertTriangle className="w-3 h-3" />
                Pedidos alterados
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetSnapshot}
                title="Resetar detecção: considerar valores atuais como novos valores base"
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Resetar detecção
              </Button>
            </div>
          )}
        </div>

        <div className="toolbar-center">
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(50, z - 10))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="zoom-label">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(150, z + 10))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="toolbar-right">
          <Button variant="outline" size="sm" onClick={handleResetFontSizes} title="Resetar todos os tamanhos para os padrões">
            <RefreshCw className="w-4 h-4 mr-2" />
            Resetar
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isGeneratingPDF ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {pdfProgress.total > 0
                  ? `Gerando ${pdfProgress.current}/${pdfProgress.total}...`
                  : 'Preparando...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </>
            )}
          </Button>
          <Button onClick={handlePrintFinal} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="sidebar-navigation">
          <div className="sidebar-header">
            <h3 className="text-sm font-bold text-gray-700">Páginas</h3>
            <p className="text-xs text-gray-500 mt-1">Arraste para reordenar</p>
          </div>
          <div className="sidebar-content">
            {Array.isArray(processedBlocks) && processedBlocks.map((block, index) => {
              const status = blockStatus[block.id];
              const isAdjusted = status && !status.isOverflowing;
              const needsFix = status && status.isOverflowing;

              return (
                <div
                  key={block.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => scrollToBlock(block.id)}
                  className={`sidebar-item ${selectedBlock === block.id ? 'active' : ''} ${draggedIndex === index ? 'dragging' : ''}`}
                  style={{ cursor: draggedIndex === index ? 'grabbing' : 'grab' }}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="sidebar-item-number">{index + 1}</div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-title">{formatRecipeName(block.title)}</div>
                    <div className="sidebar-item-meta">{block.fontSize}px</div>
                  </div>
                  {needsFix && (
                    <div
                      className="sidebar-badge badge-warning clickable"
                      onClick={(e) => handleFixBlock(block.id, e)}
                      title="Clique para corrigir automaticamente"
                    >
                      Corrigir
                    </div>
                  )}
                  {isAdjusted && (
                    <div className="sidebar-badge badge-success">Ajustado</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview Area */}
        <div ref={previewAreaRef} className="preview-area">
        <div style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          minWidth: '794px',
          paddingBottom: '20px'
        }}>
          {Array.isArray(processedBlocks) && processedBlocks.map((block, index) => (
            <EditableBlock
              key={block.id}
              block={block}
              isSelected={selectedBlock === block.id}
              onSelect={() => setSelectedBlock(block.id)}
              onFontSizeChange={(delta) => handleFontSizeChange(block.id, delta)}
              onAutoFit={() => handleAutoFit(block.id)}
              onAutoFitComplete={() => handleAutoFitComplete(block.id)}
              onContentEdit={(field, value) => handleContentEdit(block.id, field, value)}
              onItemEdit={handleItemEdit}
              onStatusUpdate={handleStatusUpdate}
              formatQuantityDisplay={formatQuantityDisplay}
              isItemEdited={isItemEdited}
              getItemEditInfo={getItemEditInfo}
              isItemChanged={isItemChanged}
              getItemChangeInfo={getItemChangeInfo}
              acceptPortalChange={handleAcceptPortalChange}
              rejectPortalChange={handleRejectPortalChange}
              getResolutionStatus={getResolutionStatus}
              isLocked={isLocked}
            />
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
