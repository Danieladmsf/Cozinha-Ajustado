# 🔄 Sincronização de Ordem dos Blocos com Firebase

## 📋 Problema Resolvido

**ANTES:** A ordem dos blocos (cards) era salva apenas no **localStorage**, então:
- ✅ No seu computador: ordem personalizada
- ❌ Em outro computador/navegador: ordem padrão do código

**AGORA:** A ordem é sincronizada com **Firebase**, então:
- ✅ Mesma ordem em todos os dispositivos
- ✅ Sincronização em tempo real
- ✅ Persiste por semana/dia

---

## 🎯 Como Funciona

### 1. Salvamento Automático

Quando você reorganiza os blocos (drag-and-drop no sidebar):

```
1. Detecta mudança na ordem
2. Salva no localStorage (cache local)
3. Salva no Firebase (sync entre dispositivos)
   - Coleção: programming_block_order
   - Documento: Ex: "2025_W46_Seg"
   - Dados: { order: ["salada", "acougue", "empresa-faap", ...] }
```

### 2. Carregamento Inteligente

Ao abrir o Editor de Impressão:

```
Prioridade de carregamento:
1. 🟢 Firebase (se disponível) → usa ordem sincronizada
2. 🟡 localStorage (fallback) → usa ordem local
3. ⚪ Ordem padrão do código → se não houver nenhuma salva
```

### 3. Sincronização em Tempo Real

Se você ou outra pessoa reordena os blocos:

```
- 📡 Firebase detecta mudança
- 🔄 Listener atualiza ordem automaticamente
- ✅ Todos os dispositivos veem a mesma ordem
```

---

## 📦 Arquivos Modificados

### 1. **simpleEditManager.js** (ADICIONADO)
**Localização:** `/components/programacao/PrintPreviewEditor/utils/simpleEditManager.js`

**Novas Funções:**
```javascript
// Salvar ordem no Firebase
saveBlockOrderToFirebase(weekDayKey, blockOrder)

// Carregar ordem do Firebase
loadBlockOrderFromFirebase(weekDayKey)

// Listener em tempo real
subscribeToBlockOrder(weekDayKey, callback)

// Salvar (localStorage + Firebase)
saveBlockOrder(blockOrder, weekDayKey)

// Carregar do localStorage
loadBlockOrderFromLocal()
```

### 2. **useFontSizeManager.js** (MODIFICADO)
**Localização:** `/components/programacao/PrintPreviewEditor/hooks/useFontSizeManager.js`

**Mudanças:**
- ✅ Importa funções de `simpleEditManager`
- ✅ `savePageOrder()` agora aceita `weekDayKey` e salva no Firebase
- ✅ `loadSavedOrder()` usa `loadBlockOrderFromLocal()`

### 3. **PrintPreviewEditor.refactored.jsx** (MODIFICADO)
**Localização:** `/components/programacao/PrintPreviewEditor/PrintPreviewEditor.refactored.jsx`

**Mudanças:**
- ✅ Importa `loadBlockOrderFromFirebase` e `subscribeToBlockOrder`
- ✅ Novo estado: `firebaseBlockOrder`
- ✅ useEffect para carregar ordem do Firebase ao montar
- ✅ Listener em tempo real para sincronização
- ✅ `initialBlocks` prioriza Firebase sobre localStorage
- ✅ `savePageOrder()` recebe `weekDayKey` para salvar no Firebase

---

## 🔍 Estrutura no Firebase

### Coleção: `programming_block_order`

```
📁 programming_block_order/
  📄 2025_W46_Seg
     {
       order: [
         "salada",
         "acougue",
         "embalagem-padrao",
         "embalagem-refogado",
         "embalagem-acompanhamento",
         "empresa-einstein",
         "empresa-nestle",
         "empresa-itamarati",
         "empresa-faap",
         "empresa-museu"
       ],
       lastModified: "2025-11-18T19:30:00.000Z",
       modifiedBy: "local-user"
     }
```

### Identificador do Documento (weekDayKey)

Formato: `YYYY_WWW_DDD`
- `YYYY`: Ano (ex: 2025)
- `WWW`: Semana (ex: W46)
- `DDD`: Dia (ex: Seg, Ter, Qua, Qui, Sex, Sab, Dom)

Exemplos:
- `2025_W46_Seg` → Semana 46, Segunda-feira
- `2025_W46_Ter` → Semana 46, Terça-feira

**Nota:** Cada dia da semana tem sua própria ordem salva!

---

## 🎨 Ordem Padrão do Código

Se não houver ordem salva (Firebase ou localStorage), usa esta ordem:

### Ordem de Criação dos Blocos

```javascript
// 1. Blocos de Empresas (clientes)
porEmpresaData.forEach(cliente => {
  blocks.push({
    id: `empresa-${normalizedName}`,
    type: 'empresa',
    title: cliente.customer_name
  });
});

// 2. Bloco Salada
blocks.push({
  id: 'salada',
  type: 'detailed-section',
  title: 'Salada'
});

// 3. Bloco Açougue
blocks.push({
  id: 'acougue',
  type: 'detailed-section',
  title: 'Porcionamento Carnes'
});

// 4. Blocos Embalagem (por categoria)
['PADRÃO', 'REFOGADO', 'ACOMPANHAMENTO'].forEach(category => {
  blocks.push({
    id: `embalagem-${category.toLowerCase()}`,
    type: 'embalagem-category',
    title: category
  });
});
```

**Resultado:**
1. Einstein, Nestlé, Itamarati, Faap, Museu (ordem alfabética do Firebase)
2. Salada
3. Porcionamento Carnes
4. PADRÃO
5. REFOGADO
6. ACOMPANHAMENTO

---

## 🚀 Como Usar

### Reorganizar Blocos

1. Abra o Editor de Impressão
2. No sidebar esquerdo, seção "Blocos"
3. Arraste e solte para reordenar
4. **Automático:** Salva no Firebase imediatamente
5. **Sincronização:** Outros dispositivos veem a mudança em tempo real

### Resetar Ordem

Para voltar à ordem padrão do código:

```javascript
// No console do navegador (F12):
localStorage.removeItem('print_preview_page_order');
// Depois recarregar a página
```

Ou deletar o documento do Firebase manualmente.

---

## 🔧 Debug

### Ver Ordem Atual (localStorage)

```javascript
// Console do navegador (F12):
const order = JSON.parse(localStorage.getItem('print_preview_page_order'));
console.log(order);
// ["salada", "acougue", "empresa-faap", ...]
```

### Ver Ordem no Firebase

```javascript
// Verificar no Firebase Console:
// Firestore > programming_block_order > 2025_W46_Seg
```

### Logs do Sistema

O sistema loga automaticamente:

```
[useFontSizeManager] 💾 Salvando ordem: {
  blocks: 10,
  weekDayKey: "2025_W46_Seg",
  order: ["salada", "acougue", ...]
}

[PrintPreviewEditor] 📡 Firebase ordem carregada: {
  weekDayKey: "2025_W46_Seg",
  numBlocks: 10
}
```

---

## ✅ Benefícios

### 1. **Sincronização entre Dispositivos**
- ✅ Ordem consistente em todos os computadores
- ✅ Não precisa reorganizar toda vez
- ✅ Equipe vê a mesma ordem

### 2. **Tempo Real**
- ✅ Mudanças aparecem instantaneamente
- ✅ Não precisa recarregar página
- ✅ Colaboração em tempo real

### 3. **Persistência por Dia**
- ✅ Cada dia tem sua própria ordem
- ✅ Ordem não se perde ao trocar de semana
- ✅ Histórico preservado

### 4. **Fallback Inteligente**
- ✅ Firebase indisponível? Usa localStorage
- ✅ localStorage vazio? Usa ordem padrão
- ✅ Sempre funciona

---

## 📊 Comparação

| Aspecto | Antes (localStorage) | Agora (Firebase) |
|---------|---------------------|------------------|
| **Dispositivos** | ❌ Apenas local | ✅ Todos sincronizados |
| **Tempo Real** | ❌ Não | ✅ Sim |
| **Persistência** | ✅ Sim (local) | ✅ Sim (cloud) |
| **Colaboração** | ❌ Não | ✅ Sim |
| **Fallback** | ⚠️ Ordem padrão | ✅ localStorage → padrão |
| **Por Dia** | ❌ Única ordem | ✅ Ordem por dia |

---

## 🎓 Exemplo de Uso

### Cenário: Equipe de Cozinha

**Segunda-feira:**
```
João (computador 1):
  1. Abre Editor de Impressão
  2. Reordena: Salada primeiro, depois clientes
  3. Salva automaticamente no Firebase

Maria (computador 2):
  1. Abre Editor de Impressão
  2. ✅ Vê mesma ordem que João configurou
  3. Não precisa reorganizar!
```

**Terça-feira:**
```
Pedro (tablet):
  1. Abre Editor de Impressão
  2. Reordena de forma diferente (terça tem outros clientes)
  3. ✅ Não afeta ordem de segunda-feira
  4. Cada dia tem sua configuração
```

---

## 🔐 Segurança

### Regras do Firestore

**TODO:** Adicionar regras de segurança no Firebase:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /programming_block_order/{weekDayKey} {
      // Permitir leitura para todos
      allow read: if true;

      // Permitir escrita apenas para usuários autenticados
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📚 Referências

- Arquivo principal: `/components/programacao/PrintPreviewEditor/utils/simpleEditManager.js`
- Hook: `/components/programacao/PrintPreviewEditor/hooks/useFontSizeManager.js`
- Componente: `/components/programacao/PrintPreviewEditor/PrintPreviewEditor.refactored.jsx`
- Coleção Firebase: `programming_block_order`
- localStorage key: `print_preview_page_order`

---

## 🚀 Status

✅ **Implementado em:** 18/11/2025
✅ **Testado:** Pendente
✅ **Firebase:** Configurado
✅ **Sincronização:** Ativa

---

**Próximos Passos:**
1. Testar sincronização entre dispositivos
2. Adicionar regras de segurança no Firebase
3. Testar com múltiplos usuários simultaneamente
