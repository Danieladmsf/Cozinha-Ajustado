# Sistema Simplificado de Edições - PrintPreviewEditor

## 📋 Resumo da Refatoração

O sistema antigo de edições foi **completamente removido** e substituído por um sistema **hierárquico simplificado** que resolve o problema de sincronização de valores.

---

## ❌ Sistema Antigo (REMOVIDO)

### Problema Principal
- **Múltiplas chaves para o mesmo item**: Uma edição do "Arroz Branco" da "Faap" podia gerar 2+ chaves diferentes:
  - `"Faap::Arroz Branco::sem_cliente"` → 6 cubas
  - `"Arroz Branco::Faap"` → 4 cubas
  - Resultado: **valores diferentes** aparecendo em blocos diferentes

### Arquitetura Antiga
```javascript
// Estrutura: chaves concatenadas com strings
{
  "Cliente::Receita::sem_cliente": {
    editedValue: "6 cubas G",
    field: "quantity",
    timestamp: "..."
  },
  "Receita::Cliente": {
    editedValue: "4 cubas G",
    field: "quantity"
  }
}
```

### Funções Removidas
- ❌ `loadEditStateFromLocal()`
- ❌ `saveEditStateToLocal()`
- ❌ `createEditKey()`
- ❌ `findEditForItem()` - tentava múltiplas variações de chaves
- ❌ `applyEditsToBlocks()` - lógica complexa com loops

---

## ✅ Novo Sistema Hierárquico (IMPLEMENTADO)

### Solução
- **Uma única estrutura para cada edição**: Cliente → Receita → Dados
- **Busca direta** sem ambiguidade
- **Sincronização automática** em todos os blocos

### Nova Arquitetura
```javascript
// Estrutura: objetos hierárquicos
{
  "Faap": {
    "Arroz Branco": {
      value: "6 cubas G",
      quantity: 6,
      unit: "cuba-g",
      field: "quantity",
      timestamp: "2025-11-14T14:00:00.000Z",
      userId: "local-user"
    }
  },
  "Museu": {
    "Arroz Branco": {
      value: "3 cubas G",
      quantity: 3,
      unit: "cuba-g",
      field: "quantity"
    }
  }
}
```

### Novas Funções (simpleEditManager.js)

#### 1. `saveEdit(customerName, recipeName, editedValue, field)`
Salva uma edição diretamente na estrutura hierárquica.

```javascript
import { saveEdit } from './utils/simpleEditManager';

// Salvar edição
saveEdit('Faap', 'Arroz Branco', '6 cubas G', 'quantity');

// Resultado automático no localStorage:
// {
//   "Faap": {
//     "Arroz Branco": { value: "6 cubas G", quantity: 6, unit: "cuba-g", ... }
//   }
// }
```

#### 2. `getEdit(customerName, recipeName)`
Busca uma edição específica.

```javascript
import { getEdit } from './utils/simpleEditManager';

const edit = getEdit('Faap', 'Arroz Branco');
console.log(edit);
// { value: "6 cubas G", quantity: 6, unit: "cuba-g", ... }
```

#### 3. `getAllEditsForCustomer(customerName)`
Retorna todas as edições de um cliente.

```javascript
import { getAllEditsForCustomer } from './utils/simpleEditManager';

const edits = getAllEditsForCustomer('Faap');
console.log(edits);
// {
//   "Arroz Branco": { value: "6 cubas G", ... },
//   "Feijão": { value: "4 cubas G", ... }
// }
```

#### 4. `loadAllEdits()`
Carrega todas as edições do localStorage.

```javascript
import { loadAllEdits } from './utils/simpleEditManager';

const allEdits = loadAllEdits();
console.log(allEdits);
// { "Faap": {...}, "Museu": {...}, ... }
```

#### 5. `clearAllEdits()`
Remove todas as edições.

```javascript
import { clearAllEdits } from './utils/simpleEditManager';

clearAllEdits();
```

#### 6. `getEditsSummary()`
Retorna resumo das edições.

```javascript
import { getEditsSummary } from './utils/simpleEditManager';

const summary = getEditsSummary();
console.log(summary);
// {
//   totalCustomers: 3,
//   totalEdits: 12,
//   customers: [
//     { name: "Faap", recipes: 5 },
//     { name: "Museu", recipes: 4 },
//     ...
//   ]
// }
```

---

## 🔄 Migração Automática

O sistema novo **migra automaticamente** os dados do sistema antigo:

```javascript
import { migrateFromOldSystem } from './utils/simpleEditManager';

// Chamado automaticamente ao inicializar PrintPreviewEditor
migrateFromOldSystem();
```

### Processo de Migração
1. Busca dados em `localStorage.getItem('print_preview_edit_state')`
2. Converte chaves concatenadas → estrutura hierárquica
3. Salva em `localStorage.setItem('print_preview_edits_v2', ...)`
4. **Não remove** dados antigos (preserva como backup)

---

## 📦 Arquivos Modificados

### 1. **simpleEditManager.js** (NOVO)
- Localização: `/components/programacao/PrintPreviewEditor/utils/simpleEditManager.js`
- Responsabilidade: Gerenciar edições com estrutura hierárquica
- Tamanho: ~230 linhas

### 2. **PrintPreviewEditor.refactored.jsx** (MODIFICADO)
- Removidas 161 linhas de código antigo
- Adicionadas 788 linhas de código novo/refatorado
- Principais mudanças:
  - ✅ Usa `saveEdit()` em `handleItemEdit`
  - ✅ Novo `applyEditsToBlocks()` simplificado (busca direta)
  - ✅ Removido `findEditForItem()` complexo
  - ✅ Estado inicial carrega com `loadAllEdits()`

---

## 🎯 Como Funciona Agora

### 1. Usuário Edita um Item
```javascript
// Exemplo: usuário edita "Arroz Branco" da "Faap" para "6 cubas G"
handleItemEdit('Arroz Branco', 'Faap', '4 cubas G', '6 cubas G', 'quantity');
```

### 2. Sistema Salva com Nova Estrutura
```javascript
// Dentro de handleItemEdit:
const newEdits = saveEdit('Faap', 'Arroz Branco', '6 cubas G', 'quantity');
setEditState(newEdits);

// localStorage agora tem:
// {
//   "Faap": {
//     "Arroz Branco": { value: "6 cubas G", quantity: 6, ... }
//   }
// }
```

### 3. Sistema Sincroniza TODOS os Blocos
```javascript
// Em handleItemEdit, percorre todos os blocos e atualiza:

// BLOCO EMPRESA (Faap)
if (block.type === 'empresa' && block.title === 'Faap') {
  // Atualiza item "Arroz Branco" → 6 cubas
}

// BLOCOS CONSOLIDADOS (Salada, Açougue, etc.)
if (block.type === 'detailed-section') {
  // Procura receita "Arroz Branco"
  // Procura cliente "Faap"
  // Atualiza quantidade → 6 cubas
  // Recalcula total
}
```

### 4. applyEditsToBlocks() Aplica ao Carregar
```javascript
// Quando página carrega ou pedidos mudam:
useEffect(() => {
  const blocksWithEdits = applyEditsToBlocks(initialBlocks, editState);
  setEditableBlocks(blocksWithEdits);
}, [initialBlocks, editState]);

// applyEditsToBlocks simplificado:
function applyEditsToBlocks(blocks, editsState) {
  return blocks.map(block => {
    if (block.type === 'empresa') {
      const customerEdits = editsState[block.title]; // Busca direta!
      // Aplica edições...
    }

    if (block.type === 'detailed-section') {
      block.items.forEach(recipe => {
        recipe.clientes.forEach(cliente => {
          const edit = editsState[cliente.customer_name]?.[recipe.recipe_name];
          // Aplica edição...
        });
      });
    }
  });
}
```

---

## 🎉 Benefícios

### 1. **Sincronização Perfeita**
- ✅ Mesma edição aparece em TODOS os blocos automaticamente
- ✅ Impossível ter valores conflitantes (chave única)

### 2. **Código Mais Simples**
- ✅ Busca direta: `editsState[customer][recipe]`
- ✅ Sem loops tentando variações de chaves
- ✅ Menos bugs, mais manutenível

### 3. **Performance**
- ✅ O(1) lookup direto vs O(n) tentativas múltiplas
- ✅ Menos comparações de strings

### 4. **Migração Transparente**
- ✅ Usuários existentes não perdem dados
- ✅ Conversão automática na primeira carga

---

## 🔍 Debug e Logs

O sistema novo tem logs claros para debug:

```javascript
// Ao salvar:
[SimpleEditManager] ✅ Edição salva: {
  customerName: "Faap",
  recipeName: "Arroz Branco",
  value: "6 cubas G",
  totalCustomers: 1,
  totalRecipes: 1
}

// Ao aplicar:
[applyEditsToBlocks] 🆕 Aplicando edições (sistema simplificado): {
  numBlocks: 15,
  totalCustomers: 3
}

[applyEditsToBlocks] ✏️ Aplicando quantidade (empresa): {
  bloco: "Faap",
  item: "Arroz Branco",
  oldQty: 4,
  newQty: 6
}

[handleItemEdit] 🔗 SINCRONIZAÇÃO COMPLETA (novo sistema): {
  recipe: "Arroz Branco",
  customer: "Faap",
  blocksModified: 3,
  blocks: ["empresa:Faap", "detailed-section:Salada", "detailed-section:PADRÃO"]
}
```

---

## 🧪 Como Testar

### 1. Testar Sincronização
```javascript
// 1. Editar "Arroz Branco" no bloco "Faap" → "6 cubas G"
// 2. Verificar que aparece "6 cubas G" em:
//    - Bloco Empresa "Faap"
//    - Bloco Consolidado "Salada" (se Faap tiver salada)
//    - Bloco Consolidado "PADRÃO" (linha da Faap)

// Abrir console e verificar:
const edits = loadAllEdits();
console.log(edits);
// { "Faap": { "Arroz Branco": { value: "6 cubas G", quantity: 6, ... } } }
```

### 2. Testar Migração
```javascript
// 1. Limpar localStorage novo:
localStorage.removeItem('print_preview_edits_v2');

// 2. Criar dados no formato antigo:
localStorage.setItem('print_preview_edit_state', JSON.stringify({
  "Faap::Arroz Branco::sem_cliente": { editedValue: "6 cubas G" }
}));

// 3. Recarregar página
// 4. Verificar que foi migrado:
const edits = loadAllEdits();
console.log(edits);
// { "Faap": { "Arroz Branco": { value: "6 cubas G", ... } } }
```

### 3. Testar Múltiplos Clientes
```javascript
// Editar mesma receita para clientes diferentes:
// 1. "Arroz Branco" da "Faap" → "6 cubas G"
// 2. "Arroz Branco" do "Museu" → "3 cubas G"

// Verificar estrutura:
const edits = loadAllEdits();
console.log(edits);
// {
//   "Faap": { "Arroz Branco": { quantity: 6, ... } },
//   "Museu": { "Arroz Branco": { quantity: 3, ... } }
// }
```

---

## 📚 Referências

- Arquivo principal: `/components/programacao/PrintPreviewEditor/utils/simpleEditManager.js`
- Componente: `/components/programacao/PrintPreviewEditor/PrintPreviewEditor.refactored.jsx`
- Storage key: `print_preview_edits_v2`
- Storage key antigo: `print_preview_edit_state` (mantido como backup)

---

## 🚀 Status

✅ **Sistema implementado e funcionando**
✅ **Migração automática ativa**
✅ **Sincronização testada**
✅ **Servidor dev rodando sem erros**

**Commit:** `6dbbb87` - "refactor: Remove sistema antigo de chaves e implementa sistema hierárquico simplificado"
