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
import { useFontSizeManager } from './hooks/useFontSizeManager';
import { useBlockManagement } from './hooks/useBlockManagement';
import { useCategoryOrder } from './hooks/useCategoryOrder';
import { EditableBlock } from './components/EditableBlock';
import { SidebarNavigation } from './components/SidebarNavigation';
import { generateAndDownloadPDF } from './services/pdfGenerator';
import './print-preview.css';

// Importar sistema de gerenciamento de estado
import {
  ensureCategoryOrderInBlocks,
  reorganizeBlockItems,
  sortCategoriesObject
} from './utils';

// NOVO: Sistema simplificado de edições (com Firebase sync)
import {
  saveEdit,
  getEdit,
  getAllEditsForRecipe,
  getAllEditsForCustomer,
  loadAllEdits,
  clearAllEdits,
  getEditsSummary,
  migrateFromOldSystem,
  shouldUseEdit,
  loadEditsFromFirebase,
  subscribeToEdits,
  loadBlockOrderFromFirebase,
  subscribeToBlockOrder
} from './utils/simpleEditManager';

export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo, formatQuantityDisplay, consolidateCustomerItems, recipes, originalOrders } = data;

  // Simplificar: usar useState ao invés de useReducer
  const [editableBlocks, setEditableBlocks] = useState([]);
  const [zoom, setZoom] = useState(50);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const previewAreaRef = useRef(null);

  // Estados para gerenciamento de edições e conflitos
  // NOVO: Estado simplificado - carrega do localStorage (Firebase será carregado via useEffect)
  const [editState, setEditState] = useState(() => {
    // Migrar automaticamente do sistema antigo se necessário
    migrateFromOldSystem();
    return loadAllEdits();
  });

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

  // Hook de gerenciamento de ordem das categorias
  const {
    categoryOrder,
    draggedCategoryIndex,
    handleCategoryDragStart,
    handleCategoryDragOver,
    handleCategoryDrop,
    handleCategoryDragEnd,
    applyOrderToBlocks,
    extractCategoriesFromBlocks,
    applyCustomerOrderToConsolidatedBlocks
  } = useCategoryOrder();

  // Estado para seções expandidas no sidebar
  const [expandedSections, setExpandedSections] = useState({
    blocks: true,
    categories: true
  });

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Extrair informações de semana/ano/dia
  const weekNumber = selectedDayInfo?.weekNumber || 0;
  const year = selectedDayInfo?.year || new Date().getFullYear();
  const dayNumber = selectedDayInfo?.dayNumber || 0;

  // Gerar chave única para este dia (para Firebase sync)
  const weekDayKey = useMemo(() => {
    if (!selectedDayInfo) return null;
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const dayName = dayNames[dayNumber] || 'Seg';
    return `${year}_W${String(weekNumber).padStart(2, '0')}_${dayName}`;
  }, [year, weekNumber, dayNumber, selectedDayInfo]);

  // Estado para ordem dos blocos vinda do Firebase
  const [firebaseBlockOrder, setFirebaseBlockOrder] = useState([]);

  // FIREBASE SYNC: Carregar edições e criar listener em tempo real
  useEffect(() => {
    if (!weekDayKey) return;

    // 1. Carregar edições do Firebase ao montar
    loadEditsFromFirebase(weekDayKey).then(firebaseEdits => {
      if (Object.keys(firebaseEdits).length > 0) {
        setEditState(firebaseEdits);
      }
    });

    // 2. Criar listener em tempo real
    const unsubscribe = subscribeToEdits(weekDayKey, (firebaseEdits) => {
      setEditState(firebaseEdits);
    });

    // Cleanup: remover listener ao desmontar
    return () => {
      unsubscribe();
    };
  }, [weekDayKey]);

  // FIREBASE SYNC: Carregar e sincronizar ordem dos blocos
  useEffect(() => {
    if (!weekDayKey) return;

    // 1. Carregar ordem do Firebase ao montar
    loadBlockOrderFromFirebase(weekDayKey).then(firebaseOrder => {
      if (firebaseOrder.length > 0) {
        setFirebaseBlockOrder(firebaseOrder);
      }
    });

    // 2. Criar listener em tempo real para ordem
    const unsubscribe = subscribeToBlockOrder(weekDayKey, (firebaseOrder) => {
      setFirebaseBlockOrder(firebaseOrder);
    });

    // Cleanup: remover listener ao desmontar
    return () => {
      unsubscribe();
    };
  }, [weekDayKey]);

  // Funções para indicadores visuais de edição
  // Usar editState ao invés de getEdit para ter dados sincronizados com Firebase

  // Amarelo: edição local (userId === 'local-user')
  const isItemEdited = useCallback((customerName, recipeName) => {
    const edit = editState[customerName]?.[recipeName];
    return !!(edit && edit.userId === 'local-user');
  }, [editState]);

  const getItemEditInfo = useCallback((customerName, recipeName) => {
    const edit = editState[customerName]?.[recipeName];
    return edit && edit.userId === 'local-user' ? edit : null;
  }, [editState]);

  // Verde: edição vinda do portal (userId !== 'local-user')
  const isItemChanged = useCallback((customerName, recipeName) => {
    const edit = editState[customerName]?.[recipeName];
    return !!(edit && edit.userId !== 'local-user');
  }, [editState]);

  const getItemChangeInfo = useCallback((customerName, recipeName) => {
    const edit = editState[customerName]?.[recipeName];
    return edit && edit.userId !== 'local-user' ? edit : null;
  }, [editState]);

  // Vermelho: conflito (quando há edição local E do portal)
  // Por enquanto, não implementado - precisaria rastrear ambos separadamente
  const getResolutionStatus = useCallback((customerName, recipeName) => {
    // TODO: Implementar detecção de conflito quando houver tracking separado
    return null;
  }, []);

  // Handlers para aceitar/rejeitar mudanças do portal
  const handleAcceptPortalChange = useCallback((customerName, recipeName) => {
    // A mudança do portal já está aplicada, apenas remover a edição local se existir
  }, []);

  const handleRejectPortalChange = useCallback((customerName, recipeName) => {
    // Rejeitar = manter edição local e ignorar portal
  }, []);

  const isLocked = false;

  // SISTEMA DE SEMÁFORO: Aplica edições COM verificação inteligente
  const applyEditsToBlocks = useCallback((blocks, editsState) => {
    if (!Array.isArray(blocks)) {
      return [];
    }

    if (!editsState || Object.keys(editsState).length === 0) {
      return blocks;
    }

    return blocks.map(block => {
      const updatedBlock = { ...block };

      // BLOCOS EMPRESA: updatedBlock.title é o nome do cliente
      if (updatedBlock.type === 'empresa' && updatedBlock.items) {
        const newItems = {};
        Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
          newItems[category] = categoryItems.map(item => {
            // SEMÁFORO: Verifica se deve usar edição ou Firebase
            const decision = shouldUseEdit(
              updatedBlock.title,
              item.recipe_name,
              item.quantity // Valor atual do Firebase
            );

            if (decision && decision.quantity !== null) {
              return { ...item, quantity: decision.quantity };
            }
            return item;
          });
        });
        // CORREÇÃO: Garantir ordem das categorias após aplicar edições
        updatedBlock.items = sortCategoriesObject(newItems);
      }

      // BLOCOS CONSOLIDADOS: procurar em todos os clientes
      if ((updatedBlock.type === 'detailed-section' || updatedBlock.type === 'embalagem-category') && updatedBlock.items) {
        updatedBlock.items = updatedBlock.items.map(recipe => {
          const newClientes = recipe.clientes.map(cliente => {
            // SEMÁFORO: Verifica se deve usar edição ou Firebase
            const decision = shouldUseEdit(
              cliente.customer_name,
              recipe.recipe_name,
              cliente.quantity // Valor atual do Firebase
            );

            if (decision && decision.quantity !== null) {
              return { ...cliente, quantity: decision.quantity };
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
  }, []);

  // Inicializar blocos APENAS UMA VEZ com useMemo
  const initialBlocks = useMemo(() => {
    if (!porEmpresaData && !saladaData && !acougueData && !embalagemData) return [];

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

        // Usar nome do cliente no ID para manter consistência entre recarregamentos
        // Normalizar nome para criar ID válido (remover acentos e caracteres especiais)
        const normalizedName = customerData.customer_name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '-')
          .toLowerCase();

        blocks.push({
          id: `empresa-${normalizedName}`,
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

    // Prioridade: Firebase > localStorage
    const localOrder = loadSavedOrder();
    const savedOrder = firebaseBlockOrder.length > 0 ? firebaseBlockOrder : localOrder;
    let orderedBlocks = blocks;

    if (savedOrder.length > 0) {
      // Tentar aplicar ordem salva
      const matchedBlocks = savedOrder.map(id => blocks.find(b => b.id === id)).filter(Boolean);

      // Se a ordem salva corresponde aos blocos, usar ela
      // Caso contrário (IDs antigos), usar ordem padrão e adicionar blocos não encontrados
      if (matchedBlocks.length > 0) {
        // Adicionar blocos que não estavam na ordem salva
        const unmatchedBlocks = blocks.filter(b => !savedOrder.includes(b.id));
        orderedBlocks = [...matchedBlocks, ...unmatchedBlocks];
      }
    }

    // GARANTIR ordem correta das categorias
    const blocksWithOrderedCategories = ensureCategoryOrderInBlocks(orderedBlocks);

    return Array.isArray(blocksWithOrderedCategories) ? blocksWithOrderedCategories : [];
  }, [porEmpresaData, saladaData, acougueData, embalagemData, loadSavedFontSizes, loadSavedOrder, consolidateCustomerItems, selectedDayInfo, recipes, firebaseBlockOrder]);

  // Ref para rastrear a ordem atual dos blocos (preservar durante edições)
  const currentBlockOrderRef = useRef([]);

  // Salvar ordem no localStorage quando blocos são reordenados via drag-and-drop
  useEffect(() => {
    if (editableBlocks.length > 0) {
      const currentOrder = editableBlocks.map(b => b.id);
      const previousOrder = currentBlockOrderRef.current;

      // Detectar se houve reordenação (drag-and-drop)
      if (previousOrder.length > 0 &&
          currentOrder.length === previousOrder.length &&
          currentOrder.some((id, idx) => id !== previousOrder[idx])) {
        // Ordem mudou - salvar no localStorage + Firebase
        savePageOrder(editableBlocks, weekDayKey);

        // Aplicar ordem dos clientes aos blocos consolidados
        const blocksWithCustomerOrder = applyCustomerOrderToConsolidatedBlocks(editableBlocks);

        // Verificar se houve mudança na ordem dos clientes
        const clientOrderChanged = blocksWithCustomerOrder.some((block, idx) => {
          if ((block.type === 'detailed-section' || block.type === 'embalagem-category') &&
              block.items && editableBlocks[idx]?.items) {
            return block.items.some((recipe, recipeIdx) => {
              const originalRecipe = editableBlocks[idx].items[recipeIdx];
              if (recipe.clientes && originalRecipe?.clientes) {
                const newClientOrder = recipe.clientes.map(c => c.customer_name).join(',');
                const oldClientOrder = originalRecipe.clientes.map(c => c.customer_name).join(',');
                return newClientOrder !== oldClientOrder;
              }
              return false;
            });
          }
          return false;
        });

        if (clientOrderChanged) {
          setEditableBlocks(blocksWithCustomerOrder);
        }
      }

      // Atualizar ref com ordem atual
      currentBlockOrderRef.current = currentOrder;
    }
  }, [editableBlocks, savePageOrder, applyCustomerOrderToConsolidatedBlocks]);

  // Aplicar edições aos blocos quando initialBlocks ou editState mudarem
  useEffect(() => {
    if (initialBlocks.length === 0) return;

    // CORREÇÃO: Preservar a ordem atual dos blocos se houver
    let blocksToUse = initialBlocks;
    if (currentBlockOrderRef.current.length > 0 && editableBlocks.length > 0) {
      // Reordenar initialBlocks de acordo com a ordem atual
      const orderedInitialBlocks = currentBlockOrderRef.current
        .map(id => initialBlocks.find(b => b.id === id))
        .filter(Boolean);

      // Adicionar blocos novos que não estavam na ordem anterior
      const newBlocks = initialBlocks.filter(b => !currentBlockOrderRef.current.includes(b.id));
      blocksToUse = [...orderedInitialBlocks, ...newBlocks];
    }

    if (Object.keys(editState).length > 0) {
      const blocksWithEdits = applyEditsToBlocks(blocksToUse, editState);
      // CORREÇÃO: Garantir ordem das categorias após aplicar edições
      const orderedBlocks = ensureCategoryOrderInBlocks(blocksWithEdits);
      // Aplicar ordem customizada das categorias
      const blocksWithCategoryOrder = applyOrderToBlocks(orderedBlocks);
      // Aplicar ordem dos clientes aos blocos consolidados
      const finalBlocks = applyCustomerOrderToConsolidatedBlocks(blocksWithCategoryOrder);
      setEditableBlocks(finalBlocks);
    } else {
      // Aplicar ordem customizada das categorias
      const blocksWithCategoryOrder = applyOrderToBlocks(blocksToUse);
      // Aplicar ordem dos clientes aos blocos consolidados
      const finalBlocks = applyCustomerOrderToConsolidatedBlocks(blocksWithCategoryOrder);
      setEditableBlocks(finalBlocks);
    }
  }, [initialBlocks, editState, applyEditsToBlocks, applyOrderToBlocks, applyCustomerOrderToConsolidatedBlocks]);

  // Reagir a mudanças na ordem das categorias
  useEffect(() => {
    if (editableBlocks.length > 0) {
      const reorderedBlocks = applyOrderToBlocks(editableBlocks);
      // Verificar se realmente houve mudança para evitar loop infinito
      const changed = reorderedBlocks.some((block, idx) => {
        if (block.type === 'empresa' && block.items && editableBlocks[idx]?.items) {
          const newKeys = Object.keys(block.items).join(',');
          const oldKeys = Object.keys(editableBlocks[idx].items).join(',');
          return newKeys !== oldKeys;
        }
        return false;
      });

      if (changed) {
        setEditableBlocks(reorderedBlocks);
      }
    }
  }, [categoryOrder]);

  // Forçar sincronização de edições (reaplica todas as edições salvas aos blocos)
  const handleForceSyncEdits = useCallback(() => {
    if (Object.keys(editState).length === 0) {
      return;
    }

    // CORREÇÃO: Preservar a ordem atual dos blocos
    let blocksToUse = initialBlocks;
    if (currentBlockOrderRef.current.length > 0) {
      const orderedInitialBlocks = currentBlockOrderRef.current
        .map(id => initialBlocks.find(b => b.id === id))
        .filter(Boolean);
      const newBlocks = initialBlocks.filter(b => !currentBlockOrderRef.current.includes(b.id));
      blocksToUse = [...orderedInitialBlocks, ...newBlocks];
    }

    // Reaplicar edições aos blocos
    const syncedBlocks = applyEditsToBlocks(blocksToUse, editState);
    // CORREÇÃO: Garantir ordem das categorias após sincronização
    const orderedBlocks = ensureCategoryOrderInBlocks(syncedBlocks);
    setEditableBlocks(orderedBlocks);
  }, [editState, initialBlocks, applyEditsToBlocks]);

  // Limpar todas as edições salvas (localStorage + Firebase)
  const handleClearAllEdits = useCallback(async () => {
    await clearAllEdits(weekDayKey);
    setEditState({});

    // CORREÇÃO: Preservar a ordem atual dos blocos ao limpar edições
    let blocksToUse = initialBlocks;
    if (currentBlockOrderRef.current.length > 0) {
      const orderedInitialBlocks = currentBlockOrderRef.current
        .map(id => initialBlocks.find(b => b.id === id))
        .filter(Boolean);
      const newBlocks = initialBlocks.filter(b => !currentBlockOrderRef.current.includes(b.id));
      blocksToUse = [...orderedInitialBlocks, ...newBlocks];
    }

    setEditableBlocks(blocksToUse);
  }, [initialBlocks, weekDayKey]);

  const handleItemEdit = useCallback(async (itemName, clientName, originalValue, editedValue, field = 'content', blockTitle = null) => {
    // CORREÇÃO: Para blocos empresa, usar blockTitle como customerName
    // Isso garante que a edição seja salva para o cliente correto (ex: "Faap")
    // ao invés de "sem_cliente"
    const normalizedClientName = blockTitle || clientName || 'sem_cliente';

    // CORREÇÃO SEMÁFORO: Buscar valor ORIGINAL do Firebase (não da tela)
    // A tela pode mostrar valor editado anterior, mas precisamos do Firebase original
    let firebaseQty = null;
    if (field === 'quantity') {
      // BUSCAR EM BLOCOS EMPRESA
      const empresaBlock = initialBlocks.find(block =>
        block.type === 'empresa' && block.title === normalizedClientName
      );

      if (empresaBlock && empresaBlock.items) {
        // Procurar item nos blocos empresa
        for (const category of Object.values(empresaBlock.items)) {
          const item = category.find(i => i.recipe_name === itemName);
          if (item) {
            firebaseQty = item.quantity;
            break;
          }
        }
      }

      // BUSCAR EM BLOCOS CONSOLIDADOS (se não encontrou em empresa)
      if (firebaseQty === null) {
        for (const block of initialBlocks) {
          if (block.type === 'detailed-section' || block.type === 'embalagem-category') {
            if (block.items && Array.isArray(block.items)) {
              // block.items = [{ recipe_name, clientes: [{customer_name, quantity}] }]
              for (const recipeItem of block.items) {
                if (recipeItem.recipe_name === itemName) {
                  const cliente = recipeItem.clientes.find(c => c.customer_name === normalizedClientName);
                  if (cliente) {
                    firebaseQty = cliente.quantity;
                    break;
                  }
                }
              }
              if (firebaseQty !== null) break;
            }
          }
        }
      }
    }

    // SEMÁFORO + FIREBASE SYNC: Salvar com hash do Firebase ORIGINAL
    const newEdits = await saveEdit(normalizedClientName, itemName, editedValue, field, firebaseQty, weekDayKey);
    setEditState(newEdits);

    // O sistema de semáforo (applyEditsToBlocks) vai aplicar a edição automaticamente
    // via useEffect que observa editState. Não precisamos atualizar manualmente aqui.
  }, [initialBlocks, weekDayKey]);

  const handlePrintFinal = useCallback(() => {
    if (!Array.isArray(editableBlocks)) {
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

  // Processar blocos (sem processamento de conflitos - sistema simplificado)
  const processedBlocks = useMemo(() => {
    return Array.isArray(editableBlocks) ? editableBlocks : [];
  }, [editableBlocks]);

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

          {/* Indicador de edições manuais */}
          {Object.keys(editState).length > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">
              📝 {Object.keys(editState).length} {Object.keys(editState).length === 1 ? 'edição' : 'edições'}
            </span>
          )}

          {/* Botão para limpar edições */}
          {Object.keys(editState).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllEdits}
              title="Limpar edições: remover todas as edições salvas e voltar aos valores originais"
              className="h-6 px-2 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar Edições
            </Button>
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
        <SidebarNavigation
          blocks={processedBlocks}
          selectedBlock={selectedBlock}
          blockStatus={blockStatus}
          draggedIndex={draggedIndex}
          // Handlers de blocos
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleDragEnd={handleDragEnd}
          scrollToBlock={scrollToBlock}
          handleFixBlock={handleFixBlock}
          // Props de categorias
          categoryOrder={categoryOrder}
          draggedCategoryIndex={draggedCategoryIndex}
          handleCategoryDragStart={handleCategoryDragStart}
          handleCategoryDragOver={handleCategoryDragOver}
          handleCategoryDrop={handleCategoryDrop}
          handleCategoryDragEnd={handleCategoryDragEnd}
          extractCategoriesFromBlocks={extractCategoriesFromBlocks}
          // Estados de expansão
          expandedSections={expandedSections}
          toggleSection={toggleSection}
        />

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
