'use client';

/**
 * PrintPreviewEditor - Editor de visualização e impressão de programação
 *
 * Componente principal para editar, visualizar e gerar PDFs da programação de produção.
 * Suporta:
 * - Edição inline de blocos e itens
 * - Ajuste automático de fonte (auto-fit)
 * - Detecção de conflitos entre edições manuais e mudanças do portal
 * - Sincronização em tempo real via Firebase
 * - Geração de PDF com html2canvas
 * - Drag & drop para reordenar blocos
 * - Zoom e controles de impressão
 *
 * Estrutura modular:
 * - hooks/ - Custom hooks para gerenciamento de estado (conflitos, fontes, blocos)
 * - components/ - Componentes reutilizáveis (EditableBlock, Tooltip, ConflictButtons, etc)
 * - utils/ - Funções utilitárias (formatação, detecção de mudanças, chaves de itens)
 * - services/ - Serviços externos (geração de PDF)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo, formatQuantityDisplay, consolidateCustomerItems, recipes, originalOrders } = data;

  const [editableBlocks, setEditableBlocks] = useState([]);
  const [zoom, setZoom] = useState(50); // Zoom inicial reduzido para 50% para visualizar folha inteira
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const previewAreaRef = useRef(null);

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

  // Extrair informações de semana/ano/dia do selectedDayInfo
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

  // Hook de resolução de conflitos e detecção de mudanças
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

  // Debug: Log quando originalOrders muda
  useEffect(() => {
    if (originalOrders) {
      console.log('[PrintPreviewEditor] originalOrders atualizado, total de pedidos:', originalOrders.length);
    }
  }, [originalOrders]);

  // Função para aplicar edições salvas aos blocos
  const applyEditsToBlocks = (blocks, editedItemsMap) => {
    if (!editedItemsMap || Object.keys(editedItemsMap).length === 0) {
      return blocks;
    }

    return blocks.map(block => {
      const updatedBlock = { ...block };

      // Aplicar edições em blocos tipo 'empresa'
      if (updatedBlock.type === 'empresa' && updatedBlock.items) {
        const newItems = {};
        Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
          newItems[category] = categoryItems.map(item => {
            const normalizedCustomerName = item.customer_name || 'sem_cliente';
            // Novo formato: inclui o título do bloco (empresa)
            const newFormatKey = `${updatedBlock.title}_${item.recipe_name}_${normalizedCustomerName}`;
            // Formato antigo: para retrocompatibilidade
            const oldFormatKey = `${item.recipe_name}_${normalizedCustomerName}`;

            // Tentar primeiro o novo formato, depois o antigo
            const editInfo = editedItemsMap[newFormatKey] || editedItemsMap[oldFormatKey];

            if (editInfo && editInfo.field === 'quantity') {
              // Extrair número do valor editado
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

      // Aplicar edições em blocos tipo 'detailed-section' e 'embalagem-category'
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

          // Recalcular total se necessário
          if (recipe.showTotal) {
            const newTotal = newClientes.reduce((sum, c) => sum + (c.quantity || 0), 0);
            return { ...recipe, clientes: newClientes, total: Math.round(newTotal * 100) / 100 };
          }

          return { ...recipe, clientes: newClientes };
        });
      }

      return updatedBlock;
    });
  };

  // Ref para rastrear se já inicializamos os blocos
  const hasInitializedBlocksRef = useRef(false);

  // Inicializar blocos editáveis
  // Criar blocos iniciais APENAS UMA VEZ na montagem
  // Não recriar quando dados mudarem para preservar edições do usuário
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // Se já inicializamos, não fazer nada
    if (hasInitializedBlocksRef.current) {
      return;
    }

    // Só inicializar se houver dados disponíveis
    if (!porEmpresaData && !saladaData && !acougueData && !embalagemData) {
      return;
    }

    // Marcar como inicializado
    hasInitializedBlocksRef.current = true;

    const blocks = [];
    const savedFontSizes = loadSavedFontSizes();

    // Criar blocos para cada empresa
    if (porEmpresaData && porEmpresaData.length > 0) {
      porEmpresaData.forEach((customerData, index) => {
        const consolidatedItems = consolidateCustomerItems(customerData.orders);

        // Calcular tamanho inicial baseado na quantidade de itens
        const totalItems = Object.values(consolidatedItems).reduce((sum, items) => sum + items.length, 0);
        let initialFontSize = 16; // Base maior
        if (totalItems <= 10) initialFontSize = 18;
        if (totalItems <= 8) initialFontSize = 20;
        if (totalItems <= 6) initialFontSize = 22;

        // Usar tamanho salvo se existir
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
    // Nota: embalagemData vem com estrutura { recipeName: { customerName: {...} } }
    // Precisamos agrupar por categoria (PADRÃO, REFOGADO, ACOMPANHAMENTO)
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

    // Aplicar ordem salva se existir
    const savedOrder = loadSavedOrder();
    if (savedOrder.length > 0) {
      // Reordenar blocks baseado na ordem salva
      const orderedBlocks = [];
      const blocksMap = new Map(blocks.map(b => [b.id, b]));

      // Adicionar blocos na ordem salva
      savedOrder.forEach(id => {
        if (blocksMap.has(id)) {
          orderedBlocks.push(blocksMap.get(id));
          blocksMap.delete(id);
        }
      });

      // Adicionar blocos novos que não estavam na ordem salva
      blocksMap.forEach(block => orderedBlocks.push(block));

      setEditableBlocks(orderedBlocks);
    } else {
      setEditableBlocks(blocks);
    }
  }, [porEmpresaData, saladaData, acougueData, embalagemData]); // Executar quando dados chegarem, mas só uma vez graças à ref

  // Ref para prevenir loop infinito
  const isSyncingRef = useRef(false);
  const lastSavedBlocksRef = useRef(null);
  const hasLoadedFromFirebaseRef = useRef(false);

  // Salvar automaticamente quando fontSize ou ordem mudar
  useEffect(() => {
    if (editableBlocks.length > 0 && !isSyncingRef.current && hasLoadedFromFirebaseRef.current) {
      // Verificar se realmente mudou
      const currentSerialized = JSON.stringify(editableBlocks);
      const lastSerialized = lastSavedBlocksRef.current;

      if (currentSerialized !== lastSerialized) {
        saveFontSizes(editableBlocks);
        savePageOrder(editableBlocks);
        // Sincronizar com Firebase
        updateFirebaseBlocks(editableBlocks);
        lastSavedBlocksRef.current = currentSerialized;
      }
    }
  }, [editableBlocks, updateFirebaseBlocks]);

  // Carregar blocos do Firebase APENAS na primeira vez (carga inicial)
  useEffect(() => {
    if (firebaseBlocks && firebaseBlocks.length > 0 && !hasLoadedFromFirebaseRef.current) {
      isSyncingRef.current = true;

      // Aplicar edições salvas aos blocos carregados
      const blocksWithEdits = applyEditsToBlocks(firebaseBlocks, editedItems);

      setEditableBlocks(blocksWithEdits);
      lastSavedBlocksRef.current = JSON.stringify(blocksWithEdits);
      hasLoadedFromFirebaseRef.current = true;

      // Liberar após um pequeno delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  }, [firebaseBlocks, editedItems]);

  // Aplicar edições quando editedItems for carregado DEPOIS dos blocos
  const hasAppliedEditedItemsRef = useRef(false);
  useEffect(() => {
    if (hasLoadedFromFirebaseRef.current && editedItems && Object.keys(editedItems).length > 0 && !hasAppliedEditedItemsRef.current) {
      setEditableBlocks(prevBlocks => applyEditsToBlocks(prevBlocks, editedItems));
      hasAppliedEditedItemsRef.current = true;
    }
  }, [editedItems]);

  const handleItemEdit = (itemName, clientName, originalValue, editedValue, field = 'content', blockTitle = null) => {
    // Normalizar clientName para corresponder à chave usada na renderização
    const normalizedClientName = clientName || 'sem_cliente';

    // Para blocos tipo 'empresa', incluir blockTitle na chave para evitar colisões
    // entre receitas com mesmo nome em empresas diferentes
    const itemKey = createItemKey(itemName, normalizedClientName, blockTitle);

    // Marcar item como editado no Firebase
    markItemAsEdited(itemKey, originalValue, editedValue, field);

    // Atualizar o valor nos blocos para persistir visualmente
    setEditableBlocks(blocks =>
      blocks.map(block => {
        // Clonar o bloco para não modificar diretamente
        const updatedBlock = { ...block };
        let modified = false;

        // Atualizar blocos tipo 'empresa'
        if (updatedBlock.type === 'empresa' && updatedBlock.items) {
          const newItems = {};
          Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
            newItems[category] = categoryItems.map(item => {
              // Para empresa blocks, precisamos verificar se o blockTitle corresponde também
              const matchesBlock = blockTitle ? updatedBlock.title === blockTitle : true;
              if (matchesBlock &&
                  item.recipe_name === itemName &&
                  (item.customer_name || 'sem_cliente') === normalizedClientName) {
                modified = true;
                if (field === 'quantity') {
                  // Extrair apenas o número do editedValue
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

        // Atualizar blocos tipo 'detailed-section' (Salada, Açougue)
        if ((updatedBlock.type === 'detailed-section' || updatedBlock.type === 'embalagem-category') && updatedBlock.items) {
          updatedBlock.items = updatedBlock.items.map(recipe => {
            if (recipe.recipe_name === itemName || recipe.clientes?.some(c => c.customer_name === normalizedClientName)) {
              const newClientes = recipe.clientes.map(cliente => {
                if (cliente.customer_name === normalizedClientName) {
                  modified = true;
                  if (field === 'quantity') {
                    // Extrair apenas o número do editedValue
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
      })
    );
  };

  const handlePrintFinal = () => {
    // Capturar HTML editado de cada bloco do DOM
    const blocksWithEditedContent = editableBlocks.map(block => {
      const element = document.getElementById(`block-${block.id}`);
      if (element) {
        const contentElement = element.querySelector('.block-content');
        if (contentElement) {
          // Pegar o wrapper interno (primeiro filho) que contém o conteúdo real
          const contentWrapper = contentElement.firstElementChild;
          if (!contentWrapper) return block;

          // Clonar para não modificar o original
          const clone = contentWrapper.cloneNode(true);

          // Remover elementos .no-print (botões de conflito, timestamps)
          clone.querySelectorAll('.no-print').forEach(el => el.remove());

          // Limpar atributos de edição e estilos inline extras
          clone.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
            el.removeAttribute('suppressContentEditableWarning');
            // Remover todos os estilos inline exceto textTransform
            if (el.style) {
              const textTransform = el.style.textTransform;
              const borderTop = el.style.borderTop;
              const paddingTop = el.style.paddingTop;
              const marginTop = el.style.marginTop;
              const fontWeight = el.style.fontWeight;

              el.removeAttribute('style');

              // Restaurar apenas os estilos estruturais necessários
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
    const printHTML = generatePrintHTML(blocksWithEditedContent);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    await generateAndDownloadPDF({
      setZoom,
      zoom,
      setIsGeneratingPDF,
      setPdfProgress,
      selectedDayInfo
    });
  };


  return (
    <div className="print-preview-container">
      {/* Toolbar */}
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <h2 className="text-lg font-bold">Editor de Impressão</h2>
          <span className="text-sm text-gray-600">{editableBlocks.length} blocos</span>
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
            {editableBlocks.map((block, index) => {
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
            display: 'inline-flex', // inline-flex evita expansão desnecessária
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            minWidth: '794px', // Largura mínima = largura do card A4
            paddingBottom: '20px'
          }}>
            {editableBlocks.map((block, index) => (
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

