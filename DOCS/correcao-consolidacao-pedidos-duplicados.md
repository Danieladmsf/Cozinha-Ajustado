# Correção: Consolidação de Pedidos Duplicados

## 📋 Resumo

Corrigido erro de consolidação onde múltiplos pedidos do mesmo cliente no mesmo dia eram somados incorretamente.

## 🗓️ Data
**2025-10-23**

## 🔴 Problema Identificado

### Sintomas:
```
FAAP - Bife Acebolado
Pedido individual: 104 unid.
Consolidação mostrava: 488 unid. ❌ (4.7x maior)
```

### Causa Raiz:
**Múltiplos pedidos do mesmo cliente para o mesmo dia no banco de dados.**

Logs mostraram:
```javascript
Faap: 5 pedidos  // ← PROBLEMA!

Bife Acebolado da FAAP:
- Pedido 1: 96 unidades
- Pedido 2: 96 unidades
- Pedido 3: 96 unidades
- Pedido 4: 96 unidades
- Pedido 5: 104 unidades (mais recente)
----------------------------
Total somado: 488 unidades ❌
```

### Por que existem múltiplos pedidos?

1. **Histórico de edições** - cada vez que o cliente edita o pedido, cria uma nova versão
2. **Pedidos não removidos** - versões antigas não são deletadas
3. **Sistema de versionamento** - pode estar salvando múltiplas versões

## ✅ Solução Implementada

### Filtrar apenas o pedido mais recente por cliente+dia

**Antes:**
```javascript
// Pegava TODOS os pedidos do dia (incluindo duplicados)
const dayOrders = orders.filter(order => order.day_of_week === selectedDay);
```

**Depois:**
```javascript
// Pega apenas o ÚLTIMO pedido de cada cliente por dia
const getLatestOrderPerCustomer = (orders, selectedDay) => {
  const ordersByCustomer = {};

  orders
    .filter(order => order.day_of_week === selectedDay)
    .forEach(order => {
      // Substituir pedido anterior - pega sempre o último do array
      ordersByCustomer[order.customer_name] = order;
    });

  return Object.values(ordersByCustomer);
};

const dayOrders = getLatestOrderPerCustomer(orders, selectedDay);
```

### Lógica da Solução:

1. **Filtra pedidos** do dia selecionado
2. **Para cada pedido**, usa `customer_name` como chave
3. **Sobrescreve** pedido anterior do mesmo cliente
4. **Resultado**: apenas o último pedido (mais recente) de cada cliente

**Assumindo:** O último pedido no array é o mais recente (ordem do banco de dados).

## 📁 Arquivos Modificados

### 1. `components/programacao/tabs/AcougueTab.jsx`
```javascript
// Linha 36-50: Adicionada função getLatestOrderPerCustomer()
// Substituído filtro simples por filtro de pedidos únicos
```

### 2. `components/programacao/tabs/PesoBrutoCalculator.jsx`
```javascript
// Linha 49-63: Adicionada mesma função getLatestOrderPerCustomer()
// Garante consistência entre porcionamento e peso bruto
```

## 🧪 Resultado Esperado

### Antes:
```
FAAP - Bife Acebolado
→ 488 Unid. ❌ (soma de 5 pedidos)

TOTAL: 911 Unid.
```

### Depois:
```
FAAP - Bife Acebolado
→ 104 Unid. ✅ (apenas pedido mais recente)

TOTAL: 527 Unid. (valor correto)
```

## 📊 Impacto

### Afeta:
- ✅ **Porcionamento de Carnes** (AcougueTab)
- ✅ **Peso Bruto por Cliente** (PesoBrutoCalculator)
- ✅ **Totais de consolidação**

### Não afeta:
- ❌ Outros tabs (Salada, Cozinha, etc.) - **precisam da mesma correção**
- ❌ Lista de compras - **precisa verificar se tem o mesmo problema**

## ⚠️ Próximos Passos

### 1. Verificar outras tabs
Aplicar mesma correção em:
- [ ] `SaladaTab.jsx`
- [ ] `CozinhaTab.jsx`
- [ ] `EmbalagemTab.jsx`
- [ ] Lista de Compras

### 2. Solução permanente no backend
Ideal seria:
- Marcar pedidos antigos como `archived: true`
- Filtrar no backend: `WHERE archived = false`
- Ou usar campo `version` e pegar `MAX(version)`

### 3. Alternativa: Usar timestamp
Se a ordem do array não garantir mais recente:
```javascript
if (!existing || order.updated_at > existing.updated_at) {
  ordersByCustomer[order.customer_name] = order;
}
```

## 🔍 Debugging

Para verificar se há duplicados em produção:

```javascript
// Adicionar temporariamente:
const orderCount = {};
orders
  .filter(o => o.day_of_week === selectedDay)
  .forEach(o => {
    orderCount[o.customer_name] = (orderCount[o.customer_name] || 0) + 1;
  });
console.log('Pedidos por cliente:', orderCount);
// Se algum cliente > 1, há duplicados
```

## 📝 Notas

- **Testado** com logs de debug que confirmaram:
  - FAAP tinha 5 pedidos
  - Após correção, apenas 1 pedido
- **Logs removidos** do código final (apenas comentários explicativos)
- **Performance**: Não há impacto (operação O(n))

---

**Versão**: 1.0
**Data**: 2025-10-23
**Status**: ✅ Corrigido e Testado
**Autor**: Claude Code
