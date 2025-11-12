# Sistema de Gerenciamento de Estado de Edições

Este documento explica como usar o sistema organizado de gerenciamento de cores, status e ordem de categorias para edições manuais e atualizações do portal.

## 📁 Estrutura de Arquivos

```
components/programacao/PrintPreviewEditor/
├── constants/
│   └── editStates.js          # Constantes de cores, status e categorias
├── utils/
│   ├── categoryOrderManager.js  # Gerenciamento de ordem das categorias
│   ├── editStateManager.js      # Gerenciamento de edições e conflitos
│   ├── conflictResolver.js      # Detecção e resolução de conflitos
│   └── index.js                 # Exportação centralizada
└── GERENCIAMENTO_ESTADO.md      # Este arquivo
```

## 🎨 Cores e Status

### Tipos de Mudanças

```javascript
import { CHANGE_TYPES } from './utils';

// Tipos disponíveis:
CHANGE_TYPES.NONE                // Nenhuma mudança
CHANGE_TYPES.MANUAL_EDIT         // Edição manual (amarelo)
CHANGE_TYPES.PORTAL_UPDATE       // Atualização do portal (verde)
CHANGE_TYPES.CONFLICT            // Conflito (vermelho)
CHANGE_TYPES.RESOLVED_ACCEPTED   // Conflito resolvido - portal aceito (verde)
CHANGE_TYPES.RESOLVED_REJECTED   // Conflito resolvido - edição mantida (amarelo)
```

### Usando Cores

```javascript
import { getChangeColors, getChangeStyles } from './utils';

// Obter cores para um tipo
const colors = getChangeColors(CHANGE_TYPES.MANUAL_EDIT);
// { background: '#fef3c7', border: '#f59e0b', text: '#92400e' }

// Obter estilos CSS prontos
const styles = getChangeStyles(CHANGE_TYPES.CONFLICT);
// Retorna objeto com estilos CSS aplicáveis
```

## 📊 Ordem das Categorias

### Ordem Fixa

As categorias **SEMPRE** seguem esta ordem (NUNCA muda):

1. **PADRÃO** (prioridade 5)
2. **REFOGADO** (prioridade 4)
3. **ACOMPANHAMENTO** (prioridade 3)
4. **SALADA** (prioridade 2)
5. **SOBREMESA** (prioridade 1)

### Preservando Ordem

```javascript
import { sortCategoriesObject, mergeItemsPreservingCategoryOrder } from './utils';

// Ordenar objeto de categorias
const categoriesObj = {
  'SALADA': [...items],
  'PADRÃO': [...items],
  'REFOGADO': [...items]
};

const ordered = sortCategoriesObject(categoriesObj);
// Retorna: { 'PADRÃO': [...], 'REFOGADO': [...], 'SALADA': [...] }

// Mesclar mantendo ordem
const merged = mergeItemsPreservingCategoryOrder(originalItems, updatedItems);
// Preserva ordem original e adiciona novos items
```

### Garantindo Ordem em Blocos

```javascript
import { ensureCategoryOrderInBlocks } from './utils';

// Aplicar em todos os blocos
const orderedBlocks = ensureCategoryOrderInBlocks(blocks);
// Garante que todos os blocos tipo 'empresa' tenham categorias ordenadas
```

## ✏️ Gerenciamento de Edições

### Criando Registros

```javascript
import { createEditKey, createEditRecord, createPortalUpdateRecord } from './utils';

// Criar chave única para item
const itemKey = createEditKey('Arroz Branco', 'Cliente A', 'PADRÃO');

// Registrar edição manual
const editRecord = createEditRecord({
  itemKey,
  originalValue: '10',
  editedValue: '15',
  field: 'quantity',
  userId: 'user123',
  userName: 'João Silva'
});

// Registrar atualização do portal
const portalUpdate = createPortalUpdateRecord({
  itemKey,
  previousQuantity: 10,
  currentQuantity: 12,
  previousUnit: 'porções',
  currentUnit: 'porções'
});
```

### Salvando e Carregando Estado

```javascript
import { saveEditStateToLocal, loadEditStateFromLocal } from './utils';

// Salvar
const editState = {
  'itemKey1': editRecord1,
  'itemKey2': editRecord2
};
saveEditStateToLocal('programacao-edits', editState);

// Carregar
const loaded = loadEditStateFromLocal('programacao-edits');
```

## ⚔️ Detecção e Resolução de Conflitos

### Detectando Conflitos

```javascript
import { detectItemConflict, getItemDisplayInfo } from './utils';

// Detectar conflito para um item específico
const conflictInfo = detectItemConflict({
  itemKey: 'Arroz Branco::Cliente A',
  editedItems: { /* ... */ },
  portalUpdates: { /* ... */ },
  resolvedConflicts: { /* ... */ }
});

if (conflictInfo.hasConflict) {
  console.log('Conflito detectado!');
  console.log('Edição manual:', conflictInfo.manualEdit);
  console.log('Atualização portal:', conflictInfo.portalUpdate);
}
```

### Obtendo Informações de Display

```javascript
import { getItemDisplayInfo } from './utils';

const displayInfo = getItemDisplayInfo({
  itemKey: 'Arroz Branco::Cliente A',
  editedItems,
  portalUpdates,
  resolvedConflicts
});

// Usar no componente
<div style={displayInfo.styles}>
  {displayInfo.label && <span className="badge">{displayInfo.label}</span>}
  Arroz Branco - 15 porções
</div>
```

### Resolvendo Conflitos

```javascript
import { applyConflictResolution } from './utils';

// Aceitar valor do portal
const resolved = applyConflictResolution({
  itemKey: 'Arroz Branco::Cliente A',
  resolution: 'accepted', // ou 'rejected'
  conflictInfo,
  currentValue: { value: 15, unit: 'porções' }
});

console.log('Novo valor:', resolved.value);
```

### Processando Blocos com Estados

```javascript
import { processBlockItemsWithStates } from './utils';

// Adicionar informações de display a todos os items de um bloco
const processedBlock = processBlockItemsWithStates({
  block: myBlock,
  editedItems,
  portalUpdates,
  resolvedConflicts
});

// Agora cada item tem:
// item._displayInfo (cores, labels, status)
// item._itemKey (chave única)
```

## 📈 Estatísticas

```javascript
import { getConflictStatistics, getEditStateSummary } from './utils';

// Estatísticas de conflitos
const stats = getConflictStatistics(editedItems, portalUpdates, resolvedConflicts);
console.log('Conflitos não resolvidos:', stats.unresolvedConflicts);
console.log('Conflitos resolvidos:', stats.resolvedConflicts);
console.log('Items em conflito:', stats.conflictItems);

// Resumo de edições
const summary = getEditStateSummary(editState);
console.log('Total:', summary.total);
console.log('Edições manuais:', summary.manualEdits);
console.log('Atualizações portal:', summary.portalUpdates);
console.log('Conflitos:', summary.conflicts);
```

## 🔄 Fluxo Completo de Uso

### 1. Ao Carregar Componente

```javascript
import { loadEditStateFromLocal, ensureCategoryOrderInBlocks } from './utils';

// Carregar estado salvo
const editState = loadEditStateFromLocal('programacao-edits-week-1');

// Garantir ordem das categorias
const orderedBlocks = ensureCategoryOrderInBlocks(initialBlocks);
setEditableBlocks(orderedBlocks);
```

### 2. Ao Editar Item

```javascript
import { createEditKey, createEditRecord, saveEditStateToLocal } from './utils';

function handleItemEdit(recipeName, customerName, originalValue, newValue) {
  const itemKey = createEditKey(recipeName, customerName, blockTitle);

  const editRecord = createEditRecord({
    itemKey,
    originalValue,
    editedValue: newValue,
    field: 'quantity'
  });

  // Atualizar estado
  const newEditState = {
    ...editState,
    [itemKey]: editRecord
  };

  // Salvar
  saveEditStateToLocal('programacao-edits', newEditState);
}
```

### 3. Ao Receber Atualização do Portal

```javascript
import { createEditKey, createPortalUpdateRecord, detectItemConflict } from './utils';

function handlePortalUpdate(recipeName, customerName, previousQty, newQty) {
  const itemKey = createEditKey(recipeName, customerName);

  const updateRecord = createPortalUpdateRecord({
    itemKey,
    previousQuantity: previousQty,
    currentQuantity: newQty
  });

  // Verificar conflito
  const conflict = detectItemConflict({
    itemKey,
    editedItems: editState,
    portalUpdates: { [itemKey]: updateRecord }
  });

  if (conflict.hasConflict) {
    // Mostrar UI de resolução de conflito
    showConflictDialog(conflict);
  } else {
    // Aplicar atualização normalmente
    applyPortalUpdate(updateRecord);
  }
}
```

### 4. Ao Renderizar Items

```javascript
import { getItemDisplayInfo, createDetailedTooltip } from './utils';

function renderItem(item, editedItems, portalUpdates, resolvedConflicts) {
  const itemKey = createEditKey(item.recipe_name, item.customer_name);

  const displayInfo = getItemDisplayInfo({
    itemKey,
    editedItems,
    portalUpdates,
    resolvedConflicts
  });

  const tooltip = createDetailedTooltip({
    itemKey,
    editedItems,
    portalUpdates,
    conflictInfo: displayInfo.conflictInfo
  });

  return (
    <div style={displayInfo.styles} title={tooltip}>
      {displayInfo.label && (
        <span className="badge" style={{
          backgroundColor: displayInfo.styles.borderLeft.split(' ')[3]
        }}>
          {displayInfo.label}
        </span>
      )}
      {item.recipe_name} - {item.quantity} {item.unit_type}
    </div>
  );
}
```

## 🎯 Benefícios

1. **Ordem Garantida**: Categorias nunca mudam de posição
2. **Cores Consistentes**: Sistema unificado de cores para todos os estados
3. **Detecção Automática**: Conflitos detectados automaticamente
4. **Rastreamento**: Todas as mudanças são rastreadas com timestamps
5. **Resolução Clara**: UI consistente para resolver conflitos
6. **Persistência**: Estado salvo localmente
7. **Estatísticas**: Métricas sobre edições e conflitos

## 🚨 Importante

- **NUNCA** reordene categorias manualmente
- **SEMPRE** use `mergeItemsPreservingCategoryOrder` ao mesclar items
- **SEMPRE** use `createEditKey` para gerar chaves de items
- **SEMPRE** salve o estado após mudanças importantes
- **LIMPE** edições antigas periodicamente com `cleanOldEdits`
