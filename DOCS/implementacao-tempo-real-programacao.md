# 🔄 Implementação de Sincronização em Tempo Real - Programação de Produção

**Data:** 2025-10-23
**Status:** Planejamento
**Prioridade:** Alta

---

## 🎯 Objetivo

Implementar sincronização em tempo real na página de "Programação de Produção" para que as alterações feitas em outros lugares (portal do cliente, página de pedidos, etc.) sejam **refletidas automaticamente** sem necessidade de recarregar a página ou clicar em "Atualizar".

---

## 📊 Situação Atual

### **Como Funciona Hoje:**

1. **Hook `useProgramacaoData`** (`/hooks/programacao/useProgramacaoData.js`):
   - Carrega dados inicialmente com `loadInitialData()`
   - Carrega pedidos com `loadOrdersForWeek(week, year)`
   - Usa **cache** para evitar buscas repetidas
   - **NÃO** tem listeners em tempo real

2. **Entidades** (`/app/api/entities.js`):
   - Métodos disponíveis: `list()`, `getById()`, `create()`, `update()`, `delete()`, `query()`
   - **NÃO** tem método `listen()` ou `subscribe()` para tempo real
   - Usa apenas `getDocs()` e `getDoc()` (busca pontual)

3. **Atualização Manual:**
   - Usuário precisa clicar em "Atualizar Dados"
   - Ou navegar entre semanas (força reload)
   - Ou recarregar a página inteira

### **Problema:**
Se um cliente faz um pedido no portal, ou alguém edita um pedido em outra aba, a página de Programação **não reflete** essas mudanças automaticamente.

---

## 🛠️ O Que Precisa Ser Implementado

### **1️⃣ Adicionar Suporte a Listeners no `entities.js`**

**Arquivo:** `/app/api/entities.js`

**Modificações necessárias:**

#### a) Importar `onSnapshot` do Firestore

```javascript
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot  // ✅ ADICIONAR ESTA IMPORTAÇÃO
} from 'firebase/firestore';
```

#### b) Adicionar método `listen()` na entidade

Adicionar dentro da função `createEntity()`:

```javascript
// Listen to documents with real-time updates
listen: (filters = [], callback) => {
  try {
    let q = collection(db, collectionName);

    // Aplicar filtros se existirem
    if (filters.length > 0) {
      const whereConditions = filters.map(filter =>
        where(filter.field, filter.operator, filter.value)
      );
      q = query(q, ...whereConditions);
    }

    // Criar listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(docs, null);
      },
      (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        callback(null, error);
      }
    );

    // Retornar função de cleanup
    return unsubscribe;
  } catch (error) {
    console.error(`Failed to setup listener for ${collectionName}:`, error);
    throw error;
  }
}
```

**Por que isso é importante?**
- `onSnapshot` é a função do Firebase que **monitora mudanças** em tempo real
- Sempre que um documento é **criado, atualizado ou deletado**, o callback é chamado
- Retorna uma função `unsubscribe` para **limpar** o listener quando não for mais necessário

---

### **2️⃣ Modificar Hook `useProgramacaoData.js`**

**Arquivo:** `/hooks/programacao/useProgramacaoData.js`

**Modificações necessárias:**

#### a) Adicionar método para escutar pedidos em tempo real

```javascript
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

export const useProgramacaoData = () => {
  // ... estados existentes ...

  // ✅ ADICIONAR: Referência para cleanup dos listeners
  const unsubscribeOrdersRef = useRef(null);

  // ✅ MODIFICAR: Substituir loadOrdersForWeek por versão com listener
  const loadOrdersForWeek = useCallback(async (week, year) => {
    // Limpar listener anterior se existir
    if (unsubscribeOrdersRef.current) {
      unsubscribeOrdersRef.current();
      unsubscribeOrdersRef.current = null;
    }

    setLoading(prev => ({ ...prev, orders: true }));

    try {
      // ✅ Usar listener ao invés de query pontual
      const unsubscribe = Order.listen(
        [
          { field: 'week_number', operator: '==', value: week },
          { field: 'year', operator: '==', value: year }
        ],
        (ordersData, error) => {
          if (error) {
            console.error('Erro ao escutar pedidos:', error);
            setOrders([]);
          } else {
            setOrders(ordersData);
            setLoading(prev => ({ ...prev, orders: false }));
          }
        }
      );

      // Guardar referência para cleanup
      unsubscribeOrdersRef.current = unsubscribe;

    } catch (error) {
      console.error('Erro ao configurar listener de pedidos:', error);
      setOrders([]);
      setLoading(prev => ({ ...prev, orders: false }));
    }
  }, []);

  // ✅ ADICIONAR: Cleanup quando componente desmontar
  useEffect(() => {
    return () => {
      if (unsubscribeOrdersRef.current) {
        unsubscribeOrdersRef.current();
      }
    };
  }, []);

  // ... resto do código ...
}
```

**O que mudou?**
- `Order.query()` → `Order.listen()` (mudou de busca pontual para listener)
- Adicionamos `unsubscribeOrdersRef` para guardar a função de cleanup
- Limpamos o listener anterior quando mudamos de semana
- Limpamos o listener quando o componente desmonta (cleanup do useEffect)

---

### **3️⃣ (Opcional) Adicionar Listeners para Customers e Recipes**

Se você também quiser que mudanças em **clientes** e **receitas** sejam refletidas em tempo real:

```javascript
const unsubscribeCustomersRef = useRef(null);
const unsubscribeRecipesRef = useRef(null);

const loadInitialData = useCallback(async () => {
  setLoading(prev => ({ ...prev, initial: true }));

  try {
    // Listener para Customers
    const unsubCustomers = Customer.listen([], (data, error) => {
      if (!error) setCustomers(data);
    });
    unsubscribeCustomersRef.current = unsubCustomers;

    // Listener para Recipes
    const unsubRecipes = Recipe.listen([], (data, error) => {
      if (!error) setRecipes(data);
    });
    unsubscribeRecipesRef.current = unsubRecipes;

  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
  } finally {
    setLoading(prev => ({ ...prev, initial: false }));
  }
}, []);

// Cleanup ao desmontar
useEffect(() => {
  return () => {
    if (unsubscribeCustomersRef.current) unsubscribeCustomersRef.current();
    if (unsubscribeRecipesRef.current) unsubscribeRecipesRef.current();
    if (unsubscribeOrdersRef.current) unsubscribeOrdersRef.current();
  };
}, []);
```

---

## 📝 Resumo das Mudanças

| Arquivo | O Que Mudar | Por Que |
|---------|-------------|---------|
| `/app/api/entities.js` | Importar `onSnapshot` e adicionar método `listen()` | Habilitar escuta em tempo real do Firestore |
| `/hooks/programacao/useProgramacaoData.js` | Trocar `Order.query()` por `Order.listen()` | Receber atualizações automáticas de pedidos |
| `/hooks/programacao/useProgramacaoData.js` | Adicionar `useRef` para armazenar `unsubscribe` | Permitir cleanup dos listeners |
| `/hooks/programacao/useProgramacaoData.js` | Adicionar cleanup no `useEffect` | Evitar memory leaks ao desmontar |

---

## ✅ Benefícios Após Implementação

1. ✅ **Atualizações Automáticas:** Qualquer mudança em pedidos aparece instantaneamente
2. ✅ **Múltiplas Abas:** Se abrir em 2 abas, ambas ficam sincronizadas
3. ✅ **Portal + Admin:** Mudanças no portal do cliente aparecem na programação automaticamente
4. ✅ **Experiência Moderna:** Interface sempre atualizada sem refresh manual
5. ✅ **Menos Erros:** Evita trabalhar com dados desatualizados

---

## ⚠️ Considerações Importantes

### **1. Performance**
- Listeners do Firestore consomem **leituras de documentos** cada vez que há mudança
- Se muitos usuários estiverem conectados simultaneamente, pode aumentar custos
- **Solução:** Usar filtros precisos (semana + ano) para reduzir scope

### **2. Memory Leaks**
- **SEMPRE** limpar listeners com `unsubscribe()` quando componente desmontar
- **SEMPRE** limpar listener anterior antes de criar um novo (ao navegar semanas)

### **3. Estados de Loading**
- O primeiro callback do listener pode demorar um pouco
- Manter estado de `loading` até receber primeiro batch de dados

### **4. Cache**
- Com listeners em tempo real, o **cache não é mais necessário**
- Pode remover `ordersCache` do hook se implementar listeners
- OU manter cache apenas para dados históricos (semanas antigas)

---

## 🧪 Como Testar

Após implementar:

1. **Teste 1: Múltiplas Abas**
   - Abra a Programação em 2 abas do navegador
   - Na aba 1, clique em "Atualizar Dados"
   - Vá no portal do cliente (aba 2) e crie um pedido
   - Volte para a aba 1 da Programação
   - **Resultado esperado:** O novo pedido aparece automaticamente

2. **Teste 2: Edição de Pedido**
   - Abra a Programação
   - Em outra aba, edite um pedido existente (quantidade, itens)
   - **Resultado esperado:** Mudanças aparecem na Programação sem refresh

3. **Teste 3: Deletar Pedido**
   - Abra a Programação
   - Delete um pedido em outra aba
   - **Resultado esperado:** Pedido desaparece da Programação

4. **Teste 4: Navegação entre Semanas**
   - Navegue para semana 42
   - Navegue para semana 43
   - Navegue de volta para semana 42
   - **Resultado esperado:** Não deve haver memory leak, dados carregam corretamente

---

## 📂 Arquivos a Modificar

1. ✅ `/app/api/entities.js` - Adicionar método `listen()`
2. ✅ `/hooks/programacao/useProgramacaoData.js` - Trocar para listeners
3. 📄 Opcional: Criar hook customizado `/hooks/useRealtimeOrders.js` (se quiser abstrair a lógica)

---

## 🚀 Ordem de Implementação Sugerida

### **Fase 1: Base (Essencial)**
1. Modificar `/app/api/entities.js` - adicionar `listen()`
2. Modificar `/hooks/programacao/useProgramacaoData.js` - adicionar listener para Orders
3. Testar com múltiplas abas

### **Fase 2: Otimização (Recomendado)**
1. Adicionar listeners para Customers e Recipes
2. Remover cache de orders (não mais necessário)
3. Adicionar indicador visual de "sincronização em tempo real ativa"

### **Fase 3: Polimento (Opcional)**
1. Criar hook `useRealtimeOrders()` separado
2. Adicionar animação quando novos pedidos aparecem
3. Mostrar notificação "Novo pedido recebido!"

---

## 💡 Exemplo de Código Completo

### **entities.js (trecho)**

```javascript
listen: (filters = [], callback) => {
  try {
    let q = collection(db, collectionName);

    if (filters.length > 0) {
      const whereConditions = filters.map(filter =>
        where(filter.field, filter.operator, filter.value)
      );
      q = query(q, ...whereConditions);
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(docs, null);
      },
      (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        callback(null, error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error(`Failed to setup listener for ${collectionName}:`, error);
    throw error;
  }
}
```

### **useProgramacaoData.js (trecho)**

```javascript
const unsubscribeOrdersRef = useRef(null);

const loadOrdersForWeek = useCallback(async (week, year) => {
  if (unsubscribeOrdersRef.current) {
    unsubscribeOrdersRef.current();
  }

  setLoading(prev => ({ ...prev, orders: true }));

  const unsubscribe = Order.listen(
    [
      { field: 'week_number', operator: '==', value: week },
      { field: 'year', operator: '==', value: year }
    ],
    (ordersData, error) => {
      if (error) {
        console.error('Erro:', error);
        setOrders([]);
      } else {
        setOrders(ordersData);
      }
      setLoading(prev => ({ ...prev, orders: false }));
    }
  );

  unsubscribeOrdersRef.current = unsubscribe;
}, []);

useEffect(() => {
  return () => {
    if (unsubscribeOrdersRef.current) {
      unsubscribeOrdersRef.current();
    }
  };
}, []);
```

---

**Criado por:** Claude Code
**Versão:** 1.0
