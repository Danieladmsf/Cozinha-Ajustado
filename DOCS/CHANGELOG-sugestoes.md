# 📝 Changelog - Sistema de Sugestões

## 🎯 Alterações Realizadas

### 1️⃣ Arredondamento de Sugestões (lib/order-suggestions.js)

**Antes:**
- Sugestões arredondavam para múltiplos de 0,5 (0,5 / 1,0 / 1,5 / 2,0...)

**Depois:**
- ✅ Sugestões arredondam para múltiplos de **0,25** (0,25 / 0,5 / 0,75 / 1,0 / 1,25 / 1,5...)
- ✅ Fórmula: `Math.round(value * 4) / 4`
- ✅ Valores < 0,125 → 0 (não sugerir quantidades insignificantes)

**Equivalências:**
- 0,25 = 0,5 cuba P (meia cuba pequena)
- 0,5 = 1 cuba P
- 0,75 = 1,5 cuba P
- 1,0 = 1 cuba G
- 1,25 = 1 cuba G + 0,5 cuba P
- 1,5 = 1 cuba G + 1 cuba P

---

### 2️⃣ Visual de Sugestões no Portal do Cliente

**Arquivos modificados:**
- ✅ `/components/clientes/portal/tabs/OrdersTab.jsx`
- ✅ `/components/clientes/portal/CustomerOrderItems.jsx`

**Mudanças:**

#### OrdersTab.jsx
```jsx
// ANTES:
<span className="font-medium text-xs text-amber-600">
  1,5
</span>

// DEPOIS:
<div className="flex flex-col items-center">
  <span className="font-bold text-xs text-amber-700">
    1,5
  </span>
  {item.unit_type?.toLowerCase() === 'cuba-g' && (
    <span className="text-[9px] text-amber-600 font-medium mt-0.5">
      (1 cuba G + 1 cuba P)
    </span>
  )}
</div>
```

#### CustomerOrderItems.jsx
```jsx
// Adicionado em modo mobile e desktop:
{item.unit_type?.toLowerCase() === 'cuba-g' && (
  <span className="text-[9px] text-green-600 font-medium">
    ({convertCubaGToKitchenFormat(parseQuantity(item.suggested_quantity))})
  </span>
)}
```

---

## 📊 Exemplos de Arredondamento

| Histórico | Arredondado | Exibição Visual |
|-----------|-------------|-----------------|
| 0,1 | 0,25 | `0,25` `(2 potes)` |
| 0,3 | 0,25 | `0,25` `(2 potes)` |
| 0,4 | 0,5 | `0,5` `(1 cuba P)` |
| 0,6 | 0,5 | `0,5` `(1 cuba P)` |
| 0,7 | 0,75 | `0,75` `(1 cuba P + 2 potes)` |
| 1,1 | 1,0 | `1,0` `(1 cuba G)` |
| 1,2 | 1,25 | `1,25` `(1 cuba G + 2 potes)` |
| 1,4 | 1,5 | `1,5` `(1 cuba G + 1 cuba P)` |
| 1,6 | 1,5 | `1,5` `(1 cuba G + 1 cuba P)` |
| 1,65 | 1,75 | `1,75` `(1 cuba G + 1 cuba P + 2 potes)` |
| 2,3 | 2,25 | `2,25` `(2 cubas G + 2 potes)` |
| 2,6 | 2,5 | `2,5` `(2 cubas G + 1 cuba P)` |

---

## ✅ Regras Importantes

### Sugestões Automáticas:
- ✅ Apenas múltiplos de 0,25
- ✅ Arredonda para o valor mais próximo
- ✅ Não sugere valores < 0,125

### Digitação Manual:
- ✅ Aceita QUALQUER valor (0,1 / 0,2 / 0,3 / 0,4 / 1,6 etc)
- ✅ Cliente pode usar lógica de potes
- ✅ Valores digitados entram no histórico normalmente

### Cálculo de Médias:
- ✅ Usa todos os valores do histórico (incluindo 0,1 / 0,2 / 1,6 etc)
- ✅ Calcula média ponderada (70% recente + 30% histórico)
- ✅ **Aplica arredondamento apenas no FINAL**

---

## 🎨 Visual Final

### Desktop (Tabela):
```
┌──────────────────┐
│    Sugestão      │
├──────────────────┤
│      1,5         │ ← Negrito, âmbar
│  (1G + 1P)       │ ← Pequeno, âmbar escuro
└──────────────────┘
```

### Mobile (Badge):
```
[Sugestão: 1,5 (1G + 1P)]
```

---

## 📂 Arquivos Criados/Modificados

### Modificados:
1. `/lib/order-suggestions.js` → Arredondamento para 0,25
2. `/components/clientes/portal/tabs/OrdersTab.jsx` → Visual com tradução
3. `/components/clientes/portal/CustomerOrderItems.jsx` → Visual com tradução

### Criados (Documentação):
1. `/DOCS/sugestoes-arredondamento.md` → Regras de arredondamento
2. `/DOCS/sugestoes-visual-portal.md` → Visual das sugestões
3. `/DOCS/CHANGELOG-sugestoes.md` → Este arquivo

---

## 🧪 Como Testar

### 1. Testar Arredondamento:
```javascript
// Exemplo: Cliente tem histórico de 1,6 / 1,3 / 1,8
// Média: (1,6 + 1,3 + 1,8) / 3 = 1,57
// Arredondado: 1,5 ✅
```

### 2. Testar Visual:
1. Acesse portal do cliente
2. Vá para aba "Pedidos"
3. Observe coluna "Sugestão"
4. Deve aparecer: `1,5` e abaixo `(1 cuba G + 1 cuba P)`

### 3. Testar Digitação Manual:
1. Digite `1,6` no campo
2. Sistema aceita normalmente ✅
3. Valor entra no histórico ✅
4. Próxima sugestão usa 1,6 no cálculo, mas arredonda resultado ✅

---

## 💡 Benefícios

✅ Sugestões mais práticas (múltiplos de 0,25)
✅ Cliente vê tradução em cubas automaticamente
✅ Mantém flexibilidade de digitação manual
✅ Histórico preserva valores exatos
✅ Reduz confusão e erros

---

## 🔧 Manutenção Futura

Se precisar ajustar:

### Mudar incremento (ex: voltar para 0,5):
```javascript
// Em: lib/order-suggestions.js
// Linha: ~494
return Math.round(value * 2) / 2; // 0,5 increments
```

### Ajustar visual:
- Desktop: `components/clientes/portal/tabs/OrdersTab.jsx`
- Mobile: `components/clientes/portal/CustomerOrderItems.jsx`

### Modificar conversão de cubas:
- `lib/cubaConversionUtils.js`

---

**Data:** 2025-10-22
**Versão:** 1.0
**Autor:** Claude Code
