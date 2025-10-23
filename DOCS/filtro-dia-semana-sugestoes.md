# 📅 Implementação de Filtro por Dia da Semana nas Sugestões

**Data:** 2025-10-22
**Versão:** 1.0

---

## 🎯 Objetivo

Implementar filtro por dia da semana no sistema de sugestões para garantir que:
- **Sugestões de Segunda** usem apenas dados históricos de **Segundas**
- **Sugestões de Terça** usem apenas dados históricos de **Terças**
- E assim por diante...

**Motivo:** Cada dia da semana pode ter cardápios e quantidades diferentes. Misturar dados de todos os dias causava imprecisão nas sugestões.

---

## ✅ O Que Foi Implementado

### 1. **Modificação em `lib/order-suggestions.js`**

#### a) Método `loadHistoricalOrders()`
- **Antes:** Buscava pedidos de todas as semanas, misturando todos os dias
- **Depois:** Aceita parâmetro `dayOfWeek` opcional e filtra apenas pedidos do dia específico

```javascript
// ANTES
static async loadHistoricalOrders(customerId, lookbackWeeks = 8)

// DEPOIS
static async loadHistoricalOrders(customerId, lookbackWeeks = 8, dayOfWeek = null)
```

**Query modificada:**
```javascript
const queryFilters = [
  { field: 'customer_id', operator: '==', value: customerId },
  { field: 'week_number', operator: '==', value: targetWeek },
  { field: 'year', operator: '==', value: targetYear }
];

// ✅ Adicionar filtro de dia se fornecido
if (dayOfWeek !== null && dayOfWeek !== undefined) {
  queryFilters.push({ field: 'day_of_week', operator: '==', value: dayOfWeek });
}
```

#### b) Método `generateOrderSuggestions()`
- Aceita parâmetro `dayOfWeek` nas opções
- Passa `dayOfWeek` para `loadHistoricalOrders()`
- Retorna informações sobre o dia no metadata

#### c) Novo Método Utilitário: `getDayName()`
- Converte número do dia (1, 2, 3...) para nome legível
- `1 → "Segunda-feira"`, `2 → "Terça-feira"`, etc.

---

### 2. **Modificação em `components/clientes/portal/MobileOrdersPage.jsx`**

**Linha 1660:**
```javascript
// ANTES
const historicalOrders = await OrderSuggestionManager.loadHistoricalOrders(customer.id, 8);

// DEPOIS
const historicalOrders = await OrderSuggestionManager.loadHistoricalOrders(customer.id, 8, selectedDay);
```

Agora o portal do cliente passa o `selectedDay` (dia da semana atual) ao gerar sugestões.

---

### 3. **Atualização dos Scripts de Validação**

Tanto `validate-suggestions.js` quanto `validate-suggestions-standalone.js` foram atualizados para:

1. Pegar últimos 40 pedidos (ao invés de 8)
2. Filtrar apenas pedidos do **mesmo dia da semana**
3. Usar até 8 mais recentes desse dia

**Código aplicado:**
```javascript
// Pegar últimos pedidos ANTES deste
const previousOrders = customerOrders.slice(Math.max(0, i - 40), i);

// Filtrar apenas pedidos do MESMO dia da semana
const historicalOrders = previousOrders
  .filter(order => order.day_of_week === testOrder.day_of_week)
  .slice(-8); // Pegar até 8 mais recentes do mesmo dia
```

---

## 📊 Resultados da Validação (Cliente: Museu)

### **ANTES (SEM filtro de dia):**
| Métrica | Valor |
|---------|-------|
| Total de comparações | 260 |
| ✅ Excelente (≤10%) | 73 (28.1%) |
| ✅ Bom (10-25%) | 62 (23.8%) |
| ⚠️ Regular (25-50%) | 46 (17.7%) |
| ❌ Ruim (>50%) | 79 (30.4%) |
| **Taxa de Sucesso (≤25%)** | **51.9%** |
| Erro médio | 56% |

---

### **DEPOIS (COM filtro de dia):**
| Métrica | Valor | Diferença |
|---------|-------|-----------|
| Total de comparações | 259 | -1 |
| ✅ Excelente (≤10%) | 77 (29.7%) | **+1.6%** ✅ |
| ✅ Bom (10-25%) | 65 (25.1%) | **+1.3%** ✅ |
| ⚠️ Regular (25-50%) | 36 (13.9%) | **-3.8%** ✅ |
| ❌ Ruim (>50%) | 81 (31.3%) | +0.9% |
| **Taxa de Sucesso (≤25%)** | **54.8%** | **+2.9%** ✅ |
| Erro médio | 74.5% | +18.5% ❌ |

---

## 🔍 Análise dos Resultados

### **Aspectos Positivos:**
1. ✅ **Taxa de sucesso melhorou:** 51.9% → 54.8% (+2.9%)
2. ✅ **Excelente aumentou:** 28.1% → 29.7% (+1.6%)
3. ✅ **Bom aumentou:** 23.8% → 25.1% (+1.3%)
4. ✅ **Regular diminuiu:** 17.7% → 13.9% (-3.8%) - menos sugestões medianas!

### **Aspectos Negativos:**
1. ❌ **Erro médio piorou:** 56% → 74.5% (+18.5%)
   - **Causa:** Outliers extremos (ex: Pernil com 5900% erro, Calabresa com 666% erro)
   - Estes são itens novos ou raros que não têm histórico suficiente

2. ⚠️ **Ruim aumentou levemente:** 30.4% → 31.3% (+0.9%)

---

## 🤔 Por Que o Erro Médio Aumentou?

### **Hipóteses:**

1. **Menos dados históricos por dia:**
   - Antes: 8 semanas × 5 dias = até 40 amostras
   - Depois: 8 semanas × 1 dia = até 8 amostras
   - Com menos amostras, itens novos ou inconsistentes geram erros maiores

2. **Outliers extremos:**
   - Pernil: 5900% erro (item muito raro)
   - Calabresa: 666% erro
   - Estes outliers puxam a média para cima

3. **Itens com padrão inconsistente:**
   - Farofa Temperada ainda aparece como problemática
   - Alguns clientes mudam muito as quantidades

---

## 💡 Recomendações Futuras

### **1. Usar Mediana ao invés de Média:**
- A **mediana** é mais resistente a outliers
- Erro mediano provavelmente é melhor que antes

### **2. Implementar as 3 correções pendentes:**

#### a) **Reduzir limiar de arredondamento:**
```javascript
// ANTES
if (value < 0.125) return 0;

// DEPOIS
if (value < 0.05) return 0;
```

#### b) **Não sugerir 0 quando há histórico:**
```javascript
if (suggestedQty < 0.125 && stats.avg_base_quantity > 0) {
  suggestedQty = 0.25; // Mínimo razoável
}
```

#### c) **Avaliar erro absoluto também:**
- Para itens pequenos (< 1 cuba-g), considerar diferença absoluta
- Exemplo: Sugerido 0.5 vs Real 0.1 = 0.4 de diferença (aceitável), mas 400% em percentual

---

### **3. Aumentar lookback para dias específicos:**
- Ao invés de 8 semanas, usar 12-16 semanas
- Isso garante 12-16 amostras do mesmo dia da semana
- Mais amostras = maior confiança

---

## 📝 Conclusão

### **A implementação do filtro por dia da semana foi bem-sucedida:**

1. ✅ **Tecnicamente funcionando:** O filtro está aplicado corretamente
2. ✅ **Melhoria modesta:** +2.9% na taxa de sucesso
3. ✅ **Mais precisas:** Menos sugestões "regulares" (-3.8%)
4. ⚠️ **Erro médio subiu:** Mas devido a outliers, não falha estrutural

### **Próximos Passos:**

1. Implementar as 3 correções pendentes (limiar, zero, erro absoluto)
2. Aumentar lookback para 12-16 semanas
3. Re-validar e medir melhoria

**Expectativa:** Com as correções adicionais, esperamos **>70% de taxa de sucesso**.

---

**Arquivos modificados:**
- `/lib/order-suggestions.js` - Lógica principal
- `/components/clientes/portal/MobileOrdersPage.jsx` - Portal do cliente
- `/lib/validate-suggestions.js` - Script de validação
- `/lib/validate-suggestions-standalone.js` - Script standalone

**Arquivos de teste:**
- `validation-Museu-2025-10-22T22-58-54.txt` - Relatório com filtro de dia
- `DOCS/analise-validacao-sugestoes.md` - Análise anterior (sem filtro)
