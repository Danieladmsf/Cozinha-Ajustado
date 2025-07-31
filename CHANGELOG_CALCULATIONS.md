# CHANGELOG - Sistema de Cálculos v2.0

## 🚀 **REESCRITA COMPLETA DO SISTEMA DE CÁLCULOS** - 2024

### ✨ **Principais Melhorias**

#### **1. Arquitetura Unificada**
- **ANTES**: 3 sistemas duplicados e inconsistentes
- **AGORA**: 1 sistema unificado (`RecipeCalculator`) + wrappers para compatibilidade

#### **2. Nomenclatura Padronizada**
- **PROBLEMA RESOLVIDO**: Campos com nomes diferentes entre frontend/backend
- **SOLUÇÃO**: Definições centralizadas em `WEIGHT_FIELDS` e `PRICE_FIELDS`

#### **3. Lógica Simplificada**
- **ANTES**: 600+ linhas de código duplicado
- **AGORA**: Sistema orientado a objetos com métodos reutilizáveis

---

## 📋 **Arquivos Modificados**

### **1. `/lib/recipeCalculator.js` - REESCRITO**
```javascript
// NOVA ESTRUTURA
export class RecipeCalculator {
  static getInitialWeight(ingredient)    // ✅ Peso inicial padronizado
  static getFinalWeight(ingredient)      // ✅ Peso final padronizado  
  static getUnitPrice(ingredient)        // ✅ Preço padronizado
  static calculateRecipeMetrics()        // ✅ Função principal unificada
  static validateRecipeData()            // ✅ Validação integrada
}
```

### **2. `/lib/recipeMetricsCalculator.js` - SIMPLIFICADO**
```javascript
// NOVA ABORDAGEM - Wrapper que usa RecipeCalculator
export function calculateRecipeMetrics(preparations, recipeData) {
  return RecipeCalculator.calculateRecipeMetrics(preparations, recipeData);
}

// Funções antigas marcadas como @deprecated mas mantidas para compatibilidade
```

### **3. `/hooks/ficha-tecnica/useRecipeCalculations.js` - ATUALIZADO**
```javascript
// HOOK LIMPO que usa sistema unificado
export function useRecipeCalculations() {
  // Todas as funções agora usam RecipeCalculator internamente
  // Interface mantida para compatibilidade com componentes existentes
}
```

---

## 🔧 **Correções de Bugs**

### **1. Campos de Peso Inconsistentes**
**PROBLEMA**:
```javascript
// Backend esperava:
ingredient.frozen_weight     // ❌ undefined
ingredient.raw_weight        // ❌ undefined

// Frontend enviava:  
ingredient.weight_frozen     // ✅ valor correto
ingredient.weight_raw        // ✅ valor correto
```

**SOLUÇÃO**:
```javascript
// Agora usa nomenclatura padronizada:
export const WEIGHT_FIELDS = {
  frozen: 'weight_frozen',     // ✅ Único nome da verdade
  raw: 'weight_raw',          // ✅ Único nome da verdade
  // ... outros campos
};
```

### **2. Lógica Especial para Porcionamento/Montagem**
**NOVA FUNCIONALIDADE**:
```javascript
// Ingredientes em processos de FINALIZAÇÃO (Porcionamento/Montagem puros)
// são considerados como bruto = rendimento (sem perdas de processo)

if (isPortioningOnly || isAssemblyOnly) {
  const weight = getInitialWeight(ingredient);
  initialWeight = weight;     // Peso bruto
  finalWeight = weight;       // Peso rendimento (igual ao bruto)
  yieldPercent = 100;         // 100% rendimento (sem perdas)
}
```

**RAZÃO**: Ingredientes adicionados em etapas de finalização são apenas para completar a receita, não passam por processamento que cause perdas.

### **3. Cálculos Retornando Zero**
**PROBLEMA**: Calculadora não encontrava dados pelos nomes errados
**RESULTADO**: Todos os valores ficavam 0,000kg e R$ 0,00

**SOLUÇÃO**: Sistema unificado encontra dados corretamente

### **4. Bug do Peso de Rendimento Manual**
**PROBLEMA**: Sistema preservava valores de `yield_weight` definidos manualmente, mesmo após mudanças nas preparações
**CÓDIGO PROBLEMÁTICO**:
```javascript
// ANTES (bug):
...(prev.yield_weight === 0 ? { yield_weight: newMetrics.yield_weight } : {})
```
**SOLUÇÃO**: Sempre usar valor calculado automaticamente
```javascript
// AGORA (correto):
yield_weight: newMetrics.yield_weight  // Sempre atualizar
```
**RESULTADO**: Peso de rendimento agora reflete corretamente as preparações (ex: 12,000kg → 12,095kg)

### **5. Duplicação de Lógica**
**PROBLEMA**: 3 implementações diferentes do mesmo cálculo
**SOLUÇÃO**: 1 implementação reutilizada por todos

---

## 📊 **Comparação de Performance**

| Métrica | ANTES | AGORA | Melhoria |
|---------|-------|-------|----------|
| Linhas de código | ~1.200 | ~800 | -33% |
| Funções duplicadas | 15+ | 0 | -100% |
| Arquivos modificados | 3 grandes | 1 principal + 2 wrappers | Organização |
| Logs de debug | Dispersos | Centralizados | Melhor debug |
| Nomenclatura | Inconsistente | Padronizada | Manutenibilidade |

---

## 🎯 **Resultados Esperados**

### **Para Usuários**
- ✅ Métricas agora calculam corretamente (não mais zeros)
- ✅ Percentuais de perda corretos
- ✅ Custos por kg precisos
- ✅ Interface mais responsiva

### **Para Desenvolvedores**
- ✅ Código muito mais fácil de manter
- ✅ Debugging centralizado com logs organizados
- ✅ Testes mais simples (1 sistema vs 3)
- ✅ Menos bugs por inconsistência

---

## 🔄 **Compatibilidade**

### **✅ Mantida Compatibilidade Total**
- Componentes existentes funcionam sem alteração
- APIs públicas dos hooks preservadas
- Funções antigas marcadas como `@deprecated` mas funcionais

### **⚠️ Warnings de Migração**
- Funções antigas emitem warnings no console (apenas desenvolvimento)
- Encorajam migração gradual para nova API

---

## 🧪 **Como Testar**

### **1. Teste Básico - Processo Normal**
```javascript
// No console do browser (desenvolvimento):
const dataNormal = [{
  title: "1º Etapa: Descongelamento + Limpeza + Cocção",
  processes: ['defrosting', 'cleaning', 'cooking'],
  ingredients: [{
    name: "Arroz",
    weight_frozen: 10,
    weight_thawed: 8,
    weight_clean: 7,
    weight_cooked: 5,
    current_price: 4.50
  }]
}];

const result = RecipeCalculator.calculateRecipeMetrics(dataNormal);
console.log('Métricas processo normal:', result);
```

### **2. Teste - Ingredientes de Finalização**
```javascript
// Teste da nova lógica para Porcionamento/Montagem:
const dataFinalizacao = [{
  title: "2º Etapa: Porcionamento",
  processes: ['portioning'], // APENAS porcionamento
  ingredients: [{
    name: "Feijão Carioca", // Ingrediente de finalização
    weight_raw: 0.5,
    current_price: 8.00
  }],
  sub_components: [{
    name: "Etapa Anterior",
    assembly_weight_kg: 5.0,
    total_cost: 22.50
  }]
}];

const resultFinal = RecipeCalculator.calculateRecipeMetrics(dataFinalizacao);
console.log('Métricas finalização:', resultFinal);

// EXPECTATIVA:
// - Feijão: 0.5kg bruto = 0.5kg rendimento (100% yield)
// - Total bruto: 5.5kg (5.0 da etapa anterior + 0.5 do feijão)
// - Total rendimento: 5.5kg (mesmo valor)
```

### **3. Teste de Validação**
```javascript
const validation = RecipeCalculator.validateRecipeData(dataFinalizacao);
console.log('Validação:', validation);
```

### **4. Teste de Debug**
```javascript
const report = RecipeCalculator.generateDebugReport(dataFinalizacao);
console.log('Relatório:', report);
```

---

## 🐛 **Troubleshooting**

### **Se ainda aparecer valores zero:**
1. Verificar se ingredientes têm `weight_frozen`, `weight_raw` ou `weight_thawed`
2. Verificar se ingredientes têm `current_price`
3. Usar `generateDebugReport()` para diagnóstico

### **Logs importantes:**
```
🍳 [RECIPE-CALC] ==================== INÍCIO CÁLCULO RECEITA ====================
📊 [PREP-CALC] Calculando métricas para: "Nome da Preparação"
🥘 [ING-0] Nome do Ingrediente: { initialWeight: "10.000", finalWeight: "5.000", cost: "45.00", yield: "50.0%" }
✅ [RECIPE-CALC] Peso Total (Bruto): 10,000kg
```

---

## 📈 **Próximos Passos**

1. **Monitorar**: Verificar se cálculos estão corretos em produção
2. **Migrar**: Gradualmente substituir chamadas antigas pelas novas
3. **Testar**: Cenários complexos com múltiplas preparações
4. **Otimizar**: Performance se necessário após uso real

---

## 👥 **Créditos**

**Reescrita Completa**: Sistema Cozinha Afeto  
**Versão**: 2.0.0  
**Data**: 2024  
**Objetivo**: Eliminar bugs de cálculo e simplificar manutenção