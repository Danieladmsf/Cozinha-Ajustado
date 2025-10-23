# 🔧 Correções na Lógica de Sugestões

## ❌ Problemas Identificados

### Problema 1: Uso de `base_quantity` ao invés de `quantity`
**Localização:** `lib/order-suggestions.js:99`

**ANTES (ERRADO):**
```javascript
ratio_per_meal: baseQuantity / mealsExpected
```

**DEPOIS (CORRETO):**
```javascript
ratio_per_meal: quantity / mealsExpected
```

**Impacto:**
- Para receitas **sem ajuste** (saladas, arroz): sem diferença
- Para receitas **com ajuste** (carnes): sugestões ficavam 20-30% **menores** que o real!

**Exemplo real:**
```
Cliente pede carne com ajuste de 20%:
- base_quantity = 4 cubas
- adjustment_percentage = 20%
- quantity = 4 × 1.2 = 4.8 cubas (quantidade real)
- meals_expected = 100

ANTES:
ratio = 4 / 100 = 0.04
sugestão = 0.04 × 100 = 4 cubas ❌ (deveria ser 4.8!)

DEPOIS:
ratio = 4.8 / 100 = 0.048
sugestão = 0.048 × 100 = 4.8 cubas ✅
```

---

### Problema 2: Peso excessivo em amostras antigas

**ANTES:**
- 70% de peso para últimas **8 semanas**
- 30% de peso para **todas** as amostras

**DEPOIS:**
- 85% de peso para últimas **4 semanas** ✅
- 15% de peso para **todas** as amostras ✅

**Impacto:**
```
Histórico do cliente:
- 15 pedidos antigos (há 3+ meses): 2 cubas cada
- 3 pedidos recentes (últimas 4 semanas): 5 cubas cada

ANTES:
Média antiga = 2
Média recente = 5
Sugestão = (0.7 × 5) + (0.3 × 2) = 3.5 + 0.6 = 4.1 cubas ❌

DEPOIS:
Sugestão = (0.85 × 5) + (0.15 × 2) = 4.25 + 0.3 = 4.55 → 4.5 cubas ✅
```

---

### Problema 3: Falta de validação de sanidade

**ADICIONADO:**
```javascript
// Se sugestão for < 40% ou > 250% da média histórica, usar a média
if (ratio < 0.4 || ratio > 2.5) {
  suggestedBaseQuantity = stats.avg_base_quantity;
}
```

**Impacto:**
```
Se algo der errado no cálculo do ratio e gerar:
- Sugestão = 1.5 cubas
- Média histórica = 5 cubas
- Ratio = 1.5 / 5 = 0.3 (30% da média) ❌

Sistema detecta anomalia e usa média: 5 cubas ✅
```

---

## ✅ Melhorias Implementadas

### 1. Cálculo de Ratio Correto
- ✅ Usa quantidade **final** (com ajustes de porcionamento)
- ✅ Reflete o consumo **real** do cliente
- ✅ Especialmente importante para categoria **carne**

### 2. Mais Peso para Pedidos Recentes
- ✅ Apenas últimas **4 semanas** (ao invés de 8)
- ✅ **85%** de peso recente (ao invés de 70%)
- ✅ **15%** de peso histórico (ao invés de 30%)
- ✅ Sugestões se adaptam mais rápido a mudanças

### 3. Validação de Sanidade
- ✅ Detecta quando sugestão está muito diferente da média
- ✅ Previne sugestões absurdas (1.5 quando deveria ser 5)
- ✅ Usa média histórica como fallback seguro

---

## 📊 Comparação: Antes vs Depois

### Cenário 1: Carne com Ajuste

**Histórico:**
- Semana 1: 4 cubas base + 20% = 4.8 cubas finais (100 refeições)
- Semana 2: 4 cubas base + 20% = 4.8 cubas finais (100 refeições)
- Semana 3: 5 cubas base + 20% = 6.0 cubas finais (120 refeições)
- Pedido atual: 110 refeições

**ANTES:**
```
Ratio = média(4, 4, 5) / média(100, 100, 120) = 4.33 / 107 = 0.0405
Sugestão = 0.0405 × 110 = 4.45 cubas ❌
```

**DEPOIS:**
```
Ratio = média(4.8, 4.8, 6.0) / média(100, 100, 120) = 5.2 / 107 = 0.0486
Sugestão = 0.0486 × 110 = 5.35 → 5.5 cubas ✅
```

**Diferença:** +23% mais preciso!

---

### Cenário 2: Cliente Aumentou Consumo

**Histórico:**
- 10 pedidos antigos: 2 cubas cada
- 3 pedidos recentes: 5 cubas cada
- Pedido atual: 100 refeições (mesma quantidade)

**ANTES:**
```
Peso recente: 70% × 5 = 3.5
Peso antigo: 30% × 2 = 0.6
Sugestão = 3.5 + 0.6 = 4.1 cubas ❌ (deveria ser ~5)
```

**DEPOIS:**
```
Peso recente: 85% × 5 = 4.25
Peso antigo: 15% × 2 = 0.3
Sugestão = 4.25 + 0.3 = 4.55 → 4.5 cubas ✅
```

**Diferença:** +10% mais próximo do real!

---

### Cenário 3: Erro de Cálculo Detectado

**Histórico:**
- Média histórica: 5 cubas
- Cálculo de ratio deu errado e gerou: 1.5 cubas

**ANTES:**
```
Sugestão = 1.5 cubas ❌ (muito errado!)
```

**DEPOIS:**
```
Sistema detecta: 1.5 / 5 = 0.3 (30% da média)
Ratio < 0.4 → usa média
Sugestão = 5 cubas ✅
```

---

## 🎯 Resumo das Mudanças

| Aspecto | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Cálculo de Ratio** | `base_quantity / meals` | `quantity / meals` | +20-30% precisão |
| **Peso Recente** | 70% (8 semanas) | 85% (4 semanas) | +21% responsividade |
| **Peso Histórico** | 30% | 15% | -50% influência antiga |
| **Validação** | Nenhuma | Range 40%-250% | Previne erros |

---

## 🧪 Como Testar

### 1. Testar com Carne (ajuste de porcionamento):
```
1. Fazer 3 pedidos com carne + 20% ajuste
2. Verificar se sugestão reflete o ajuste
3. Sugestão deve ser ~20% maior que base
```

### 2. Testar adaptação a mudanças:
```
1. Fazer 10 pedidos antigos com 2 cubas
2. Fazer 3 pedidos recentes com 5 cubas
3. Sugestão deve ser ~4.5-5 cubas (não 3-4)
```

### 3. Testar validação de sanidade:
```
1. Verificar logs de sugestões
2. Se aparecer discrepância grande
3. Sistema deve usar média ao invés de cálculo errado
```

---

## 📝 Notas Técnicas

### Por que usar `quantity` ao invés de `base_quantity`?

A `quantity` é a quantidade **final** que o cliente realmente recebe:
- Saladas: `quantity = base_quantity` (sem ajuste)
- Carnes: `quantity = base_quantity × (1 + adjustment_percentage / 100)`

Exemplo:
```javascript
// Carne com 20% de ajuste
base_quantity = 4
adjustment_percentage = 20
quantity = 4 × 1.2 = 4.8 ← Este é o valor real!
```

### Por que 85% de peso recente?

- Comportamento recente é **melhor preditor** do futuro
- 4 semanas = 1 mês de dados frescos
- Reduz influência de padrões antigos que mudaram

### Por que validação 40%-250%?

- **< 40%**: Sugestão muito baixa (provável erro)
- **> 250%**: Sugestão muito alta (provável erro)
- Range permite variação natural mas previne absurdos

---

**Data:** 2025-10-22
**Versão:** 2.0
**Autor:** Claude Code
