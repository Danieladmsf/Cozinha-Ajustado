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
// Removido: createEditKey do sistema antigo
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
  getItemDisplayInfo
} from './utils';

// NOVO: Sistema simplificado de edições
import {
  saveEdit,
  getEdit,
  getAllEditsForRecipe,
  getAllEditsForCustomer,
  loadAllEdits,
  clearAllEdits,
  getEditsSummary,
  migrateFromOldSystem
} from './utils/simpleEditManager';

export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo, formatQuantityDisplay, consolidateCustomerItems, recipes, originalOrders } = data;

  console.log('[PrintPreviewEditor] 🚀 VERSÃO ATUALIZADA v3.0 - ESTRUTURA CORRIGIDA - Componente montado', {
    hasOriginalOrders: !!originalOrders,
    ordersLength: originalOrders?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Simplificar: usar useState ao invés de useReducer
  const [editableBlocks, setEditableBlocks] = useState([]);
  const [zoom, setZoom] = useState(50);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const previewAreaRef = useRef(null);

  // Estados para gerenciamento de edições e conflitos
  // NOVO: Estado simplificado - carrega do novo sistema
  const [editState, setEditState] = useState(() => {
    // Migrar automaticamente do sistema antigo se necessário
    migrateFromOldSystem();
    const edits = loadAllEdits();

    // Mostrar resumo das edições carregadas
    const summary = getEditsSummary();
    if (summary.totalEdits > 0) {
      console.log('[PrintPreviewEditor] 📊 Edições carregadas (sistema simplificado):', summary);
    }

    return edits;
  });
  const [portalUpdates, setPortalUpdates] = useState({});
  const [resolvedConflicts, setResolvedConflicts] = useState({});
  const [isLoadingState, setIsLoadingState] = useState(false);

  // Refs para controle de inicialização
  const hasInitializedRef = useRef(false);
  const canSaveToLocalStorageRef = useRef(false);
  const initialOrdersSnapshotRef = useRef(null);

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

  // REMOVIDO: useEffect de carregamento do sistema antigo
  // O novo sistema carrega automaticamente no useState inicial (linhas 62-75)
  useEffect(() => {
    // Desabilitar salvamento durante carregamento
    canSaveToLocalStorageRef.current = false;
    setIsLoadingState(true);

    console.log('[PrintPreviewEditor] ✅ Sistema simplificado carregado no estado inicial');

    // Nenhuma edição ou snapshot antigo para carregar - já carregado no useState
    const edits = {}; // Vazio porque novo sistema já carregou
    const portal = {};
    const resolved = {};
    const snapshot = null;

    // Atualizar todos os estados de uma vez (mantido para compatibilidade)
    setEditState(edits);
    setPortalUpdates(portal);
    setResolvedConflicts(resolved);

    // Restaurar snapshot se existir (salvo anteriormente)
    // CORREÇÃO: Validar se snapshot tem estrutura correta (keys devem ter recipe_name definido)
    if (snapshot) {
      const firstKey = Object.keys(snapshot)[0];
      const firstItem = snapshot[firstKey];

      if (firstItem && firstItem.recipe_name && firstItem.recipe_name !== 'undefined') {
        initialOrdersSnapshotRef.current = snapshot;
        console.log('[PrintPreviewEditor] 📸 Snapshot restaurado do localStorage');
      } else {
        console.log('[PrintPreviewEditor] ⚠️ Snapshot inválido detectado, será recriado');
        initialOrdersSnapshotRef.current = null;
      }
    }

    // Marcar que terminou de carregar APÓS estados serem definidos
    // Usar requestAnimationFrame para garantir que React atualizou
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsLoadingState(false);
        console.log('[PrintPreviewEditor] ✅ Estado carregado completamente');

        // Habilitar salvamento após um delay
        setTimeout(() => {
          canSaveToLocalStorageRef.current = true;
          console.log('[PrintPreviewEditor] 💾 Salvamento habilitado');
        }, 300);
      });
    });
  }, [weekNumber, year]);

  // TESTE MOVIDO PARA CÁ
  useEffect(() => {
    console.log('[PrintPreviewEditor] ✅✅✅ TEST useEffect MOVIDO executou!');
  }, []);

  // ========== NOVOS USEEFFECTS PARA SNAPSHOT E PORTAL ===========

  // Criar snapshot inicial de todos os pedidos para detectar mudanças do portal
  useEffect(() => {
    console.log('[PrintPreviewEditor] 🔍 V3 useEffect SNAPSHOT executando:', {
      hasSnapshot: !!initialOrdersSnapshotRef.current,
      hasOriginalOrders: !!originalOrders,
      ordersLength: originalOrders?.length || 0
    });

    // Só criar snapshot uma vez, quando os dados carregam pela primeira vez
    if (!initialOrdersSnapshotRef.current && originalOrders && originalOrders.length > 0) {
      console.log('[PrintPreviewEditor] 📸 Criando snapshot inicial dos pedidos:', {
        countOrders: originalOrders.length
      });

      // Criar mapa de pedidos: "recipeName::customerName" -> { quantity, unit }
      // CORREÇÃO: originalOrders é array de pedidos, cada um com array de items
      const snapshot = {};
      originalOrders.forEach(order => {
        const customerName = order.customer_name || 'sem_cliente';

        // Iterar sobre os items dentro de cada pedido
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const key = `${item.recipe_name}::${customerName}`;
            snapshot[key] = {
              quantity: parseFloat(item.quantity) || 0,
              unit: item.unit || item.unit_type,
              recipe_name: item.recipe_name,
              customer_name: customerName
            };
          });
        }
      });

      initialOrdersSnapshotRef.current = snapshot;
      console.log('[PrintPreviewEditor] ✅ Snapshot criado com', Object.keys(snapshot).length, 'itens');
    }
  }, [originalOrders]);

  // CORREÇÃO BUG #2: Detectar mudanças do portal comparando TODOS os pedidos com snapshot inicial
  useEffect(() => {
    console.log('[PrintPreviewEditor] 🔍 V3 useEffect detectar portal:', {
      isLoadingState,
      hasOriginalOrders: !!originalOrders,
      ordersLength: originalOrders?.length || 0,
      hasSnapshot: !!initialOrdersSnapshotRef.current,
      snapshotSize: initialOrdersSnapshotRef.current ? Object.keys(initialOrdersSnapshotRef.current).length : 0
    });

    // Não processar durante carregamento ou sem dados ou sem snapshot
    if (isLoadingState || !originalOrders || originalOrders.length === 0 || !initialOrdersSnapshotRef.current) {
      console.log('[PrintPreviewEditor] ⏸️ Pulando detecção (carregando ou sem dados)');
      return;
    }

    console.log('[PrintPreviewEditor] 🔄 Comparando TODOS os pedidos atuais com snapshot inicial...');
    const newPortalUpdates = {};

    // CORREÇÃO: originalOrders é array de pedidos, cada um com array de items
    let totalItemsCompared = 0;
    originalOrders.forEach(order => {
      const customerName = order.customer_name || 'sem_cliente';

      // Iterar sobre os items dentro de cada pedido
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          totalItemsCompared++;
          const key = `${item.recipe_name}::${customerName}`;
          const snapshotItem = initialOrdersSnapshotRef.current[key];
          const currentQty = parseFloat(item.quantity) || 0;

          console.log(`[PrintPreviewEditor] 🔎 Comparando item ${totalItemsCompared}:`, {
            key,
            currentQty,
            snapshotQty: snapshotItem?.quantity || 'NÃO EXISTE NO SNAPSHOT',
            hasSnapshot: !!snapshotItem
          });

          if (snapshotItem) {
            const snapshotQty = snapshotItem.quantity;

            // Detectar mudança
            if (snapshotQty !== currentQty) {
              console.log('[PrintPreviewEditor] 🌐 Mudança do portal detectada:', {
                key,
                snapshotQty,
                currentQty,
                recipe: item.recipe_name,
                customer: customerName,
                difference: currentQty - snapshotQty
              });

              newPortalUpdates[key] = {
                itemKey: key,
                previousQuantity: snapshotQty,
                currentQuantity: currentQty,
                previousUnit: snapshotItem.unit,
                currentUnit: item.unit || item.unit_type,
                detectedAt: new Date().toISOString(),
                type: 'portal_update'
              };
            }
          } else {
            console.log('[PrintPreviewEditor] ⚠️ Item novo detectado (não estava no snapshot):', key);
          }
        });
      }
    });

    // Atualizar estado de mudanças do portal se houver
    if (Object.keys(newPortalUpdates).length > 0) {
      console.log('[PrintPreviewEditor] ✅ Atualizando portalUpdates:', {
        count: Object.keys(newPortalUpdates).length,
        keys: Object.keys(newPortalUpdates),
        details: newPortalUpdates
      });
      setPortalUpdates(prev => ({
        ...prev,
        ...newPortalUpdates
      }));
    } else {
      console.log('[PrintPreviewEditor] ℹ️ Nenhuma mudança detectada no portal');
    }
  }, [originalOrders, isLoadingState]);

  // ========== FIM DOS NOVOS USEEFFECTS ===========

  // REMOVIDO: Sistema antigo de salvamento
  // O novo sistema (simpleEditManager) salva automaticamente em cada operação
  // Mantendo apenas para debug
  useEffect(() => {
    if (isLoadingState) return;

    console.log('[PrintPreviewEditor] 📊 Estado atual (sistema simplificado):', {
      totalCustomers: Object.keys(editState).length,
      totalEdits: Object.values(editState).reduce((sum, recipes) => sum + Object.keys(recipes).length, 0)
    });
  }, [editState, isLoadingState]);

  // Funções dummy para compatibilidade (Firebase desabilitado para evitar loop infinito)
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

  // CORREÇÃO BUG #3: Implementar sistema de resolução de conflitos
  // Usar os estados editState e portalUpdates para detectar e resolver conflitos

  // Detectar se um item mudou no portal (aceita recipeName e customerName OU itemKey diretamente)
  const isItemChanged = useCallback((recipeNameOrKey, customerName = null) => {
    // Se recebeu dois parâmetros, construir a chave
    const key = customerName !== null
      ? `${recipeNameOrKey}::${customerName || 'sem_cliente'}`
      : recipeNameOrKey;

    return !!portalUpdates[key];
  }, [portalUpdates]);

  // Obter informações da mudança do portal
  const getItemChangeInfo = useCallback((recipeNameOrKey, customerName = null) => {
    // Se recebeu dois parâmetros, construir a chave
    const key = customerName !== null
      ? `${recipeNameOrKey}::${customerName || 'sem_cliente'}`
      : recipeNameOrKey;

    return portalUpdates[key] || null;
  }, [portalUpdates]);

  const getResolutionStatus = useCallback((itemKey) => {
    return resolvedConflicts[itemKey] || null;
  }, [resolvedConflicts]);

  // Aceitar mudança do portal (usar valor do portal)
  const handleAcceptPortalChange = useCallback((itemKey) => {
    console.log('[PrintPreviewEditor] ✅ Aceitando mudança do portal:', itemKey);

    const portalUpdate = portalUpdates[itemKey];
    if (!portalUpdate) {
      console.warn('[PrintPreviewEditor] Nenhuma mudança do portal encontrada para:', itemKey);
      return;
    }

    // Marcar conflito como resolvido (aceito)
    setResolvedConflicts(prev => ({
      ...prev,
      [itemKey]: {
        resolution: 'accepted',
        timestamp: new Date().toISOString(),
        portalValue: portalUpdate.currentQuantity,
        editedValue: editState[itemKey]?.editedValue
      }
    }));

    // Remover edição manual se existir (portal prevalece)
    setEditState(prev => {
      const newState = { ...prev };
      delete newState[itemKey];
      return newState;
    });

    // Atualizar blocos para refletir valor do portal
    setEditableBlocks(prevBlocks => {
      return prevBlocks.map(block => {
        const updatedBlock = { ...block };
        let modified = false;

        // Parse da chave para extrair informações
        const [blockTitle, recipeName, customerName] = itemKey.includes('::')
          ? itemKey.split('::')
          : [null, itemKey.split('::')[0], itemKey.split('::')[1]];

        if (updatedBlock.type === 'empresa' && updatedBlock.items) {
          const newItems = {};
          Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
            newItems[category] = categoryItems.map(item => {
              if (item.recipe_name === recipeName &&
                  (item.customer_name || 'sem_cliente') === customerName) {
                modified = true;
                return { ...item, quantity: portalUpdate.currentQuantity };
              }
              return item;
            });
          });
          if (modified) updatedBlock.items = newItems;
        }

        return updatedBlock;
      });
    });

    console.log('[PrintPreviewEditor] ✅ Mudança do portal aceita e aplicada');
  }, [portalUpdates, editState]);

  // Rejeitar mudança do portal (manter edição manual)
  const handleRejectPortalChange = useCallback((itemKey) => {
    console.log('[PrintPreviewEditor] ⛔ Rejeitando mudança do portal (mantendo edição):', itemKey);

    const editRecord = editState[itemKey];
    const portalUpdate = portalUpdates[itemKey];

    // Marcar conflito como resolvido (rejeitado)
    setResolvedConflicts(prev => ({
      ...prev,
      [itemKey]: {
        resolution: 'rejected',
        timestamp: new Date().toISOString(),
        portalValue: portalUpdate?.currentQuantity,
        editedValue: editRecord?.editedValue
      }
    }));

    // Remover atualização do portal (edição manual prevalece)
    setPortalUpdates(prev => {
      const newState = { ...prev };
      delete newState[itemKey];
      return newState;
    });

    console.log('[PrintPreviewEditor] ✅ Mudança do portal rejeitada, edição manual mantida');
  }, [editState, portalUpdates]);

  const handleResetSnapshot = useCallback(() => {
    console.log('[PrintPreviewEditor] 🔄 Resetando snapshot de pedidos');
    initialOrdersSnapshotRef.current = JSON.parse(JSON.stringify(originalOrders));
    setPortalUpdates({});
    setResolvedConflicts({});
  }, [originalOrders]);

  // Compatibilidade com código antigo
  const changedItems = portalUpdates;
  const hasChanges = Object.keys(portalUpdates).length > 0;

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

  // NOVO: Função SIMPLIFICADA para aplicar edições usando sistema hierárquico
  const applyEditsToBlocks = useCallback((blocks, editsState) => {
    if (!Array.isArray(blocks)) {
      console.error('[applyEditsToBlocks] blocks is not an array');
      return [];
    }

    if (!editsState || Object.keys(editsState).length === 0) {
      return blocks;
    }

    console.log('[applyEditsToBlocks] 🆕 Aplicando edições (sistema simplificado):', {
      numBlocks: blocks.length,
      totalCustomers: Object.keys(editsState).length
    });

    return blocks.map(block => {
      const updatedBlock = { ...block };

      // BLOCOS EMPRESA: updatedBlock.title é o nome do cliente
      if (updatedBlock.type === 'empresa' && updatedBlock.items) {
        const customerEdits = editsState[updatedBlock.title]; // Buscar diretamente pelo nome do cliente
        if (!customerEdits) return updatedBlock;

        const newItems = {};
        Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
          newItems[category] = categoryItems.map(item => {
            const editInfo = customerEdits[item.recipe_name]; // Buscar diretamente pelo nome da receita

            if (editInfo && editInfo.field === 'quantity' && editInfo.quantity !== null) {
              console.log('[applyEditsToBlocks] ✏️ Aplicando quantidade (empresa):', {
                bloco: updatedBlock.title,
                item: item.recipe_name,
                oldQty: item.quantity,
                newQty: editInfo.quantity
              });
              return { ...item, quantity: editInfo.quantity };
            }
            return item;
          });
        });
        updatedBlock.items = newItems;
      }

      // BLOCOS CONSOLIDADOS: procurar em todos os clientes
      if ((updatedBlock.type === 'detailed-section' || updatedBlock.type === 'embalagem-category') && updatedBlock.items) {
        updatedBlock.items = updatedBlock.items.map(recipe => {
          const newClientes = recipe.clientes.map(cliente => {
            // Buscar edição para este cliente específico
            const customerEdits = editsState[cliente.customer_name];
            if (!customerEdits) return cliente;

            const editInfo = customerEdits[recipe.recipe_name];

            if (editInfo && editInfo.field === 'quantity' && editInfo.quantity !== null) {
              console.log('[applyEditsToBlocks] ✏️ Aplicando quantidade (consolidado):', {
                blockType: updatedBlock.type,
                blockTitle: updatedBlock.title,
                recipe: recipe.recipe_name,
                cliente: cliente.customer_name,
                oldQty: cliente.quantity,
                newQty: editInfo.quantity
              });
              return { ...cliente, quantity: editInfo.quantity };
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
  // CORREÇÃO BUG #1: Remover condição editableBlocks.length === 0 para permitir reaplicação
  useEffect(() => {
    // Não fazer nada durante carregamento de estado
    if (isLoadingState) {
      console.log('[PrintPreviewEditor] Aguardando fim do carregamento de estado...');
      return;
    }

    // Se não há blocos iniciais, não fazer nada
    if (initialBlocks.length === 0) {
      console.log('[PrintPreviewEditor] Sem blocos iniciais ainda');
      return;
    }

    console.log('[PrintPreviewEditor] 🔄 Aplicando/Reaplicando blocos e edições:', {
      numBlocks: initialBlocks.length,
      numEdits: Object.keys(editState).length,
      editKeys: Object.keys(editState),
      editStatePreview: editState
    });

    // SEMPRE aplicar edições aos blocos iniciais (mesmo que editableBlocks já tenha conteúdo)
    // Isso garante que após reload, as edições salvas sejam reaplicadas
    if (Object.keys(editState).length > 0) {
      console.log('[PrintPreviewEditor] 📝 Aplicando edições:', editState);
      const blocksWithEdits = applyEditsToBlocks(initialBlocks, editState);
      console.log('[PrintPreviewEditor] ✅ Aplicando', Object.keys(editState).length, 'edições aos blocos');
      setEditableBlocks(blocksWithEdits);
    } else {
      console.log('[PrintPreviewEditor] ⚪ Sem edições, usando blocos originais');
      setEditableBlocks(initialBlocks);
    }
  }, [initialBlocks, editState, applyEditsToBlocks, isLoadingState]);

  // Forçar sincronização de edições (reaplica todas as edições salvas aos blocos)
  const handleForceSyncEdits = useCallback(() => {
    console.log('[PrintPreviewEditor] 🔄 Forçando sincronização de edições...');
    console.log('[PrintPreviewEditor] 📋 Edições atuais:', editState);

    if (Object.keys(editState).length === 0) {
      console.log('[PrintPreviewEditor] ⚠️ Nenhuma edição para sincronizar');
      return;
    }

    // Reaplicar edições aos blocos iniciais
    const syncedBlocks = applyEditsToBlocks(initialBlocks, editState);
    console.log('[PrintPreviewEditor] ✅ Sincronização concluída, aplicando blocos atualizados');
    setEditableBlocks(syncedBlocks);
  }, [editState, initialBlocks, applyEditsToBlocks]);

  // Limpar todas as edições salvas
  const handleClearAllEdits = useCallback(() => {
    console.log('[PrintPreviewEditor] 🗑️ Limpando todas as edições (novo sistema)...');
    clearAllEdits(); // Novo sistema
    setEditState({});
    setEditableBlocks(initialBlocks);
    console.log('[PrintPreviewEditor] ✅ Todas as edições foram removidas');
  }, [initialBlocks]);

  const handleItemEdit = useCallback((itemName, clientName, originalValue, editedValue, field = 'content', blockTitle = null) => {
    const normalizedClientName = clientName || 'sem_cliente';

    console.log('[PrintPreviewEditor] 📝 NOVA EDIÇÃO (sistema simplificado):', {
      recipeName: itemName,
      customerName: normalizedClientName,
      originalValue,
      editedValue,
      field
    });

    // NOVO: Salvar usando sistema simplificado
    const newEdits = saveEdit(normalizedClientName, itemName, editedValue, field);
    setEditState(newEdits);

    // Chamar markItemAsEdited original (Firebase - quando reabilitado)
    // markItemAsEdited(itemName, originalValue, editedValue, field);

    // NOVO: Atualização SIMPLIFICADA - propaga para todos os blocos que contenham a receita do cliente
    setEditableBlocks(prevBlocks => {
      if (!Array.isArray(prevBlocks)) {
        console.error('editableBlocks is not an array in handleItemEdit');
        return prevBlocks;
      }

      const updatedBlocks = prevBlocks.map(block => {
        let modified = false;
        const updatedBlock = { ...block };

        // BLOCOS EMPRESA: aplicar se bloco.title === customerName E contém a receita
        if (updatedBlock.type === 'empresa' && updatedBlock.title === normalizedClientName && updatedBlock.items) {
          const newItems = {};
          Object.entries(updatedBlock.items).forEach(([category, categoryItems]) => {
            newItems[category] = categoryItems.map(item => {
              if (item.recipe_name === itemName && field === 'quantity') {
                modified = true;
                const numMatch = editedValue.match(/[\d.,]+/);
                if (numMatch) {
                  console.log('[handleItemEdit] 🔄 Atualizando bloco empresa:', {
                    block: updatedBlock.title,
                    recipe: itemName,
                    quantity: parseFloat(numMatch[0].replace(',', '.'))
                  });
                  return { ...item, quantity: parseFloat(numMatch[0].replace(',', '.')) };
                }
              }
              return item;
            });
          });
          if (modified) {
            updatedBlock.items = newItems;
            return reorganizeBlockItems(updatedBlock);
          }
        }

        // BLOCOS CONSOLIDADOS: aplicar se contém cliente === customerName E receita
        if ((updatedBlock.type === 'detailed-section' || updatedBlock.type === 'embalagem-category') && updatedBlock.items) {
          updatedBlock.items = updatedBlock.items.map(recipe => {
            if (recipe.recipe_name === itemName && recipe.clientes) {
              const newClientes = recipe.clientes.map(cliente => {
                if (cliente.customer_name === normalizedClientName && field === 'quantity') {
                  modified = true;
                  const numMatch = editedValue.match(/[\d.,]+/);
                  if (numMatch) {
                    console.log('[handleItemEdit] 🔄 Atualizando bloco consolidado:', {
                      blockType: updatedBlock.type,
                      blockTitle: updatedBlock.title,
                      recipe: itemName,
                      cliente: normalizedClientName,
                      quantity: parseFloat(numMatch[0].replace(',', '.'))
                    });
                    return { ...cliente, quantity: parseFloat(numMatch[0].replace(',', '.')) };
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

      // Log final
      const modifiedBlocks = updatedBlocks.filter((block, idx) => {
        const original = prevBlocks[idx];
        return JSON.stringify(block) !== JSON.stringify(original);
      });

      if (modifiedBlocks.length > 0) {
        console.log('[handleItemEdit] 🔗 SINCRONIZAÇÃO COMPLETA (novo sistema):', {
          recipe: itemName,
          customer: normalizedClientName,
          blocksModified: modifiedBlocks.length,
          blocks: modifiedBlocks.map(b => `${b.type}:${b.title}`)
        });
      }

      return updatedBlocks;
    });
  }, []);

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

          {/* NOVO: Indicadores de estado de edições e conflitos */}
          {Object.keys(editState).length > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-semibold">
              📝 {Object.keys(editState).length} {Object.keys(editState).length === 1 ? 'edição' : 'edições'}
            </span>
          )}
          {Object.keys(portalUpdates).length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
              🌐 {Object.keys(portalUpdates).length} {Object.keys(portalUpdates).length === 1 ? 'atualização' : 'atualizações'} do portal
            </span>
          )}
          {(() => {
            const conflicts = Object.keys(editState).filter(key => portalUpdates[key] && !resolvedConflicts[key]);
            return conflicts.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold animate-pulse">
                ⚠️ {conflicts.length} {conflicts.length === 1 ? 'conflito' : 'conflitos'}
              </span>
            );
          })()}

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

          {/* NOVO: Painel de Debug */}
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">🔍 Debug</summary>
            <div className="absolute top-12 left-0 bg-white border border-gray-300 rounded shadow-lg p-3 z-50 max-w-md text-left">
              <div className="font-bold mb-2 text-green-700">🆕 Sistema Simplificado:</div>
              <div className="space-y-1 text-xs font-mono mb-3">
                <div className="font-semibold">📝 Edições por Cliente:</div>
                {Object.keys(editState).length > 0 ? (
                  Object.entries(editState).map(([customerName, recipes]) => (
                    <div key={customerName} className="pl-4">
                      <div className="font-semibold text-blue-700">{customerName}:</div>
                      {Object.entries(recipes).map(([recipeName, editData]) => (
                        <div key={recipeName} className="pl-4 text-gray-600">
                          • {recipeName}: {editData.value}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="pl-4 text-gray-500 italic">Nenhuma edição</div>
                )}
                <div className="mt-2 pt-2 border-t">
                  📊 Total: {(() => {
                    let total = 0;
                    Object.values(editState).forEach(recipes => {
                      total += Object.keys(recipes).length;
                    });
                    return total;
                  })()} edições em {Object.keys(editState).length} clientes
                </div>
              </div>
              <div className="space-y-1 text-xs font-mono border-t pt-2">
                <div className="font-semibold">Sistema Legado:</div>
                <div>🌐 Portal Updates: {Object.keys(portalUpdates).length}</div>
                <div>✅ Resolvidos: {Object.keys(resolvedConflicts).length}</div>
                <div>📦 Blocos: {Array.isArray(editableBlocks) ? editableBlocks.length : 0}</div>
              </div>
            </div>
          </details>

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
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceSyncEdits}
                title="Forçar sincronização: reaplicar todas as edições salvas aos blocos"
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Forçar Sincronização
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAllEdits}
                title="Limpar edições: remover todas as edições salvas e voltar aos valores originais"
                className="h-6 px-2 text-xs bg-red-50 hover:bg-red-100 text-red-700"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar Edições
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
