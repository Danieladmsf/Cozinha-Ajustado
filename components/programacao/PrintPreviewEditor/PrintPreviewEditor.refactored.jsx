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

import React, { useState, useRef, useEffect, useCallback, useReducer, useMemo } from 'react';
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

// Reducer para centralizar todas as modificações de blocos
function blocksReducer(state, action) {
  switch (action.type) {
    case 'INIT_BLOCKS':
      return {
        blocks: action.payload,
        version: state.version + 1,
        source: 'init'
      };

    case 'LOAD_FROM_FIREBASE':
      return {
        blocks: action.payload,
        version: state.version + 1,
        source: 'firebase'
      };

    case 'UPDATE_QUANTITIES':
      return {
        blocks: action.payload,
        version: state.version + 1,
        source: 'quantities'
      };

    case 'APPLY_EDITS':
      return {
        blocks: action.payload,
        version: state.version + 1,
        source: 'edits'
      };

    case 'UPDATE_BLOCKS':
      return {
        blocks: action.payload,
        version: state.version + 1,
        source: 'update'
      };

    default:
      return state;
  }
}

export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo, formatQuantityDisplay, consolidateCustomerItems, recipes, originalOrders } = data;

  // Usar useReducer em vez de useState para melhor controle
  const [blocksState, dispatch] = useReducer(blocksReducer, {
    blocks: [],
    version: 0,
    source: null
  });

  const [zoom, setZoom] = useState(50);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const previewAreaRef = useRef(null);

  // Refs para controle de inicialização
  const hasInitializedRef = useRef(false);
  const hasLoadedFromFirebaseRef = useRef(false);
  const lastFirebaseSyncVersion = useRef(-1);

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
  } = useBlockManagement(blocksState.blocks, (blocks) => {
    dispatch({ type: 'UPDATE_BLOCKS', payload: blocks });
  }, previewAreaRef, zoom);

  // Extrair informações de semana/ano/dia
  const weekNumber = selectedDayInfo?.weekNumber || 0;
  const year = selectedDayInfo?.year || new Date().getFullYear();
  const dayNumber = selectedDayInfo?.dayNumber || 0;

  // Hooks Firebase
  const {
    blocks: firebaseBlocks,
    updateBlocks: updateFirebaseBlocks,
    editedItems,
    markItemAsEdited,
    isItemEdited,
    getItemEditInfo,
    acceptPortalChange,
    rejectPortalChange,
    editingUsers,
    isLocked,
    isSyncing,
    lastSyncTime,
    sessionId
  } = useImpressaoProgramacao(weekNumber, year, dayNumber, data);

  // Hook de resolução de conflitos
  const {
    changedItems,
    resolvedConflicts,
    initialSnapshot,
    hasChanges,
    isItemChanged,
    getItemChangeInfo,
    getResolutionStatus,
    handleAcceptPortalChange,
    handleRejectPortalChange,
    handleResetSnapshot
  } = useConflictResolution(
    originalOrders,
    weekNumber,
    year,
    dayNumber,
    markItemAsEdited,
    rejectPortalChange
  );

  // Função estável para aplicar edições (usando useCallback)
  const applyEditsToBlocks = useCallback((blocks, editedItemsMap) => {
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
            const newFormatKey = `${updatedBlock.title}_${item.recipe_name}_${normalizedCustomerName}`;
            const oldFormatKey = `${item.recipe_name}_${normalizedCustomerName}`;
            const editInfo = editedItemsMap[newFormatKey] || editedItemsMap[oldFormatKey];

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
            const itemKey = createItemKey(recipe.recipe_name, cliente.customer_name);
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

  // Inicializar blocos APENAS UMA VEZ
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!porEmpresaData && !saladaData && !acougueData && !embalagemData) return;

    hasInitializedRef.current = true;

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

    dispatch({ type: 'INIT_BLOCKS', payload: orderedBlocks });
  }, [porEmpresaData, saladaData, acougueData, embalagemData, loadSavedFontSizes, loadSavedOrder, consolidateCustomerItems, selectedDayInfo]);

  // Carregar do Firebase APENAS UMA VEZ
  useEffect(() => {
    if (!firebaseBlocks || firebaseBlocks.length === 0) return;
    if (hasLoadedFromFirebaseRef.current) return;

    hasLoadedFromFirebaseRef.current = true;
    const blocksWithEdits = applyEditsToBlocks(firebaseBlocks, editedItems);
    dispatch({ type: 'LOAD_FROM_FIREBASE', payload: blocksWithEdits });
  }, [firebaseBlocks, editedItems, applyEditsToBlocks]);

  // Sincronizar com Firebase apenas quando necessário
  useEffect(() => {
    if (blocksState.blocks.length === 0) return;
    if (!hasLoadedFromFirebaseRef.current && !hasInitializedRef.current) return;
    if (blocksState.source === 'firebase') return; // Não sincronizar de volta para o Firebase
    if (lastFirebaseSyncVersion.current === blocksState.version) return;

    lastFirebaseSyncVersion.current = blocksState.version;

    saveFontSizes(blocksState.blocks);
    savePageOrder(blocksState.blocks);
    updateFirebaseBlocks(blocksState.blocks);
  }, [blocksState.version, blocksState.blocks, blocksState.source, updateFirebaseBlocks, saveFontSizes, savePageOrder]);

  // Atualizar quantidades quando originalOrders mudar
  const lastProcessedOrdersRef = useRef(null);
  useEffect(() => {
    if (!originalOrders || blocksState.blocks.length === 0) return;
    if (!hasLoadedFromFirebaseRef.current && !hasInitializedRef.current) return;

    const ordersHash = JSON.stringify(originalOrders);
    if (lastProcessedOrdersRef.current === ordersHash) return;
    lastProcessedOrdersRef.current = ordersHash;

    const currentQuantities = {};
    originalOrders.forEach(order => {
      if (!order.items) return;
      order.items.forEach(item => {
        const itemKey = createItemKey(item.recipe_name, order.customer_name);
        currentQuantities[itemKey] = {
          quantity: item.quantity,
          unit_type: item.unit_type
        };
      });
    });

    const updatedBlocks = blocksState.blocks.map(block => {
      const updatedBlock = { ...block };

      if (block.type === 'empresa' && block.items) {
        const newItems = {};
        Object.entries(block.items).forEach(([category, items]) => {
          newItems[category] = items.map(item => {
            const itemKey = createItemKey(item.recipe_name, item.customer_name || 'sem_cliente', block.title);
            const editInfo = isItemEdited && isItemEdited(itemKey);

            if (editInfo) return item;

            const portalData = currentQuantities[itemKey];
            if (portalData) {
              return {
                ...item,
                quantity: portalData.quantity,
                unit_type: portalData.unit_type
              };
            }
            return item;
          });
        });
        updatedBlock.items = newItems;
      }

      // Atualizar blocos tipo 'detailed-section'
      if (block.type === 'detailed-section' && block.items) {
        updatedBlock.items = block.items.map(recipe => {
          const newClientes = recipe.clientes.map(cliente => {
            const itemKey = createItemKey(recipe.recipe_name, cliente.customer_name);
            const editInfo = isItemEdited && isItemEdited(itemKey);

            if (editInfo) return cliente;

            const portalData = currentQuantities[itemKey];
            if (portalData) {
              return {
                ...cliente,
                quantity: portalData.quantity,
                unit_type: portalData.unit_type
              };
            }
            return cliente;
          });

          return { ...recipe, clientes: newClientes };
        });
      }

      // Atualizar blocos tipo 'embalagem-category'
      if (block.type === 'embalagem-category' && block.items) {
        updatedBlock.items = block.items.map(recipe => {
          const newClientes = recipe.clientes.map(cliente => {
            const itemKey = createItemKey(recipe.recipe_name, cliente.customer_name);
            const editInfo = isItemEdited && isItemEdited(itemKey);

            if (editInfo) return cliente;

            const portalData = currentQuantities[itemKey];
            if (portalData) {
              return {
                ...cliente,
                quantity: portalData.quantity,
                unit_type: portalData.unit_type
              };
            }
            return cliente;
          });

          return { ...recipe, clientes: newClientes };
        });
      }

      return updatedBlock;
    });

    dispatch({ type: 'UPDATE_QUANTITIES', payload: updatedBlocks });
  }, [originalOrders, isItemEdited, blocksState.blocks]);

  const handleItemEdit = useCallback((itemName, clientName, originalValue, editedValue, field = 'content', blockTitle = null) => {
    const normalizedClientName = clientName || 'sem_cliente';
    const itemKey = createItemKey(itemName, normalizedClientName, blockTitle);

    markItemAsEdited(itemKey, originalValue, editedValue, field);

    const updatedBlocks = blocksState.blocks.map(block => {
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

    dispatch({ type: 'UPDATE_BLOCKS', payload: updatedBlocks });
  }, [blocksState.blocks, markItemAsEdited]);

  const handlePrintFinal = useCallback(() => {
    const blocksWithEditedContent = blocksState.blocks.map(block => {
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
  }, [blocksState.blocks, selectedDayInfo]);

  const handleDownloadPDF = useCallback(async () => {
    await generateAndDownloadPDF({
      setZoom,
      zoom,
      setIsGeneratingPDF,
      setPdfProgress,
      selectedDayInfo
    });
  }, [zoom, selectedDayInfo]);

  return (
    <div className="print-preview-container">
      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <h2 className="text-lg font-bold">Editor de Impressão</h2>
          <span className="text-sm text-gray-600">{blocksState.blocks.length} blocos</span>
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
            {blocksState.blocks.map((block, index) => {
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
          {blocksState.blocks.map((block, index) => (
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
