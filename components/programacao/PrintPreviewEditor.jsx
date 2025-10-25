'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Printer, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Save, Edit3, Maximize2, RefreshCw, GripVertical, Download, Users, Lock, AlertTriangle, Cloud, CheckCircle } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useImpressaoProgramacao } from '@/hooks/programacao/useImpressaoProgramacao';
import './print-preview.css';

// Constantes de tamanho A4 (baseadas em dimensões físicas reais)
// A4: 210mm × 297mm a 96 DPI padrão do navegador
const A4_WIDTH_PX = 794;   // 210mm = 794px
const A4_HEIGHT_PX = 1123;  // 297mm = 1123px
const PAGE_PADDING_PX = 10; // Padding definido em .a4-page (print-preview.css)

// Componente Tooltip para mostrar informações de edição
function Tooltip({ children, content }) {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return children;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-nowrap" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }}>
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45" style={{ bottom: '-4px', left: '50%', marginLeft: '-4px' }}></div>
        </div>
      )}
    </div>
  );
}

// Componente de botões de resolução de conflito
function ConflictButtons({ onAccept, onReject }) {
  return (
    <div className="conflict-buttons no-print" style={{
      display: 'inline-flex',
      gap: '4px',
      marginLeft: '8px',
      verticalAlign: 'middle'
    }}>
      <button
        onClick={onAccept}
        className="conflict-btn accept"
        title="Aceitar mudança do portal"
        style={{
          background: '#9333ea',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        ✓
      </button>
      <button
        onClick={onReject}
        className="conflict-btn reject"
        title="Manter edição manual"
        style={{
          background: '#f97316',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        ✗
      </button>
    </div>
  );
}

// Componente de timestamp para mudanças do portal
function ChangeTimestamp({ timestamp }) {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <span className="change-timestamp no-print" style={{
      fontSize: '0.75em',
      color: '#6b7280',
      marginLeft: '8px',
      fontStyle: 'italic'
    }}>
      ({formattedTime} {formattedDate})
    </span>
  );
}

// Função para formatar nomes de receitas e títulos adicionando espaços
const formatRecipeName = (name) => {
  if (!name) return '';

  // Adiciona espaço antes de letras maiúsculas (camelCase)
  let formatted = name.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Adiciona espaço antes de palavras específicas que ficam concatenadas
  formatted = formatted.replace(/([a-zà-ú])(Assada|Assado|Acebolada|Frita|Cremosa|Ralada|Cozidos)/gi, '$1 $2');

  // Corrige casos específicos conhecidos de receitas
  formatted = formatted.replace(/Molhobarbecue/gi, 'Molho barbecue');
  formatted = formatted.replace(/Panquecade/gi, 'Panqueca de');
  formatted = formatted.replace(/Macarrãomacand/gi, 'Macarrão mac and');
  formatted = formatted.replace(/macand\s*cheese/gi, 'mac and cheese');
  formatted = formatted.replace(/Batatabolinha/gi, 'Batata bolinha');
  formatted = formatted.replace(/bolinha\s*em\s*conserva/gi, 'bolinha em conserva');
  formatted = formatted.replace(/Farofade/gi, 'Farofa de');

  // Corrige nomes de pratos específicos
  formatted = formatted.replace(/Costelinha\s*Assada/gi, 'Costelinha Assada');
  formatted = formatted.replace(/Drumet\s*Assado/gi, 'Drumet Assado');
  formatted = formatted.replace(/Calabresa\s*Acebolada/gi, 'Calabresa Acebolada');
  formatted = formatted.replace(/Polenta\s*Frita/gi, 'Polenta Frita');
  formatted = formatted.replace(/Polenta\s*Cremosa/gi, 'Polenta Cremosa');
  formatted = formatted.replace(/Ovos\s*cozidos/gi, 'Ovos cozidos');

  // Corrige títulos de seções
  formatted = formatted.replace(/Porcionament\s*[oC]arnes/gi, 'Porcionamento Carnes');
  formatted = formatted.replace(/Cenoura\s*Ralada/gi, 'Cenoura Ralada');
  formatted = formatted.replace(/Mixde/gi, 'Mix de');

  return formatted;
};

export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo, formatQuantityDisplay, consolidateCustomerItems, recipes, originalOrders } = data;

  const [editableBlocks, setEditableBlocks] = useState([]);
  const [blockStatus, setBlockStatus] = useState({});
  const [zoom, setZoom] = useState(50); // Zoom inicial reduzido para 50% para visualizar folha inteira
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [hasSavedSizes, setHasSavedSizes] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });
  const previewAreaRef = useRef(null);

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

  // Snapshot inicial dos pedidos (captura ao abrir o editor)
  const initialOrdersRef = useRef(null);
  const [changedItems, setChangedItems] = useState({});
  const [resolvedConflicts, setResolvedConflicts] = useState({}); // { itemKey: 'accepted' | 'rejected' }
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  // Carregar snapshot inicial do Firebase ou criar novo
  useEffect(() => {
    if (!originalOrders) return;

    // Tentar carregar snapshot do localStorage primeiro (persistência local)
    const savedSnapshotKey = `initial-snapshot-${weekNumber}-${year}-${dayNumber}`;
    const savedSnapshot = localStorage.getItem(savedSnapshotKey);

    if (savedSnapshot && !initialOrdersRef.current) {
      // Usar snapshot salvo
      const parsed = JSON.parse(savedSnapshot);
      initialOrdersRef.current = parsed;
      setInitialSnapshot(parsed);
    } else if (!initialOrdersRef.current) {
      // Criar novo snapshot
      const snapshot = {};
      originalOrders.forEach(order => {
        if (!order.items) return;
        order.items.forEach(item => {
          const itemKey = `${item.recipe_name}_${order.customer_name}`;
          snapshot[itemKey] = {
            quantity: item.quantity,
            unit_type: item.unit_type,
            createdAt: new Date().toISOString()
          };
        });
      });
      initialOrdersRef.current = snapshot;
      setInitialSnapshot(snapshot);
      // Salvar no localStorage
      localStorage.setItem(savedSnapshotKey, JSON.stringify(snapshot));
    }
  }, [originalOrders, weekNumber, year, dayNumber]);

  // Detectar mudanças comparando originalOrders atual com snapshot inicial
  useEffect(() => {
    if (!initialOrdersRef.current || !originalOrders) return;

    const changes = {};
    const currentSnapshot = {};

    // Criar snapshot atual
    originalOrders.forEach(order => {
      if (!order.items) return;
      order.items.forEach(item => {
        const itemKey = `${item.recipe_name}_${order.customer_name}`;
        currentSnapshot[itemKey] = {
          quantity: item.quantity,
          unit_type: item.unit_type
        };
      });
    });

    // Comparar com snapshot inicial
    Object.entries(currentSnapshot).forEach(([itemKey, current]) => {
      const initial = initialOrdersRef.current[itemKey];
      if (initial && (initial.quantity !== current.quantity || initial.unit_type !== current.unit_type)) {
        changes[itemKey] = {
          type: 'modified',
          previousQuantity: initial.quantity,
          currentQuantity: current.quantity,
          previousUnit: initial.unit_type,
          currentUnit: current.unit_type,
          detectedAt: new Date().toISOString()
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      setChangedItems(changes);
    }
  }, [originalOrders]);

  // Funções helper
  const isItemChanged = useCallback((itemName, clientName) => {
    const itemKey = `${itemName}_${clientName}`;
    return !!changedItems[itemKey];
  }, [changedItems]);

  const getItemChangeInfo = useCallback((itemName, clientName) => {
    const itemKey = `${itemName}_${clientName}`;
    return changedItems[itemKey] || null;
  }, [changedItems]);

  const hasChanges = Object.keys(changedItems).length > 0;

  // Wrappers para rastrear resolução de conflitos
  const handleAcceptPortalChange = useCallback((itemKey, newValue, portalQuantity, portalUnit) => {
    setResolvedConflicts(prev => ({
      ...prev,
      [itemKey]: {
        status: 'accepted',
        portalValueAtResolution: `${portalQuantity}_${portalUnit}`
      }
    }));

    // Atualizar o item com o novo valor do portal
    if (newValue) {
      markItemAsEdited(itemKey, '', newValue, 'quantity');
    }
  }, [markItemAsEdited]);

  const handleRejectPortalChange = useCallback((itemKey, currentValue) => {
    setResolvedConflicts(prev => ({
      ...prev,
      [itemKey]: {
        status: 'rejected',
        portalValueAtResolution: currentValue
      }
    }));
    rejectPortalChange(itemKey);
  }, [rejectPortalChange]);

  // Helper para obter status de resolução (suporta formato antigo e novo)
  const getResolutionStatus = useCallback((itemKey) => {
    const resolution = resolvedConflicts[itemKey];
    if (!resolution) return null;
    // Formato novo: { status: 'accepted'/'rejected', portalValueAtResolution: '...' }
    if (typeof resolution === 'object' && resolution.status) {
      return resolution.status;
    }
    // Formato antigo: 'accepted' ou 'rejected' (string)
    return resolution;
  }, [resolvedConflicts]);

  // Limpar conflitos resolvidos se o valor do portal mudou novamente
  useEffect(() => {
    if (!changedItems || Object.keys(changedItems).length === 0) return;

    setResolvedConflicts(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      Object.entries(prev).forEach(([itemKey, resolution]) => {
        // Verificar se o valor do portal mudou novamente (tanto para accepted quanto rejected)
        const status = typeof resolution === 'object' ? resolution.status : resolution;
        const changeInfo = changedItems[itemKey];

        if (changeInfo && resolution?.portalValueAtResolution) {
          const currentPortalValue = `${changeInfo.currentQuantity}_${changeInfo.currentUnit}`;

          // Se o valor do portal mudou, limpar resolução (aceito OU rejeitado)
          if (currentPortalValue !== resolution.portalValueAtResolution) {
            delete updated[itemKey];
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [changedItems]);

  // Resetar snapshot (considerar valores atuais como novos valores base)
  const handleResetSnapshot = useCallback(() => {
    if (!originalOrders) return;

    const savedSnapshotKey = `initial-snapshot-${weekNumber}-${year}-${dayNumber}`;

    // Criar novo snapshot com valores atuais
    const snapshot = {};
    originalOrders.forEach(order => {
      if (!order.items) return;
      order.items.forEach(item => {
        const itemKey = `${item.recipe_name}_${order.customer_name}`;
        snapshot[itemKey] = {
          quantity: item.quantity,
          unit_type: item.unit_type,
          createdAt: new Date().toISOString()
        };
      });
    });

    // Atualizar refs e state
    initialOrdersRef.current = snapshot;
    setInitialSnapshot(snapshot);
    setChangedItems({});
    setResolvedConflicts({});

    // Salvar no localStorage
    localStorage.setItem(savedSnapshotKey, JSON.stringify(snapshot));
  }, [originalOrders, weekNumber, year, dayNumber]);


  // Carregar tamanhos salvos do localStorage
  const loadSavedFontSizes = () => {
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
  };

  // Carregar ordem salva do localStorage
  const loadSavedOrder = () => {
    try {
      const saved = localStorage.getItem('print-preview-page-order');
      if (saved) {
        return JSON.parse(saved);
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  // Salvar ordem no localStorage
  const savePageOrder = (blocks) => {
    try {
      const order = blocks.map(block => block.id);
      localStorage.setItem('print-preview-page-order', JSON.stringify(order));
    } catch (error) {
      // Silenciar erro
    }
  };

  // Salvar tamanhos no localStorage
  const saveFontSizes = (blocks) => {
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
  };

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
            const itemKey = `${recipe.recipe_name}_${cliente.customer_name}`;
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

  // Inicializar blocos editáveis
  // Criar blocos iniciais APENAS UMA VEZ na montagem
  // Não recriar quando dados mudarem para preservar edições do usuário
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
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
  }, []); // Rodar apenas uma vez na montagem - não recriar blocos quando dados mudarem

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

  const handleFontSizeChange = (blockId, delta) => {
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, fontSize: Math.max(8, Math.min(30, block.fontSize + delta)) }
          : block
      )
    );
  };

  const handleAutoFit = (blockId) => {
    // Marcar bloco para auto-fit
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, autoFitting: true, autoFitTimestamp: Date.now() }
          : block
      )
    );
  };

  const handleAutoFitComplete = (blockId) => {
    // Limpar flag de auto-fitting
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, autoFitting: false }
          : block
      )
    );
  };

  const handleStatusUpdate = (blockId, isOverflowing, numPages) => {
    setBlockStatus(prev => ({
      ...prev,
      [blockId]: { isOverflowing, numPages }
    }));
  };

  const scrollToBlock = (blockId) => {
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
  };

  const handleFixBlock = (blockId, e) => {
    e.stopPropagation(); // Evitar que o click no badge também acione o click do item

    // Primeiro seleciona o bloco (necessário para o auto-fit funcionar)
    setSelectedBlock(blockId);

    // Navega para o bloco
    scrollToBlock(blockId);

    // Executa o auto-fit após dar tempo para o elemento renderizar e estar pronto
    setTimeout(() => {
      handleAutoFit(blockId);
    }, 600);
  };

  const handleResetFontSizes = () => {
    if (confirm('Deseja resetar todos os tamanhos de fonte e ordem das páginas para os valores padrão?')) {
      localStorage.removeItem('print-preview-font-sizes');
      localStorage.removeItem('print-preview-page-order');
      // Recarregar página para aplicar os padrões
      window.location.reload();
    }
  };

  // Handlers de drag and drop
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
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
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleContentEdit = (blockId, field, value) => {
    setEditableBlocks(blocks =>
      blocks.map(block =>
        block.id === blockId
          ? { ...block, [field]: value }
          : block
      )
    );
  };

  const handleItemEdit = (itemName, clientName, originalValue, editedValue, field = 'content', blockTitle = null) => {
    // Normalizar clientName para corresponder à chave usada na renderização
    const normalizedClientName = clientName || 'sem_cliente';

    // Para blocos tipo 'empresa', incluir blockTitle na chave para evitar colisões
    // entre receitas com mesmo nome em empresas diferentes
    const itemKey = blockTitle
      ? `${blockTitle}_${itemName}_${normalizedClientName}`
      : `${itemName}_${normalizedClientName}`;

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
    const originalZoom = zoom;
    try {
      setIsGeneratingPDF(true);

      // Salvar zoom atual e resetar para 100% para captura precisa
      setZoom(100);

      // Aguardar um momento para o DOM atualizar com zoom 100% e React re-renderizar
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentado de 300ms para 1000ms

      // Criar PDF em orientação portrait A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width em mm
      const pdfHeight = 297; // A4 height em mm

      // Capturar todos os blocos visíveis
      const blockElements = document.querySelectorAll('.a4-page');
      const totalPages = blockElements.length;

      setPdfProgress({ current: 0, total: totalPages });

      for (let i = 0; i < blockElements.length; i++) {
        const block = blockElements[i];

        // Atualizar progresso
        setPdfProgress({ current: i + 1, total: totalPages });

        // Capturar o bloco como canvas com alta qualidade
        const canvas = await html2canvas(block, {
          scale: 3, // Tripla qualidade para texto mais nítido
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794, // Largura fixa A4
          windowHeight: 1123, // Altura fixa A4
          letterRendering: true, // Melhor renderização de texto
          removeContainer: true, // Remove o container temporário
          imageTimeout: 0, // Sem timeout para imagens
          ignoreElements: () => false, // Não ignorar nenhum elemento
          foreignObjectRendering: false, // Desabilita foreign object para melhor compatibilidade
          onclone: (clonedDoc) => {
            // Remover elementos .no-print (botões e timestamps)
            clonedDoc.querySelectorAll('.no-print').forEach(el => el.remove());

            // Garantir que todos os estilos sejam aplicados no clone
            const clonedBlock = clonedDoc.querySelector('.a4-page');
            if (clonedBlock) {
              clonedBlock.style.width = '794px';
              clonedBlock.style.height = '1123px';
              clonedBlock.style.overflow = 'visible';

              // Forçar cores azuis nos números
              const quantityElements = clonedBlock.querySelectorAll('.item-qty');
              quantityElements.forEach(el => {
                el.style.color = '#2563eb';
                el.style.fontWeight = 'bold';
              });

              // Garantir que títulos de categoria tenham borda cinza
              const categoryTitles = clonedBlock.querySelectorAll('.category-title');
              categoryTitles.forEach(el => {
                el.style.borderBottom = '2px solid #e5e7eb';
              });
            }
          }
        });

        // Converter canvas para imagem PNG (melhor qualidade que JPEG)
        const imgData = canvas.toDataURL('image/png', 1.0);

        // Calcular dimensões mantendo proporção A4
        const imgWidth = pdfWidth;
        const imgHeight = pdfHeight;

        // Adicionar nova página se não for a primeira
        if (i > 0) {
          pdf.addPage();
        }

        // Adicionar imagem ao PDF cobrindo toda a página
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      }

      // Gerar nome do arquivo com data formatada
      const dateStr = selectedDayInfo?.fullDate?.replace(/\//g, '_') || 'producao';
      const fileName = `Programacao_${dateStr}.pdf`;

      // Fazer download do PDF
      pdf.save(fileName);

      // Restaurar zoom original
      setZoom(originalZoom);
      setPdfProgress({ current: 0, total: 0 });
      setIsGeneratingPDF(false);
    } catch (error) {
      alert('Erro ao gerar PDF. Por favor, tente novamente.');
      setZoom(originalZoom);
      setPdfProgress({ current: 0, total: 0 });
      setIsGeneratingPDF(false);
    }
  };

  const generatePrintHTML = (blocks) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Programação de Produção</title>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 3mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; }
            .print-page {
              page-break-after: always;
              min-height: 287mm;
              width: 200mm;
              padding: 5mm;
              position: relative;
              line-height: 1.4;
            }
            .print-page:last-child { page-break-after: avoid; }

            /* Classes do preview com tamanhos proporcionais em em */
            .block-title {
              font-size: 3em;
              font-weight: bold;
              margin-bottom: 8px;
              line-height: 1.1;
            }
            .block-subtitle {
              color: #6b7280;
              font-size: 1.6em;
              margin-bottom: 16px;
            }
            .items-container {
              margin-top: 12px;
              width: 100%;
            }
            .category-section {
              margin-bottom: 16px;
            }
            .category-title {
              font-size: 2em;
              font-weight: bold;
              margin-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 8px;
              display: block;
            }
            .item-line {
              display: flex;
              align-items: baseline;
              gap: 12px;
              margin-bottom: 4px;
              padding: 2px;
            }
            .item-qty {
              font-weight: bold;
              color: #2563eb;
              min-width: 120px;
              font-size: 1.3em;
            }
            .item-text {
              flex: 1;
              font-size: 1.2em;
            }

            /* Fallback para estilos antigos */
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 18px; margin: 15px 0 8px 0; font-weight: bold; }
            .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
            .item-row {
              display: flex;
              align-items: baseline;
              margin-bottom: 8px;
              gap: 10px;
            }
            .item-quantity { font-weight: bold; color: #2563eb; min-width: 100px; }
            .item-name { flex: 1; }
            .category-block { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          ${blocks.map(block => generateBlockHTML(block)).join('')}
        </body>
      </html>
    `;
  };

  const generateBlockHTML = (block) => {
    // Se tiver HTML editado, usar diretamente
    if (block.editedHTML) {
      return `
        <div class="print-page" style="font-size: ${block.fontSize}px; line-height: 1.4;">
          ${block.editedHTML}
        </div>
      `;
    }

    // Caso contrário, gerar do zero (fallback)
    const baseFontSize = block.fontSize;
    const h1Size = baseFontSize * 3;
    const h2Size = baseFontSize * 2;
    const h3Size = baseFontSize * 1.5;
    const subtitleSize = baseFontSize * 1.6;
    const qtySize = baseFontSize * 1.3;
    const textSize = baseFontSize * 1.2;

    if (block.type === 'empresa') {
      return `
        <div class="print-page" style="font-size: ${baseFontSize}px; line-height: 1.4;">
          <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${formatRecipeName(block.title)}</h1>
          <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
          ${Object.entries(block.items).map(([categoryName, items]) => `
            <div class="category-block" style="margin-bottom: 16px;">
              <h2 style="font-size: ${h2Size}px; margin-bottom: 8px;">${categoryName}</h2>
              ${items.map(item => `
                <div class="item-row" style="margin-bottom: 4px; padding: 2px;">
                  <span class="item-quantity" style="font-size: ${qtySize}px;">${formatQuantityDisplay(item)}</span>
                  <span class="item-name" style="font-size: ${textSize}px;">${formatRecipeName(item.recipe_name)}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `;
    }

    if (block.type === 'detailed-section') {
      return `
        <div class="print-page" style="font-size: ${baseFontSize}px; line-height: 1.4;">
          <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${formatRecipeName(block.title)}</h1>
          <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
          ${block.items.map((recipe, idx) => `
            <div class="category-block" style="margin-bottom: 16px;">
              <h2 style="font-size: ${h2Size}px; margin-bottom: 8px; font-weight: bold;">${formatRecipeName(recipe.recipe_name)}</h2>
              ${recipe.clientes.map(cliente => `
                <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; padding: 2px;">
                  <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px; text-transform: uppercase;">${cliente.customer_name}</span>
                  <span style="font-size: ${textSize}px;">→</span>
                  <span class="item-quantity" style="font-size: ${qtySize}px; font-weight: bold; color: #2563eb;">${formatQuantityDisplay(cliente)}</span>
                </div>
              `).join('')}
              ${recipe.showTotal ? `
                <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-top: 8px; padding-top: 4px; border-top: 2px solid #e5e7eb; font-weight: bold;">
                  <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px;">TOTAL:</span>
                  <span style="font-size: ${textSize}px;"></span>
                  <span class="item-quantity" style="font-size: ${qtySize}px; color: #2563eb;">${formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    if (block.type === 'embalagem-category') {
      return `
        <div class="print-page" style="font-size: ${baseFontSize}px; line-height: 1.4;">
          <h1 style="font-size: ${h1Size}px; line-height: 1.1; margin-bottom: 8px;">${formatRecipeName(block.title)}</h1>
          <div class="subtitle" style="font-size: ${subtitleSize}px; margin-bottom: 16px;">${block.subtitle}</div>
          ${block.items.map((recipe, idx) => `
            <div class="category-block" style="margin-bottom: 16px;">
              <h2 style="font-size: ${h2Size}px; margin-bottom: 8px; font-weight: bold;">${formatRecipeName(recipe.recipe_name)}</h2>
              ${recipe.clientes.map(cliente => `
                <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-bottom: 4px; padding: 2px;">
                  <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px; text-transform: uppercase;">${cliente.customer_name}</span>
                  <span style="font-size: ${textSize}px;">→</span>
                  <span class="item-quantity" style="font-size: ${qtySize}px; font-weight: bold; color: #2563eb;">${formatQuantityDisplay(cliente)}</span>
                </div>
              `).join('')}
              ${recipe.showTotal ? `
                <div class="item-row" style="display: flex; gap: 10px; align-items: baseline; margin-top: 8px; padding-top: 4px; border-top: 2px solid #e5e7eb; font-weight: bold;">
                  <span class="item-name" style="font-size: ${textSize}px; flex: 0 0 200px;">TOTAL:</span>
                  <span style="font-size: ${textSize}px;"></span>
                  <span class="item-quantity" style="font-size: ${qtySize}px; color: #2563eb;">${formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}</span>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    return `<div class="print-page" style="font-size: ${baseFontSize}px;">
      <h1 style="font-size: ${h1Size}px;">${formatRecipeName(block.title)}</h1>
      <div class="subtitle" style="font-size: ${subtitleSize}px;">${block.subtitle}</div>
    </div>`;
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

function EditableBlock({ block, isSelected, onSelect, onFontSizeChange, onAutoFit, onAutoFitComplete, onContentEdit, onItemEdit, onStatusUpdate, formatQuantityDisplay, isItemEdited, getItemEditInfo, isItemChanged, getItemChangeInfo, acceptPortalChange, rejectPortalChange, getResolutionStatus, isLocked }) {
  const blockRef = useRef(null);
  const contentRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [numPages, setNumPages] = useState(1);
  const [isAutoFitting, setIsAutoFitting] = useState(false);

  // Armazenar valores originais para detectar mudanças
  const originalValuesRef = useRef({});

  // Handler para capturar valor antes de editar
  const handleEditStart = (e, itemName, clientName, blockTitle = null) => {
    const itemKey = blockTitle
      ? `${blockTitle}_${itemName}_${clientName || 'sem_cliente'}`
      : `${itemName}_${clientName || 'sem_cliente'}`;
    originalValuesRef.current[itemKey] = e.target.textContent;
  };

  // Handler para detectar mudanças após editar
  const handleEditEnd = (e, itemName, clientName, field, blockTitle = null) => {
    const itemKey = blockTitle
      ? `${blockTitle}_${itemName}_${clientName || 'sem_cliente'}`
      : `${itemName}_${clientName || 'sem_cliente'}`;
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

        {block.type === 'empresa' && block.items && (
          <div className="items-container">
            {Object.entries(block.items).map(([categoryName, items]) => (
              <div key={categoryName} className="category-section">
                <h2
                  className="category-title"
                  contentEditable={isSelected && !isLocked}
                  suppressContentEditableWarning
                  style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                >
                  {categoryName}
                </h2>
                {items.map((item, idx) => {
                  // Normalizar customer_name para garantir consistência
                  const normalizedCustomerName = item.customer_name || 'sem_cliente';
                  // Para blocos 'empresa', incluir block.title na chave para evitar colisões
                  const itemKey = `${block.title}_${item.recipe_name}_${normalizedCustomerName}`;

                  const edited = isItemEdited ? isItemEdited(itemKey) : false;
                  // Para blocos 'empresa', usar block.title como clientName na detecção de mudanças
                  const changed = isItemChanged ? isItemChanged(item.recipe_name, block.title) : false;
                  const editInfo = edited && getItemEditInfo ? getItemEditInfo(itemKey) : null;
                  const changeInfo = changed && getItemChangeInfo ? getItemChangeInfo(item.recipe_name, block.title) : null;

                  // PRIORIDADE 1: Detectar CONFLITO (editado manualmente + mudou no portal)
                  const hasConflict = edited && changed;
                  const conflictResolution = getResolutionStatus ? getResolutionStatus(itemKey) : null;

                  let tooltipContent = null;
                  let lineStyles = {};

                  if (conflictResolution === 'accepted') {
                    // Conflito resolvido: ACEITO (roxo)
                    tooltipContent = `Mudança do portal aceita`;
                    lineStyles = {
                      backgroundColor: '#e9d5ff',
                      borderLeft: '3px solid #9333ea',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (conflictResolution === 'rejected') {
                    // Conflito resolvido: REJEITADO (laranja)
                    tooltipContent = `Edição manual mantida`;
                    lineStyles = {
                      backgroundColor: '#fed7aa',
                      borderLeft: '3px solid #f97316',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (hasConflict) {
                    // CONFLITO: vermelho/rosa
                    tooltipContent = `⚠️ CONFLITO: Você editou manualmente E o portal modificou este item`;
                    lineStyles = {
                      backgroundColor: '#fee2e2',
                      borderLeft: '4px solid #dc2626',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (edited) {
                    // PRIORIDADE 1: Editado manualmente (amarelo)
                    tooltipContent = `Editado por ${editInfo.userName} em ${new Date(editInfo.timestamp).toLocaleString()}`;
                    lineStyles = {
                      backgroundColor: '#fef3c7',
                      borderLeft: '3px solid #f59e0b',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (changed) {
                    // PRIORIDADE 2: Modificado no portal (verde)
                    const changeType = changeInfo.type === 'modified' ? 'Modificado' : changeInfo.type === 'added' ? 'Adicionado' : 'Removido';
                    tooltipContent = `${changeType} nos pedidos originais`;
                    lineStyles = {
                      backgroundColor: '#d1fae5',
                      borderLeft: '3px solid #10b981',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else {
                    // Sem modificações
                    lineStyles = {
                      backgroundColor: 'transparent',
                      borderLeft: 'none',
                      paddingLeft: '2px',
                      borderRadius: '4px'
                    };
                  }

                  return (
                    <div
                      key={idx}
                      className="item-line"
                      style={lineStyles}
                    >
                      <Tooltip content={tooltipContent}>
                        <span
                          className="item-qty"
                          contentEditable={isSelected && !isLocked && !hasConflict}
                          suppressContentEditableWarning
                          onFocus={(e) => handleEditStart(e, item.recipe_name, normalizedCustomerName, block.title)}
                          onBlur={(e) => handleEditEnd(e, item.recipe_name, normalizedCustomerName, 'quantity', block.title)}
                        >
                          {(() => {
                            // PRIORIDADE 1: Se foi editado manualmente, mostra valor editado
                            if (edited && editInfo?.editedValue) {
                              return editInfo.editedValue;
                            }
                            // PRIORIDADE 2: Se mudou no portal (sem edição manual), mostra novo valor do portal
                            if (changed && !edited && changeInfo?.currentQuantity) {
                              return formatQuantityDisplay({
                                quantity: changeInfo.currentQuantity,
                                unit_type: changeInfo.currentUnit || item.unit_type
                              });
                            }
                            // PRIORIDADE 3: Mostra valor original
                            return formatQuantityDisplay(item);
                          })()}
                        </span>
                      </Tooltip>
                      <Tooltip content={tooltipContent}>
                        <span
                          className="item-text"
                          contentEditable={isSelected && !isLocked && !hasConflict}
                          suppressContentEditableWarning
                          onFocus={(e) => handleEditStart(e, item.recipe_name, normalizedCustomerName, block.title)}
                          onBlur={(e) => handleEditEnd(e, item.recipe_name, normalizedCustomerName, 'name', block.title)}
                        >
                          {formatRecipeName(item.recipe_name)}
                        </span>
                      </Tooltip>
                      {/* Valor do portal entre parênteses (em caso de conflito não resolvido) */}
                      {hasConflict && !conflictResolution && changeInfo?.currentQuantity && (
                        <span className="portal-value no-print" style={{
                          marginLeft: '8px',
                          color: '#6b7280',
                          fontSize: '0.95em'
                        }}>
                          ({formatQuantityDisplay({
                            quantity: changeInfo.currentQuantity,
                            unit_type: changeInfo.currentUnit || item.unit_type
                          })})
                        </span>
                      )}
                      {/* Timestamp para mudanças do portal (não conflito) */}
                      {!hasConflict && changed && changeInfo?.detectedAt && (
                        <ChangeTimestamp timestamp={changeInfo.detectedAt} />
                      )}
                      {/* Botões de conflito (apenas se não resolvido) */}
                      {hasConflict && !conflictResolution && changeInfo && (
                        <ConflictButtons
                          onAccept={() => {
                            const newValue = formatQuantityDisplay({
                              quantity: changeInfo.currentQuantity,
                              unit_type: changeInfo.currentUnit || item.unit_type || cliente.unit_type
                            });
                            acceptPortalChange(
                              itemKey,
                              newValue,
                              changeInfo.currentQuantity,
                              changeInfo.currentUnit || item.unit_type || cliente.unit_type
                            );
                          }}
                          onReject={() => {
                            const currentValue = `${changeInfo.currentQuantity}_${changeInfo.currentUnit}`;
                            rejectPortalChange(itemKey, currentValue);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {block.type === 'detailed-section' && block.items && (
          <div className="items-container">
            {block.items.map((recipe, recipeIdx) => (
              <div key={recipeIdx} className="category-section">
                <h2
                  className="category-title"
                  contentEditable={isSelected && !isLocked}
                  suppressContentEditableWarning
                  style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                >
                  {formatRecipeName(recipe.recipe_name)}
                </h2>
                {recipe.clientes.map((cliente, idx) => {
                  const itemKey = `${recipe.recipe_name}_${cliente.customer_name}`;
                  const edited = isItemEdited && isItemEdited(itemKey);
                  const changed = isItemChanged && isItemChanged(recipe.recipe_name, cliente.customer_name);
                  const editInfo = edited && getItemEditInfo ? getItemEditInfo(itemKey) : null;
                  const changeInfo = changed && getItemChangeInfo ? getItemChangeInfo(recipe.recipe_name, cliente.customer_name) : null;

                  const hasConflict = edited && changed;
                  const conflictResolution = getResolutionStatus ? getResolutionStatus(itemKey) : null;

                  let tooltipContent = null;
                  let lineStyles = {};

                  if (conflictResolution === 'accepted') {
                    tooltipContent = `Mudança do portal aceita`;
                    lineStyles = {
                      backgroundColor: '#e9d5ff',
                      borderLeft: '3px solid #9333ea',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (conflictResolution === 'rejected') {
                    tooltipContent = `Edição manual mantida`;
                    lineStyles = {
                      backgroundColor: '#fed7aa',
                      borderLeft: '3px solid #f97316',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (hasConflict) {
                    tooltipContent = `⚠️ CONFLITO: Você editou manualmente E o portal modificou este item`;
                    lineStyles = {
                      backgroundColor: '#fee2e2',
                      borderLeft: '4px solid #dc2626',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (editInfo) {
                    tooltipContent = `Editado por ${editInfo.userName} em ${new Date(editInfo.timestamp).toLocaleString()}`;
                    lineStyles = {
                      backgroundColor: '#fef3c7',
                      borderLeft: '3px solid #f59e0b',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (changeInfo) {
                    const changeType = changeInfo.type === 'modified' ? 'Modificado' : changeInfo.type === 'added' ? 'Adicionado' : 'Removido';
                    tooltipContent = `${changeType} nos pedidos originais`;
                    lineStyles = {
                      backgroundColor: '#d1fae5',
                      borderLeft: '3px solid #10b981',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else {
                    lineStyles = {
                      backgroundColor: 'transparent',
                      borderLeft: 'none',
                      paddingLeft: '2px',
                      borderRadius: '4px'
                    };
                  }

                  return (
                    <div
                      key={idx}
                      className="item-line"
                      style={lineStyles}
                    >
                      <Tooltip content={tooltipContent}>
                        <span
                          className="item-text"
                          style={{ textTransform: 'uppercase' }}
                          contentEditable={isSelected && !isLocked}
                          suppressContentEditableWarning
                          onFocus={(e) => handleEditStart(e, itemKey)}
                          onBlur={(e) => handleEditEnd(e, recipe.recipe_name, cliente.customer_name, 'customer')}
                        >
                          {cliente.customer_name}
                        </span>
                      </Tooltip>
                      <span className="item-qty">→</span>
                      <Tooltip content={tooltipContent}>
                        <span
                          className="item-qty"
                          contentEditable={isSelected && !isLocked}
                          suppressContentEditableWarning
                          onFocus={(e) => handleEditStart(e, itemKey)}
                          onBlur={(e) => handleEditEnd(e, recipe.recipe_name, cliente.customer_name, 'quantity')}
                        >
                          {formatQuantityDisplay(cliente)}
                        </span>
                      </Tooltip>
                      {/* Valor do portal entre parênteses (em caso de conflito não resolvido) */}
                      {hasConflict && !conflictResolution && changeInfo?.currentQuantity && (
                        <span className="portal-value no-print" style={{
                          marginLeft: '8px',
                          color: '#6b7280',
                          fontSize: '0.95em'
                        }}>
                          ({formatQuantityDisplay({
                            quantity: changeInfo.currentQuantity,
                            unit_type: changeInfo.currentUnit || cliente.unit_type
                          })})
                        </span>
                      )}
                      {/* Timestamp para mudanças do portal (não conflito) */}
                      {!hasConflict && changed && changeInfo?.detectedAt && (
                        <ChangeTimestamp timestamp={changeInfo.detectedAt} />
                      )}
                      {/* Botões de conflito (apenas se não resolvido) */}
                      {hasConflict && !conflictResolution && changeInfo && (
                        <ConflictButtons
                          onAccept={() => {
                            const newValue = formatQuantityDisplay({
                              quantity: changeInfo.currentQuantity,
                              unit_type: changeInfo.currentUnit || item.unit_type || cliente.unit_type
                            });
                            acceptPortalChange(
                              itemKey,
                              newValue,
                              changeInfo.currentQuantity,
                              changeInfo.currentUnit || item.unit_type || cliente.unit_type
                            );
                          }}
                          onReject={() => {
                            const currentValue = `${changeInfo.currentQuantity}_${changeInfo.currentUnit}`;
                            rejectPortalChange(itemKey, currentValue);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
                {recipe.showTotal && (
                  <div className="item-line" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px', fontWeight: 'bold' }}>
                    <span className="item-text">TOTAL:</span>
                    <span className="item-qty"></span>
                    <span
                      className="item-qty"
                      contentEditable={isSelected && !isLocked}
                      suppressContentEditableWarning
                      style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                    >
                      {formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {block.type === 'embalagem-category' && block.items && (
          <div className="items-container">
            {block.items.map((recipe, recipeIdx) => (
              <div key={recipeIdx} className="category-section">
                <h2
                  className="category-title"
                  contentEditable={isSelected && !isLocked}
                  suppressContentEditableWarning
                  style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                >
                  {formatRecipeName(recipe.recipe_name)}
                </h2>
                {recipe.clientes.map((cliente, idx) => {
                  const itemKey = `${recipe.recipe_name}_${cliente.customer_name}`;
                  const edited = isItemEdited && isItemEdited(itemKey);
                  const changed = isItemChanged && isItemChanged(recipe.recipe_name, cliente.customer_name);
                  const editInfo = edited && getItemEditInfo ? getItemEditInfo(itemKey) : null;
                  const changeInfo = changed && getItemChangeInfo ? getItemChangeInfo(recipe.recipe_name, cliente.customer_name) : null;

                  const hasConflict = edited && changed;
                  const conflictResolution = getResolutionStatus ? getResolutionStatus(itemKey) : null;

                  let tooltipContent = null;
                  let lineStyles = {};

                  if (conflictResolution === 'accepted') {
                    tooltipContent = `Mudança do portal aceita`;
                    lineStyles = {
                      backgroundColor: '#e9d5ff',
                      borderLeft: '3px solid #9333ea',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (conflictResolution === 'rejected') {
                    tooltipContent = `Edição manual mantida`;
                    lineStyles = {
                      backgroundColor: '#fed7aa',
                      borderLeft: '3px solid #f97316',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (hasConflict) {
                    tooltipContent = `⚠️ CONFLITO: Você editou manualmente E o portal modificou este item`;
                    lineStyles = {
                      backgroundColor: '#fee2e2',
                      borderLeft: '4px solid #dc2626',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (editInfo) {
                    tooltipContent = `Editado por ${editInfo.userName} em ${new Date(editInfo.timestamp).toLocaleString()}`;
                    lineStyles = {
                      backgroundColor: '#fef3c7',
                      borderLeft: '3px solid #f59e0b',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else if (changeInfo) {
                    const changeType = changeInfo.type === 'modified' ? 'Modificado' : changeInfo.type === 'added' ? 'Adicionado' : 'Removido';
                    tooltipContent = `${changeType} nos pedidos originais`;
                    lineStyles = {
                      backgroundColor: '#d1fae5',
                      borderLeft: '3px solid #10b981',
                      paddingLeft: '8px',
                      borderRadius: '4px'
                    };
                  } else {
                    lineStyles = {
                      backgroundColor: 'transparent',
                      borderLeft: 'none',
                      paddingLeft: '2px',
                      borderRadius: '4px'
                    };
                  }

                  return (
                    <div
                      key={idx}
                      className="item-line"
                      style={lineStyles}
                    >
                      <Tooltip content={tooltipContent}>
                        <span
                          className="item-text"
                          style={{ textTransform: 'uppercase' }}
                          contentEditable={isSelected && !isLocked}
                          suppressContentEditableWarning
                          onFocus={(e) => handleEditStart(e, itemKey)}
                          onBlur={(e) => handleEditEnd(e, recipe.recipe_name, cliente.customer_name, 'customer')}
                        >
                          {cliente.customer_name}
                        </span>
                      </Tooltip>
                      <span className="item-qty">→</span>
                      <Tooltip content={tooltipContent}>
                        <span
                          className="item-qty"
                          contentEditable={isSelected && !isLocked}
                          suppressContentEditableWarning
                          onFocus={(e) => handleEditStart(e, itemKey)}
                          onBlur={(e) => handleEditEnd(e, recipe.recipe_name, cliente.customer_name, 'quantity')}
                        >
                          {formatQuantityDisplay(cliente)}
                        </span>
                      </Tooltip>
                      {/* Valor do portal entre parênteses (em caso de conflito não resolvido) */}
                      {hasConflict && !conflictResolution && changeInfo?.currentQuantity && (
                        <span className="portal-value no-print" style={{
                          marginLeft: '8px',
                          color: '#6b7280',
                          fontSize: '0.95em'
                        }}>
                          ({formatQuantityDisplay({
                            quantity: changeInfo.currentQuantity,
                            unit_type: changeInfo.currentUnit || cliente.unit_type
                          })})
                        </span>
                      )}
                      {/* Timestamp para mudanças do portal (não conflito) */}
                      {!hasConflict && changed && changeInfo?.detectedAt && (
                        <ChangeTimestamp timestamp={changeInfo.detectedAt} />
                      )}
                      {/* Botões de conflito (apenas se não resolvido) */}
                      {hasConflict && !conflictResolution && changeInfo && (
                        <ConflictButtons
                          onAccept={() => {
                            const newValue = formatQuantityDisplay({
                              quantity: changeInfo.currentQuantity,
                              unit_type: changeInfo.currentUnit || item.unit_type || cliente.unit_type
                            });
                            acceptPortalChange(
                              itemKey,
                              newValue,
                              changeInfo.currentQuantity,
                              changeInfo.currentUnit || item.unit_type || cliente.unit_type
                            );
                          }}
                          onReject={() => {
                            const currentValue = `${changeInfo.currentQuantity}_${changeInfo.currentUnit}`;
                            rejectPortalChange(itemKey, currentValue);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
                {recipe.showTotal && (
                  <div className="item-line" style={{ borderTop: '2px solid #e5e7eb', paddingTop: '8px', marginTop: '8px', fontWeight: 'bold' }}>
                    <span className="item-text">TOTAL:</span>
                    <span className="item-qty"></span>
                    <span
                      className="item-qty"
                      contentEditable={isSelected && !isLocked}
                      suppressContentEditableWarning
                      style={{ cursor: isLocked ? 'not-allowed' : 'text' }}
                    >
                      {formatQuantityDisplay({ quantity: recipe.total, unit_type: recipe.unit_type })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
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
