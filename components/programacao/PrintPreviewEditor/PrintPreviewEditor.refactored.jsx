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
import { Printer, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Save, Edit3, Maximize2, RefreshCw, GripVertical, Download, Users, Lock, AlertTriangle, Cloud, CheckCircle, ArrowLeft, Calendar } from "lucide-react";
import { format, addDays } from "date-fns";
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

/**
 * Função helper para criar blocos consolidados (Salada, Açougue, Embalagem)
 * Elimina duplicação de código entre diferentes tipos de blocos
 */
function createConsolidatedItems(data, showTotal = false) {
  const items = [];

  Object.entries(data).forEach(([recipeName, clientes]) => {
    const clientesList = [];

    Object.entries(clientes).forEach(([customerName, clienteData]) => {
      // Extrair notas do primeiro item (todas são iguais para o mesmo cliente/receita)
      const notes = clienteData.items?.[0]?.notes || '';

      clientesList.push({
        customer_name: customerName,
        quantity: clienteData.quantity,
        unit_type: clienteData.unitType,
        notes: notes
      });
    });

    const item = {
      recipe_name: recipeName,
      clientes: clientesList,
      showTotal: showTotal
    };

    // Calcular total se necessário
    if (showTotal && clientesList.length > 0) {
      const totalResult = calculateTotalByUnitType(clientesList);
      item.total = totalResult.numericTotal;
      item.totalFormatted = totalResult.formatted;
      item.unit_type = clientesList[0]?.unit_type || '';
    }

    items.push(item);
  });

  return items;
}

/**
 * Soma quantidades agrupando por tipo de unidade (cuba-g, cuba-p, unid., etc.)
 * Se todos são cuba-g, separa inteiros (G) e decimais (P)
 * Retorna total formatado como "X cubas G + Y cubas P"
 */
function calculateTotalByUnitType(clientesList) {
  const totals = {};

  clientesList.forEach(cliente => {
    const unitType = (cliente.unit_type || '').toLowerCase();
    const quantity = cliente.quantity || 0;

    if (!totals[unitType]) {
      totals[unitType] = 0;
    }
    totals[unitType] += quantity;
  });

  // Formatar resultado
  const parts = [];

  // Ordem de prioridade: cuba-g, cuba-p, depois outros
  const orderedTypes = ['cuba-g', 'cuba-p'];
  const otherTypes = Object.keys(totals).filter(t => !orderedTypes.includes(t));

  [...orderedTypes, ...otherTypes].forEach(unitType => {
    if (totals[unitType] && totals[unitType] > 0) {
      const qty = Math.round(totals[unitType] * 100) / 100;

      if (unitType === 'cuba-g') {
        // Separar inteiros (cubas G) e frações (converter para cubas P)
        const integerPart = Math.floor(qty);
        const decimalPart = Math.round((qty - integerPart) * 100) / 100;

        // Cubas G inteiras (parte inteira)
        if (integerPart > 0) {
          parts.push(`${integerPart} ${integerPart === 1 ? 'cuba G' : 'cubas G'}`);
        }

        // Frações convertidas para cubas P (arredondar para cima)
        if (decimalPart > 0) {
          const cubasPDecimal = decimalPart * 2; // 1 cuba G = 2 cubas P
          const cubasP = Math.ceil(cubasPDecimal); // Arredondar para cima

          parts.push(`${cubasP} ${cubasP === 1 ? 'cuba P' : 'cubas P'}`);
        }
      } else if (unitType === 'cuba-p') {
        // Formatar frações para cuba P
        if (qty === 0.5) {
          parts.push('½ cuba P');
        } else if (qty === 1.5) {
          parts.push('1½ cubas P');
        } else if (qty === 2.5) {
          parts.push('2½ cubas P');
        } else {
          parts.push(`${qty} ${qty === 1 ? 'cuba P' : 'cubas P'}`);
        }
      } else if (unitType.includes('unid')) {
        parts.push(`${qty} unid.`);
      } else if (unitType.includes('kg')) {
        parts.push(`${qty} kg`);
      } else if (unitType) {
        parts.push(`${qty} ${unitType}`);
      } else {
        // Sem unidade - provavelmente é número puro (gramas, unidades, etc.)
        parts.push(`${qty}`);
      }
    }
  });

  return {
    formatted: parts.join(' + ') || '0',
    totals,
    // Para compatibilidade, retornar também o total numérico principal
    numericTotal: Object.values(totals).reduce((sum, val) => sum + val, 0)
  };
}

export default function PrintPreviewEditor({
  data,
  weekDays = [],
  selectedDay,
  onDayChange,
  weekNumber,
  year,
  currentDate,
  onWeekNavigate,
  onClose,
  onPrint
}) {
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

  // Ref para rastrear edições locais feitas nesta sessão (para detecção de conflitos)
  const localEditsRef = useRef({});

  // Estado para conflitos: quando há edição local E edição do portal para o mesmo item
  // Persistido no localStorage para sobreviver ao reload
  const [conflicts, setConflicts] = useState(() => {
    try {
      const saved = localStorage.getItem('print_preview_conflicts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  // Estrutura: { "customerName::recipeName": { localEdit: {...}, portalEdit: {...} } }

  // Salvar conflitos no localStorage sempre que mudar
  useEffect(() => {
    try {
      if (Object.keys(conflicts).length > 0) {
        localStorage.setItem('print_preview_conflicts', JSON.stringify(conflicts));
      } else {
        localStorage.removeItem('print_preview_conflicts');
      }
    } catch {
      // Silenciar erro
    }
  }, [conflicts]);

  // Restaurar localEditsRef a partir dos conflitos salvos ao inicializar
  useEffect(() => {
    Object.entries(conflicts).forEach(([conflictKey, conflict]) => {
      if (conflict.localEdit && !localEditsRef.current[conflictKey]) {
        localEditsRef.current[conflictKey] = conflict.localEdit;
      }
    });
  }, []);

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

  // Extrair informações do dia selecionado
  const dayNumber = selectedDayInfo?.dayNumber || 0;

  // Gerar chave única para este dia (para Firebase sync)
  const weekDayKey = useMemo(() => {
    if (!selectedDayInfo) {
      console.log('[PrintPreviewEditor] ⚠️ Sem selectedDayInfo, weekDayKey = null');
      return null;
    }
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const dayName = dayNames[dayNumber] || 'Seg';
    const key = `${year}_W${String(weekNumber).padStart(2, '0')}_${dayName}`;
    console.log('[PrintPreviewEditor] 🔑 weekDayKey gerado:', {
      year,
      weekNumber,
      dayNumber,
      dayName,
      weekDayKey: key
    });
    return key;
  }, [year, weekNumber, dayNumber, selectedDayInfo]);

  // Estado para ordem dos blocos vinda do Firebase
  const [firebaseBlockOrder, setFirebaseBlockOrder] = useState([]);

  // FIREBASE SYNC: Carregar edições e criar listener em tempo real
  useEffect(() => {
    if (!weekDayKey) return;

    // 1. Carregar edições do Firebase ao montar
    loadEditsFromFirebase(weekDayKey).then(firebaseEdits => {
      console.log('[PrintPreviewEditor] 📥 Firebase edições carregadas:', {
        weekDayKey,
        numClientes: Object.keys(firebaseEdits).length,
        clientes: Object.keys(firebaseEdits),
        edits: firebaseEdits
      });
      if (Object.keys(firebaseEdits).length > 0) {
        // CORREÇÃO: Popular localEditsRef com edições locais existentes
        // Isso permite detectar conflitos mesmo após reabrir o editor
        Object.entries(firebaseEdits).forEach(([customerName, recipes]) => {
          Object.entries(recipes).forEach(([recipeName, edit]) => {
            if (edit.userId === 'local-user') {
              const conflictKey = `${customerName}::${recipeName}`;
              localEditsRef.current[conflictKey] = edit;
              console.log('[PrintPreviewEditor] 📝 Edição local restaurada:', {
                item: recipeName,
                cliente: customerName,
                value: edit.value
              });
            }
          });
        });
        setEditState(firebaseEdits);
      }
    });

    // 2. Criar listener em tempo real COM detecção de conflitos
    const unsubscribe = subscribeToEdits(weekDayKey, (firebaseEdits) => {
      console.log('[PrintPreviewEditor] 🔄 Firebase edições atualizadas (listener):', {
        numClientes: Object.keys(firebaseEdits).length,
        clientes: Object.keys(firebaseEdits),
        edits: firebaseEdits
      });

      // CORREÇÃO: Primeiro, atualizar localEditsRef com edições locais do Firebase
      // Isso garante que temos todas as edições locais antes de detectar conflitos
      Object.entries(firebaseEdits).forEach(([customerName, recipes]) => {
        Object.entries(recipes).forEach(([recipeName, edit]) => {
          if (edit.userId === 'local-user') {
            const conflictKey = `${customerName}::${recipeName}`;
            // Só adicionar se não existir (não sobrescrever edições da sessão atual)
            if (!localEditsRef.current[conflictKey]) {
              localEditsRef.current[conflictKey] = edit;
            }
          }
        });
      });

      // Detectar conflitos: portal edit chegou para item com local edit
      const newConflicts = {};
      Object.entries(firebaseEdits).forEach(([customerName, recipes]) => {
        Object.entries(recipes).forEach(([recipeName, edit]) => {
          // Só verificar edições do portal
          if (edit.userId !== 'local-user') {
            const conflictKey = `${customerName}::${recipeName}`;
            const localEdit = localEditsRef.current[conflictKey];

            // Se há edição local para o mesmo item, é conflito
            if (localEdit && localEdit.value !== edit.value) {
              console.log('[PrintPreviewEditor] ⚠️ Conflito detectado:', {
                item: recipeName,
                cliente: customerName,
                localValue: localEdit.value,
                portalValue: edit.value
              });
              newConflicts[conflictKey] = {
                localEdit,
                portalEdit: edit,
                customerName,
                recipeName
              };
            }
          }
        });
      });

      // Atualizar conflitos se houver novos
      if (Object.keys(newConflicts).length > 0) {
        setConflicts(prev => ({ ...prev, ...newConflicts }));
      }

      setEditState(firebaseEdits);
    });

    // Cleanup: remover listener ao desmontar
    return () => {
      unsubscribe();
    };
  }, [weekDayKey]);

  // FIREBASE SYNC: Carregar e sincronizar ordem dos blocos
  useEffect(() => {
    if (!weekDayKey) {
      console.log('[PrintPreviewEditor] ⚠️ useEffect ordem: sem weekDayKey');
      return;
    }

    console.log('[PrintPreviewEditor] 📡 useEffect ordem: iniciando para', weekDayKey);

    // 1. Carregar ordem do Firebase ao montar
    loadBlockOrderFromFirebase(weekDayKey).then(firebaseOrder => {
      console.log('[PrintPreviewEditor] 📥 Firebase ordem carregada:', {
        numBlocks: firebaseOrder.length,
        order: firebaseOrder
      });
      if (firebaseOrder.length > 0) {
        setFirebaseBlockOrder(firebaseOrder);
      }
    });

    // 2. Criar listener em tempo real para ordem
    const unsubscribe = subscribeToBlockOrder(weekDayKey, (firebaseOrder) => {
      console.log('[PrintPreviewEditor] 🔄 Firebase ordem atualizada (listener):', {
        numBlocks: firebaseOrder.length,
        order: firebaseOrder
      });
      setFirebaseBlockOrder(firebaseOrder);
    });

    // Cleanup: remover listener ao desmontar
    return () => {
      console.log('[PrintPreviewEditor] 🧹 Removendo listener de ordem');
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
  // NÃO mostrar verde se há conflito (vermelho prevalece)
  const isItemChanged = useCallback((customerName, recipeName) => {
    const conflictKey = `${customerName}::${recipeName}`;
    if (conflicts[conflictKey]) return false; // Conflito prevalece

    const edit = editState[customerName]?.[recipeName];
    return !!(edit && edit.userId !== 'local-user');
  }, [editState, conflicts]);

  const getItemChangeInfo = useCallback((customerName, recipeName) => {
    const conflictKey = `${customerName}::${recipeName}`;
    if (conflicts[conflictKey]) return null; // Conflito prevalece

    const edit = editState[customerName]?.[recipeName];
    return edit && edit.userId !== 'local-user' ? edit : null;
  }, [editState, conflicts]);

  // Vermelho: conflito (quando há edição local E do portal)
  const getResolutionStatus = useCallback((customerName, recipeName) => {
    const conflictKey = `${customerName}::${recipeName}`;
    return conflicts[conflictKey] || null;
  }, [conflicts]);

  // Handlers para aceitar/rejeitar mudanças do portal
  const handleAcceptPortalChange = useCallback(async (customerName, recipeName) => {
    const conflictKey = `${customerName}::${recipeName}`;
    const conflict = conflicts[conflictKey];

    if (!conflict) return;

    console.log('[PrintPreviewEditor] ✅ Aceitando edição do portal:', {
      item: recipeName,
      cliente: customerName,
      portalValue: conflict.portalEdit.value
    });

    // Remover edição local do tracking
    delete localEditsRef.current[conflictKey];

    // Remover conflito
    setConflicts(prev => {
      const newConflicts = { ...prev };
      delete newConflicts[conflictKey];
      return newConflicts;
    });

    // A edição do portal já está aplicada no editState
  }, [conflicts]);

  const handleRejectPortalChange = useCallback(async (customerName, recipeName) => {
    const conflictKey = `${customerName}::${recipeName}`;
    const conflict = conflicts[conflictKey];

    if (!conflict) return;

    console.log('[PrintPreviewEditor] ❌ Rejeitando edição do portal, mantendo local:', {
      item: recipeName,
      cliente: customerName,
      localValue: conflict.localEdit.value
    });

    // Salvar edição local de volta para sobrescrever a do portal
    const newEdits = await saveEdit(
      customerName,
      recipeName,
      conflict.localEdit.value,
      conflict.localEdit.field,
      conflict.portalEdit.value, // Hash do valor atual (portal)
      weekDayKey
    );

    setEditState(newEdits);

    // Remover conflito (mas manter no localEditsRef)
    setConflicts(prev => {
      const newConflicts = { ...prev };
      delete newConflicts[conflictKey];
      return newConflicts;
    });
  }, [conflicts, weekDayKey]);

  const isLocked = false;

  /**
   * Helper: Aplica lógica de conflitos + semáforo a um item individual
   * Elimina duplicação entre blocos empresa e consolidados
   */
  const applyEditToItem = useCallback((customerName, recipeName, currentQuantity) => {
    const conflictKey = `${customerName}::${recipeName}`;

    // PRIORIDADE 1: CONFLITO - usar valor local
    if (conflicts[conflictKey]) {
      const localValue = conflicts[conflictKey].localEdit?.quantity;
      if (localValue !== null && localValue !== undefined) {
        return localValue;
      }
    }

    // PRIORIDADE 2: SEMÁFORO - verificar se deve usar edição ou Firebase
    const decision = shouldUseEdit(customerName, recipeName, currentQuantity);
    if (decision && decision.quantity !== null) {
      return decision.quantity;
    }

    // PADRÃO: manter valor atual
    return currentQuantity;
  }, [conflicts]);

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
            const newQuantity = applyEditToItem(
              updatedBlock.title,
              item.recipe_name,
              item.quantity
            );
            return { ...item, quantity: newQuantity };
          });
        });
        // CORREÇÃO: Garantir ordem das categorias após aplicar edições
        updatedBlock.items = sortCategoriesObject(newItems);
      }

      // BLOCOS CONSOLIDADOS: procurar em todos os clientes
      if ((updatedBlock.type === 'detailed-section' || updatedBlock.type === 'embalagem-category') && updatedBlock.items) {
        updatedBlock.items = updatedBlock.items.map(recipe => {
          const newClientes = recipe.clientes.map(cliente => {
            const newQuantity = applyEditToItem(
              cliente.customer_name,
              recipe.recipe_name,
              cliente.quantity
            );
            return { ...cliente, quantity: newQuantity };
          });

          // Recalcular total se necessário (agrupando por tipo de unidade)
          if (recipe.showTotal) {
            const totalResult = calculateTotalByUnitType(newClientes);
            return {
              ...recipe,
              clientes: newClientes,
              total: totalResult.numericTotal,
              totalFormatted: totalResult.formatted
            };
          }

          return { ...recipe, clientes: newClientes };
        });
      }

      return updatedBlock;
    });
  }, [conflicts, applyEditToItem]);

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
      const saladaItems = createConsolidatedItems(saladaData, false); // false = não mostrar total
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
      const acougueItems = createConsolidatedItems(acougueData, true); // true = mostrar total
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
          // Adicionar a receita à categoria correta
          if (!categorias[targetCategory]) {
            categorias[targetCategory] = {};
          }
          categorias[targetCategory][recipeName] = clientes;
        }
      });

      // Criar um bloco para cada categoria que tem itens
      Object.entries(categorias).forEach(([categoryName, recipesData]) => {
        if (Object.keys(recipesData).length > 0) {
          const itemsList = createConsolidatedItems(recipesData, true); // true = mostrar total
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

    console.log('[initialBlocks] 📋 Definindo ordem dos blocos:', {
      firebaseOrder: firebaseBlockOrder.length,
      localOrder: localOrder.length,
      usandoFirebase: firebaseBlockOrder.length > 0,
      savedOrder: savedOrder.length
    });

    let orderedBlocks = blocks;

    if (savedOrder.length > 0) {
      // Tentar aplicar ordem salva
      const matchedBlocks = savedOrder.map(id => blocks.find(b => b.id === id)).filter(Boolean);

      console.log('[initialBlocks] 🔗 Matching blocos:', {
        savedOrderIds: savedOrder,
        blocksIds: blocks.map(b => b.id),
        matchedCount: matchedBlocks.length,
        unmatchedInSaved: savedOrder.filter(id => !blocks.find(b => b.id === id))
      });

      // Se a ordem salva corresponde aos blocos, usar ela
      // Caso contrário (IDs antigos), usar ordem padrão e adicionar blocos não encontrados
      if (matchedBlocks.length > 0) {
        // Adicionar blocos que não estavam na ordem salva
        const unmatchedBlocks = blocks.filter(b => !savedOrder.includes(b.id));
        orderedBlocks = [...matchedBlocks, ...unmatchedBlocks];

        console.log('[initialBlocks] ✅ Ordem aplicada:', {
          finalOrder: orderedBlocks.map(b => b.id)
        });
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

    // CORRIGIDO: Usar ordem do initialBlocks (que já vem do Firebase)
    // Não preservar ordem antiga quando Firebase atualiza
    const initialOrder = initialBlocks.map(b => b.id).join(',');
    const currentOrder = currentBlockOrderRef.current.join(',');

    // Se a ordem mudou (Firebase update) ou é primeira carga, usar initialBlocks diretamente
    const isFirebaseUpdate = firebaseBlockOrder.length > 0 && initialOrder !== currentOrder;

    let blocksToUse = initialBlocks;

    // Só preservar ordem antiga se NÃO for update do Firebase
    if (!isFirebaseUpdate && currentBlockOrderRef.current.length > 0 && editableBlocks.length > 0) {
      // Verificar se são os mesmos blocos (não mudou nada além de edições)
      const sameBlocks = currentBlockOrderRef.current.length === initialBlocks.length &&
        currentBlockOrderRef.current.every(id => initialBlocks.find(b => b.id === id));

      if (sameBlocks) {
        // Reordenar initialBlocks de acordo com a ordem atual (preservar drag-drop local)
        const orderedInitialBlocks = currentBlockOrderRef.current
          .map(id => initialBlocks.find(b => b.id === id))
          .filter(Boolean);

        // Adicionar blocos novos que não estavam na ordem anterior
        const newBlocks = initialBlocks.filter(b => !currentBlockOrderRef.current.includes(b.id));
        blocksToUse = [...orderedInitialBlocks, ...newBlocks];
      }
    }

    console.log('[useEffect edições] 🔄 Aplicando blocos:', {
      isFirebaseUpdate,
      initialOrder: initialBlocks.map(b => b.id),
      currentRefOrder: currentBlockOrderRef.current,
      finalOrder: blocksToUse.map(b => b.id)
    });

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
  }, [initialBlocks, editState, applyEditsToBlocks, applyOrderToBlocks, applyCustomerOrderToConsolidatedBlocks, firebaseBlockOrder]);

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

    // Rastrear edição local para detecção de conflitos
    const conflictKey = `${normalizedClientName}::${itemName}`;
    localEditsRef.current[conflictKey] = {
      value: editedValue,
      quantity: editedValue,
      field,
      timestamp: new Date().toISOString(),
      userId: 'local-user',
      firebaseValueHash: firebaseQty !== null ? `num:${firebaseQty}` : null
    };

    // Remover conflito se existir (usuário está editando manualmente)
    setConflicts(prev => {
      const newConflicts = { ...prev };
      delete newConflicts[conflictKey];
      return newConflicts;
    });

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

  // Calcular total de edições (todas as receitas editadas em todos os clientes)
  const totalEdits = useMemo(() => {
    return Object.values(editState).reduce((total, recipes) => {
      return total + Object.keys(recipes).length;
    }, 0);
  }, [editState]);

  return (
    <div className="print-preview-container">
      {/* Sidebar Navigation - Altura Total com Controles */}
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
          // Props de controle
          onClose={onClose}
          totalEdits={totalEdits}
          handleClearAllEdits={handleClearAllEdits}
          handleDownloadPDF={handleDownloadPDF}
          handlePrintFinal={handlePrintFinal}
          isGeneratingPDF={isGeneratingPDF}
          weekDays={weekDays}
          selectedDay={selectedDay}
          onDayChange={onDayChange}
          weekNumber={weekNumber}
          year={year}
          onWeekNavigate={onWeekNavigate}
        />

      {/* Coluna Direita: Preview Area Completa */}
      <div ref={previewAreaRef} className="preview-area flex-1 overflow-auto" style={{ width: '100%' }}>
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
  );
}
