# Exemplo de Integração no PrintPreviewEditor

Este documento mostra exemplos práticos de como integrar o sistema de gerenciamento de estado no componente PrintPreviewEditor.

## 📦 Importações

```javascript
import {
  // Constantes
  CHANGE_TYPES,
  getChangeColors,
  getChangeStyles,

  // Ordem de categorias
  ensureCategoryOrderInBlocks,
  mergeItemsPreservingCategoryOrder,
  reorganizeBlockItems,

  // Gerenciamento de edições
  createEditKey,
  createEditRecord,
  createPortalUpdateRecord,
  saveEditStateToLocal,
  loadEditStateFromLocal,
  getEditStateSummary,

  // Resolução de conflitos
  getItemDisplayInfo,
  createDetailedTooltip,
  applyConflictResolution,
  processBlockItemsWithStates,
  getConflictStatistics
} from './utils';
```

## 🎬 Inicialização do Componente

```javascript
export default function PrintPreviewEditor({ data, onClose, onPrint }) {
  const { porEmpresaData, saladaData, acougueData, embalagemData, selectedDayInfo } = data;

  // Estados
  const [editableBlocks, setEditableBlocks] = useState([]);
  const [editState, setEditState] = useState({});
  const [portalUpdates, setPortalUpdates] = useState({});
  const [resolvedConflicts, setResolvedConflicts] = useState({});

  // Carregar estado salvo ao montar
  useEffect(() => {
    const weekKey = `programacao-edits-${selectedDayInfo?.weekNumber}-${selectedDayInfo?.year}`;
    const savedState = loadEditStateFromLocal(weekKey);

    if (savedState) {
      setEditState(savedState.edits || {});
      setPortalUpdates(savedState.portalUpdates || {});
      setResolvedConflicts(savedState.resolved || {});
    }
  }, [selectedDayInfo]);

  // Inicializar blocos com ordem correta
  const initialBlocks = useMemo(() => {
    if (!porEmpresaData) return [];

    const blocks = createBlocksFromData(porEmpresaData, saladaData, acougueData, embalagemData);

    // GARANTIR ordem das categorias
    return ensureCategoryOrderInBlocks(blocks);
  }, [porEmpresaData, saladaData, acougueData, embalagemData]);

  useEffect(() => {
    if (initialBlocks.length > 0 && editableBlocks.length === 0) {
      setEditableBlocks(initialBlocks);
    }
  }, [initialBlocks]);

  // Salvar estado quando mudar
  useEffect(() => {
    const weekKey = `programacao-edits-${selectedDayInfo?.weekNumber}-${selectedDayInfo?.year}`;

    const stateToSave = {
      edits: editState,
      portalUpdates,
      resolved: resolvedConflicts
    };

    saveEditStateToLocal(weekKey, stateToSave);
  }, [editState, portalUpdates, resolvedConflicts, selectedDayInfo]);

  // ... resto do componente
}
```

## ✏️ Função de Edição de Item

```javascript
const handleItemEdit = useCallback((recipeName, customerName, originalValue, newValue, field = 'quantity', blockTitle = null) => {
  // Criar chave única
  const itemKey = createEditKey(recipeName, customerName, blockTitle);

  // Criar registro de edição
  const editRecord = createEditRecord({
    itemKey,
    originalValue,
    editedValue: newValue,
    field,
    userId: 'local-user',
    userName: 'Usuário Local'
  });

  // Atualizar estado de edições
  setEditState(prev => ({
    ...prev,
    [itemKey]: editRecord
  }));

  // Atualizar blocos mantendo ORDEM DAS CATEGORIAS
  setEditableBlocks(prevBlocks => {
    const updatedBlocks = prevBlocks.map(block => {
      if (block.type === 'empresa' && block.title === blockTitle) {
        const newItems = { ...block.items };

        // Encontrar e atualizar o item
        Object.entries(newItems).forEach(([category, items]) => {
          newItems[category] = items.map(item => {
            if (item.recipe_name === recipeName &&
                (item.customer_name || 'sem_cliente') === customerName) {
              return {
                ...item,
                [field === 'quantity' ? 'quantity' : 'recipe_name']: field === 'quantity'
                  ? parseFloat(newValue)
                  : newValue
              };
            }
            return item;
          });
        });

        // IMPORTANTE: Reorganizar para manter ordem
        return reorganizeBlockItems({
          ...block,
          items: newItems
        });
      }
      return block;
    });

    return updatedBlocks;
  });
}, []);
```

## 🌐 Função de Atualização do Portal

```javascript
const handlePortalUpdate = useCallback((orders) => {
  const updates = {};

  orders.forEach(order => {
    if (!order.items) return;

    order.items.forEach(item => {
      const itemKey = createEditKey(item.recipe_name, order.customer_name);

      // Obter quantidade anterior
      const previousQty = getPreviousQuantity(itemKey); // Implementar esta função

      // Criar registro de atualização
      updates[itemKey] = createPortalUpdateRecord({
        itemKey,
        previousQuantity: previousQty,
        currentQuantity: item.quantity,
        previousUnit: item.unit_type,
        currentUnit: item.unit_type
      });
    });
  });

  // Verificar conflitos antes de aplicar
  const conflicts = [];

  Object.keys(updates).forEach(itemKey => {
    const conflict = detectItemConflict({
      itemKey,
      editedItems: editState,
      portalUpdates: { [itemKey]: updates[itemKey] },
      resolvedConflicts
    });

    if (conflict.hasConflict) {
      conflicts.push({ itemKey, conflict });
    }
  });

  if (conflicts.length > 0) {
    // Mostrar diálogo de conflitos
    showConflictDialog(conflicts);
  } else {
    // Aplicar atualizações normalmente
    setPortalUpdates(prev => ({ ...prev, ...updates }));

    // Atualizar blocos mantendo ordem
    applyPortalUpdatesToBlocks(updates);
  }
}, [editState, resolvedConflicts]);
```

## ⚔️ Resolução de Conflitos

```javascript
const handleResolveConflict = useCallback((itemKey, resolution) => {
  const conflictInfo = detectItemConflict({
    itemKey,
    editedItems: editState,
    portalUpdates,
    resolvedConflicts
  });

  if (!conflictInfo.hasConflict) return;

  // Aplicar resolução
  const resolved = applyConflictResolution({
    itemKey,
    resolution, // 'accepted' ou 'rejected'
    conflictInfo,
    currentValue: getCurrentValue(itemKey) // Implementar esta função
  });

  // Registrar resolução
  setResolvedConflicts(prev => ({
    ...prev,
    [itemKey]: {
      resolution,
      resolvedAt: new Date().toISOString(),
      manualEdit: conflictInfo.manualEdit,
      portalUpdate: conflictInfo.portalUpdate
    }
  }));

  // Atualizar item com valor resolvido
  setEditableBlocks(prevBlocks => {
    return prevBlocks.map(block => {
      return updateBlockItemValue(block, itemKey, resolved);
    });
  });

  // Se aceitou portal, remover edição manual
  if (resolution === 'accepted') {
    setEditState(prev => {
      const newState = { ...prev };
      delete newState[itemKey];
      return newState;
    });
  }
}, [editState, portalUpdates, resolvedConflicts]);
```

## 🎨 Renderização com Estilos

```javascript
function renderBlockItem({ item, block, editState, portalUpdates, resolvedConflicts }) {
  const itemKey = createEditKey(
    item.recipe_name,
    item.customer_name || 'sem_cliente',
    block.title
  );

  // Obter informações de display
  const displayInfo = getItemDisplayInfo({
    itemKey,
    editedItems: editState,
    portalUpdates,
    resolvedConflicts
  });

  // Criar tooltip
  const tooltip = createDetailedTooltip({
    itemKey,
    editedItems: editState,
    portalUpdates,
    conflictInfo: displayInfo.conflictInfo
  });

  return (
    <div
      className="item-line"
      style={displayInfo.styles}
      title={tooltip}
    >
      {/* Badge de status */}
      {displayInfo.label && (
        <span
          className="status-badge"
          style={{
            backgroundColor: getChangeColors(displayInfo.changeType).badge,
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            marginRight: '8px'
          }}
        >
          {displayInfo.label}
        </span>
      )}

      {/* Conteúdo do item */}
      <span className="item-quantity">{item.quantity}</span>
      <span className="item-name">{item.recipe_name}</span>

      {/* Botões de conflito */}
      {displayInfo.isConflict && !displayInfo.conflictResolution && (
        <div className="conflict-actions">
          <button
            onClick={() => handleResolveConflict(itemKey, 'accepted')}
            className="btn-accept"
          >
            Aceitar Portal
          </button>
          <button
            onClick={() => handleResolveConflict(itemKey, 'rejected')}
            className="btn-reject"
          >
            Manter Edição
          </button>
        </div>
      )}
    </div>
  );
}
```

## 📊 Componente de Estatísticas

```javascript
function ConflictStatisticsPanel({ editState, portalUpdates, resolvedConflicts }) {
  const stats = getConflictStatistics(editState, portalUpdates, resolvedConflicts);
  const summary = getEditStateSummary(editState);

  return (
    <div className="statistics-panel">
      <h3>Estatísticas</h3>

      <div className="stat-row">
        <span>Edições Manuais:</span>
        <strong>{summary.manualEdits}</strong>
      </div>

      <div className="stat-row">
        <span>Atualizações Portal:</span>
        <strong>{summary.portalUpdates}</strong>
      </div>

      <div className="stat-row">
        <span>Conflitos Não Resolvidos:</span>
        <strong style={{ color: stats.unresolvedConflicts > 0 ? 'red' : 'green' }}>
          {stats.unresolvedConflicts}
        </strong>
      </div>

      <div className="stat-row">
        <span>Conflitos Resolvidos:</span>
        <strong>{stats.resolvedConflicts}</strong>
      </div>

      {stats.unresolvedConflicts > 0 && (
        <div className="conflict-items">
          <h4>Items em Conflito:</h4>
          <ul>
            {stats.conflictItems.map(itemKey => (
              <li key={itemKey}>{itemKey}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## 🔄 Processamento de Blocos Completo

```javascript
// Processar todos os blocos adicionando informações de estado
const processedBlocks = useMemo(() => {
  return editableBlocks.map(block =>
    processBlockItemsWithStates({
      block,
      editedItems: editState,
      portalUpdates,
      resolvedConflicts
    })
  );
}, [editableBlocks, editState, portalUpdates, resolvedConflicts]);

// Usar processedBlocks para renderização
return (
  <div className="print-preview-editor">
    {processedBlocks.map((block, index) => (
      <BlockRenderer
        key={block.id}
        block={block}
        onItemEdit={handleItemEdit}
        onResolveConflict={handleResolveConflict}
      />
    ))}
  </div>
);
```

## 🎯 Checklist de Integração

- [ ] Importar utilitários necessários
- [ ] Adicionar estados (editState, portalUpdates, resolvedConflicts)
- [ ] Carregar estado salvo na montagem
- [ ] Aplicar `ensureCategoryOrderInBlocks` nos blocos iniciais
- [ ] Usar `reorganizeBlockItems` ao editar
- [ ] Implementar `handleItemEdit` com `createEditRecord`
- [ ] Implementar `handlePortalUpdate` com detecção de conflitos
- [ ] Implementar `handleResolveConflict`
- [ ] Usar `getItemDisplayInfo` para estilos
- [ ] Usar `createDetailedTooltip` para tooltips
- [ ] Adicionar badges de status
- [ ] Adicionar botões de resolução de conflito
- [ ] Mostrar estatísticas
- [ ] Salvar estado automaticamente
