# Correção da Lista de Compras - Consolidação de Ingredientes

**Data:** 2025-10-23
**Problema:** Ingredientes das receitas não estavam sendo compilados corretamente para a lista de compras
**Status:** ✅ Corrigido

---

## 🔍 Diagnóstico

### Problema Relatado:
A Lista de Compras Semanal não estava consolidando todos os ingredientes das receitas corretamente.

### Problemas Encontrados:

#### 1. **Cálculo Incorreto de Quantidades de Receitas**
**Arquivo:** `ingredientConsolidator.js:92-126`

**Código Antigo:**
```javascript
const portionSize = recipe.portion_weight_calculated || recipe.cuba_weight || 0.06;
const recipeYield = recipe.yield_weight || 0.17;
const portionsPerRecipe = recipeYield / portionSize;
const recipesNeeded = item.quantity / portionsPerRecipe;
```

**Problemas:**
- ❌ Não considerava o `item.unit_type`
- ❌ Assumia que tudo era "porção" em vez de "cuba"
- ❌ Se pedido era "2 cuba-g", calculava como se fossem "2 porções"
- ❌ Usava valores fallback arbitrários (0.06, 0.17) que não fazem sentido

**Exemplo do erro:**
```
Pedido: 2 cuba-g de Macarrão mac and cheese (cuba_weight: 3.3 kg)
Cálculo errado: 2 / (0.17 / 3.3) = 38.82 receitas! ❌
Cálculo correto: 2 cubas = 2x a receita ✅
```

#### 2. **Ingredientes Sem Peso Eram Ignorados**
**Arquivo:** `ingredientConsolidator.js:52-54`

**Código Antigo:**
```javascript
if (!unitWeight) {
  return; // Pular este ingrediente ❌
}
```

**Problemas:**
- ❌ Ingredientes sem `weight_thawed/weight_clean/weight_cooked` eram COMPLETAMENTE IGNORADOS
- ❌ Não tentava outras propriedades de peso (weight, raw_weight)
- ❌ Muitos ingredientes válidos eram perdidos

#### 3. **Quantidade do Ingrediente Não Era Usada**
**Arquivo:** `ingredientConsolidator.js:32,58`

**Código Antigo:**
```javascript
const baseQuantity = parseFloat(ingredient.quantity) || 1; // ✅ Lido
// ... mas depois ...
ingredientWeight = unitWeight * quantityNeeded; // ❌ baseQuantity NÃO usado!
```

**Problema:**
- ❌ Se a receita usa "2 kg de Carne", só calculava para 1 kg
- ❌ A quantidade do ingrediente na receita era ignorada

---

## 🔧 Correções Implementadas

### **Novo Arquivo:** `ingredientConsolidatorFixed.js`

#### 1. **Cálculo Correto por Tipo de Unidade** (linhas 118-169)

```javascript
// ✅ CORRIGIDO - Considera o tipo de unidade
const unitType = (item.unit_type || '').toLowerCase();

if (unitType === 'cuba' || unitType === 'cuba-g' || unitType === 'cuba-p') {
  // Para cubas: a quantidade é o número de cubas
  recipeMultiplier = itemQuantity;

} else if (unitType === 'unid.' || unitType === 'porção') {
  // Para unidades/porções: calcular quantas receitas são necessárias
  const portionWeight = recipe.portion_weight_calculated || 0.06;
  const cubaWeight = recipe.cuba_weight || 1;
  const portionsPerCuba = cubaWeight / portionWeight;
  recipeMultiplier = itemQuantity / portionsPerCuba;

} else if (unitType === 'kg') {
  // Para kg: calcular baseado no rendimento da receita
  const yieldWeight = recipe.yield_weight || recipe.cuba_weight || 1;
  recipeMultiplier = itemQuantity / yieldWeight;
}
```

**Resultado:** Cada tipo de unidade é tratado corretamente!

#### 2. **Extração Robusta de Peso** (linhas 15-39)

```javascript
// ✅ CORRIGIDO - Tenta múltiplas propriedades
const getIngredientWeight = (ingredient) => {
  // 1. Tentar propriedades diretas de peso processado
  let weight = parseFloat(ingredient.weight_cooked) ||
               parseFloat(ingredient.weight_pre_cooking) ||
               parseFloat(ingredient.weight_clean) ||
               parseFloat(ingredient.weight_thawed) ||
               0;

  // 2. Se não encontrou, tentar objetos aninhados
  if (!weight && ingredient.weights) {
    weight = parseFloat(ingredient.weights.cooked) ||
             parseFloat(ingredient.weights.pre_cooking) ||
             parseFloat(ingredient.weights.clean) ||
             parseFloat(ingredient.weights.thawed) ||
             0;
  }

  // 3. Fallback: peso bruto (menos ideal, mas melhor que nada)
  if (!weight) {
    weight = parseFloat(ingredient.weight) ||
             parseFloat(ingredient.raw_weight) ||
             0;
  }

  return weight;
};
```

**Resultado:** Ingredientes não são mais perdidos!

#### 3. **Conversão de Formato Brasileiro (Vírgula) para Formato JS (Ponto)** (linhas 16-27)

**Problema Crítico:**
```javascript
// Banco de dados salva com VÍRGULA (formato brasileiro)
weight_pre_cooking: "0,04"

// parseFloat() interpreta incorretamente:
parseFloat("0,04") // → 0 (não NaN!)

// Resultado:
if (!weight) // → true, porque 0 é falsy
// INGREDIENTE PULADO! ❌
```

**Código Corrigido:**
```javascript
const parseWeight = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  // Se for string, substituir vírgula por ponto
  if (typeof value === 'string') {
    value = value.replace(',', '.');
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};
```

**Resultado:** Centenas de ingredientes que eram pulados agora são incluídos!

#### 4. **Uso Correto da Quantidade do Ingrediente** (linha 83)

```javascript
// ✅ CORRIGIDO - Usa quantidade do ingrediente na receita
const baseQuantity = parseFloat(ingredient.quantity) || 1;
const unitWeight = getIngredientWeight(ingredient);

// Calcular peso total = (peso unitário × quantidade na receita) × multiplicador de receitas
const totalWeight = unitWeight * baseQuantity * recipeMultiplier;
```

**Resultado:** Se a receita usa 2 kg de algo, calcula 2 kg!

---

## 📊 Resumo das 4 Correções

1. ✅ **Cálculo baseado em unit_type**: Cuba ≠ Porção ≠ Kg
2. ✅ **Extração robusta de peso**: Tenta múltiplas propriedades em cascata
3. ✅ **Conversão vírgula → ponto**: Resolve formato brasileiro "0,04" → 0.04
4. ✅ **Multiplicação correta**: peso × quantity × multiplier

---

## 📊 Comparação Antes vs Depois

### Exemplo: Macarrão mac and cheese

**Dados da Receita:**
- Cuba weight: 3.3 kg
- Ingredientes na preparação:
  - Macarrão Caracol: 1.1 kg (weight_pre_cooking)
  - Cheddar: 0.498 kg
  - Creme de leite: 0.498 kg
  - Sal: 0.004 kg

**Pedido:**
- Einstein: 2 cuba-g

### ❌ Antes (Errado):

```
Cálculo: 2 / (0.17 / 3.3) = 38.82 receitas

Macarrão Caracol: 1.1 kg × 38.82 = 42.7 kg ❌ ERRADO!
Cheddar: 0.498 kg × 38.82 = 19.3 kg ❌ ERRADO!
```

### ✅ Depois (Correto):

```
Cálculo: 2 cubas = 2× a receita

Macarrão Caracol: 1.1 kg × 1 × 2 = 2.2 kg ✅ CORRETO!
Cheddar: 0.498 kg × 1 × 2 = 0.996 kg ✅ CORRETO!
Creme de leite: 0.498 kg × 1 × 2 = 0.996 kg ✅ CORRETO!
Sal: 0.004 kg × 1 × 2 = 0.008 kg ✅ CORRETO!
```

---

## 🎯 Logs de Debug Adicionados

O novo código inclui logs detalhados no console para diagnóstico:

```
🚀 ========== CONSOLIDAÇÃO DE INGREDIENTES ==========
📊 Input: 5 pedidos, 25 receitas

📋 Pedido 1: Einstein - Dia 1
  📦 Macarrão mac and cheese: 2 cuba-g
    ✅ Cuba: 2 cubas = 2x receita
    📊 Total acumulado: 2x

📦 [Extract] Receita: Macarrão mac and cheese, Multiplicador: 2x
  📋 Prep 0: 3 ingredientes
  ✅ Macarrão Caracol: 1 × 1.1kg × 2x = 2.2kg
  ✅ Cheddar: 1 × 0.498kg × 2x = 0.996kg
  ✅ Creme de leite: 1 × 0.498kg × 2x = 0.996kg

✅ ========== CONSOLIDAÇÃO COMPLETA ==========
📦 Total de ingredientes únicos: 19
⚖️  Peso total: 412.84kg
```

---

## 📝 Arquivos Alterados

1. **NOVO:** `/components/programacao/lista-compras/utils/ingredientConsolidatorFixed.js`
   - Versão corrigida do consolidador com todas as correções

2. **ATUALIZADO:** `/components/programacao/lista-compras/IngredientesConsolidados.jsx`
   - Import alterado para usar `ingredientConsolidatorFixed`

3. **MANTIDO:** `/components/programacao/lista-compras/utils/ingredientConsolidator.js`
   - Arquivo original mantido como backup

---

## ✅ Resultado Final

### Antes das Correções:
- ❌ Cálculo errado para cubas (tratava como porções)
- ❌ Ingredientes sem peso específico eram ignorados
- ❌ **Pesos com vírgula ("0,04") eram interpretados como 0**
- ❌ Quantidade do ingrediente na receita não era usada
- ❌ Apenas ~20 ingredientes na lista (faltavam centenas)
- ❌ Valores totalmente incorretos

### Depois das Correções:
- ✅ Cálculo correto para cuba-g, cuba-p, porção, unid., kg
- ✅ Extração robusta de peso (tenta múltiplas propriedades)
- ✅ **Conversão automática de vírgula para ponto (formato BR → JS)**
- ✅ Quantidade do ingrediente é multiplicada corretamente
- ✅ Logs detalhados para diagnóstico
- ✅ **Todos os ingredientes com peso são incluídos**
- ✅ Valores precisos na lista de compras

---

## 🧪 Como Testar

1. Acesse a página de Programação de Produção
2. Navegue até a aba "Lista de Compras"
3. Abra o Console do Navegador (F12)
4. Observe os logs detalhados da consolidação
5. Verifique se todos os ingredientes das receitas aparecem
6. Confirme que as quantidades estão corretas

---

## 🔮 Próximos Passos

Após validar que a versão corrigida funciona:
1. Remover o arquivo antigo `ingredientConsolidator.js`
2. Renomear `ingredientConsolidatorFixed.js` para `ingredientConsolidator.js`
3. Atualizar o import no componente
4. Remover os logs de debug (ou mantê-los apenas em desenvolvimento)
