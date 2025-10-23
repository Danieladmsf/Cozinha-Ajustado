# Correção do Unit Type Dinâmico

**Data:** 2025-10-23
**Problema:** Items mostravam "2 cuba" em vez de "2 cuba-g" na programação
**Status:** ✅ Corrigido

---

## 🔍 Diagnóstico

### Problema Identificado:
A página de Programação de Produção estava exibindo tipos de unidade de forma inconsistente:
- **Esperado:** "2 cuba-g – Macarrão mac and cheese"
- **Exibido:** "2 cuba – Macarrão mac and cheese"

### Causa Raiz:
1. A ficha técnica estava salvando corretamente `container_type: "cuba-g"` na `assembly_config`
2. O portal do cliente estava obtendo corretamente este valor
3. **MAS** havia dois problemas:
   - O portal tentava buscar preço em campo `recipe["cuba-g_cost"]` que não existe
   - A formatação na programação não estava sincronizada com a ficha técnica

---

## 🔧 Correções Implementadas

### 1. **Portal do Cliente** (`MobileOrdersPageClean.jsx:539-558`)

**Antes:**
```javascript
if (containerType === "cuba") {
  unitPrice = recipe.cuba_cost || 0;
} else if (containerType === "kg") {
  unitPrice = recipe.cost_per_kg_yield || 0;
} else {
  // Tentava buscar recipe["cuba-g_cost"] - ERRADO!
  const specificField = `${containerType}_cost`;
  ...
}
```

**Depois:**
```javascript
if (containerType === "cuba" || containerType === "cuba-g" || containerType === "cuba-p") {
  // ✅ Todos os tipos de cuba usam cuba_cost
  unitPrice = recipe.cuba_cost || 0;
} else if (containerType === "kg") {
  unitPrice = recipe.cost_per_kg_yield || 0;
} else if (containerType === "unid." || containerType === "porção") {
  // ✅ Unidades e porções usam portion_cost
  unitPrice = recipe.portion_cost || recipe.unit_cost || 0;
} else {
  // Para descartavel, etc.
  ...
}
```

### 2. **Hook de Consolidação** (`useOrderConsolidation.js:71-121`)

Implementada função `getRecipeUnitType()` que:
1. Verifica `recipe.unit_type` direto
2. Busca em `recipe.preparations[].assembly_config.container_type`
3. Verifica `recipe.container_type`
4. Fallback inteligente baseado em `cuba_weight`

**Resultado:** Sincronização completa com a lógica do portal do cliente

### 3. **Formatação na Programação** (`ProgramacaoCozinhaTabs.jsx:234-274`)

**Antes:**
```javascript
const unit = item.unit_type || 'cuba-g'; // FORÇAVA padrão
return `${formattedQty} ${unit} –`;
```

**Depois:**
```javascript
// Busca unit_type do item ou da receita
let unitType = item.unit_type;
if (!unitType && item.recipe_id) {
  const recipe = recipes.find(r => r.id === item.recipe_id);
  if (recipe) {
    // Usa mesma lógica do portal
    if (recipe.preparations && recipe.preparations.length > 0) {
      const lastPrep = recipe.preparations[recipe.preparations.length - 1];
      unitType = lastPrep.assembly_config?.container_type;
    }
    if (!unitType) {
      unitType = recipe.container_type || recipe.unit_type;
    }
  }
}

// Normaliza para lowercase
if (unitType) {
  unitType = unitType.toLowerCase();
}

return `${formattedQty} ${displayUnit} –`.trim();
```

---

## ✅ Resultado

### Agora o sistema é totalmente dinâmico e respeita:

| Tipo de Ficha Técnica | Container Type | Unit Type Exibido | Campo de Preço |
|------------------------|----------------|-------------------|----------------|
| Cuba Genérica          | `cuba`         | `cuba`            | `cuba_cost`    |
| Cuba G                 | `cuba-g`       | `cuba-g`          | `cuba_cost`    |
| Cuba P                 | `cuba-p`       | `cuba-p`          | `cuba_cost`    |
| Porção                 | `Porção`       | `porção`          | `portion_cost` |
| Unidade                | `Unid.`        | `unid.`           | `portion_cost` |
| Descartável            | `descartavel`  | `descartavel`     | `descartavel_cost` |
| Quilograma             | `kg`           | `kg`              | `cost_per_kg_yield` |

### Exemplo Real (Macarrão mac and cheese):
- **Ficha Técnica:** `container_type: "Cuba G"` (3,300 kg)
- **Portal Cliente:** "2 Cuba-g – Macarrão mac and cheese"
- **Programação:** "2 cuba-g – Macarrão mac and cheese"
- **Preço:** Usa `recipe.cuba_cost` corretamente

---

## 🎯 Benefícios

✅ **Sincronização Total:** Portal, Programação e Ficha Técnica usam mesma lógica
✅ **Dinâmico:** Respeita todos os tipos de porcionamento configurados
✅ **Preços Corretos:** Mapeia corretamente cada tipo para seu campo de preço
✅ **Sem Hardcode:** Não força "cuba-g" como padrão universal
✅ **Manutenível:** Lógica centralizada e documentada

---

## 📝 Arquivos Alterados

1. `/components/clientes/portal/MobileOrdersPageClean.jsx` - Correção de mapeamento de preços
2. `/hooks/cardapio/useOrderConsolidation.js` - Lógica de obtenção de unit_type
3. `/components/programacao/ProgramacaoCozinhaTabs.jsx` - Formatação dinâmica

---

## 🧪 Testes

- **Build:** ✅ Compilado sem erros
- **Lint:** ✅ Apenas warnings existentes (variáveis não usadas)
- **Lógica:** ✅ Sincronizada entre portal e programação
