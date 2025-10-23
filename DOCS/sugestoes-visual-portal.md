# 🎨 Visual das Sugestões no Portal do Cliente

## ✅ Como as Sugestões Agora Aparecem

### 📱 Formato Antigo:
```
Sugestão: 1,5
```

### 🎯 Formato NOVO (com tradução):
```
Sugestão: 1,5
          (1 cuba G + 1 cuba P)
```

---

## 📊 Exemplos de Exibição

| Valor Sugerido | Exibição Visual |
|----------------|-----------------|
| **0,25** | `0,25`<br>`(2 potes)` |
| **0,5** | `0,5`<br>`(1 cuba P)` |
| **0,75** | `0,75`<br>`(1 cuba P + 2 potes)` |
| **1,0** | `1,0`<br>`(1 cuba G)` |
| **1,25** | `1,25`<br>`(1 cuba G + 2 potes)` |
| **1,5** | `1,5`<br>`(1 cuba G + 1 cuba P)` |
| **1,75** | `1,75`<br>`(1 cuba G + 1 cuba P + 2 potes)` |
| **2,0** | `2,0`<br>`(2 cubas G)` |
| **2,5** | `2,5`<br>`(2 cubas G + 1 cuba P)` |
| **3,0** | `3,0`<br>`(3 cubas G)` |

---

## 🎨 Detalhes Visuais

### Coluna de Sugestão (Desktop):
```
┌──────────────────┐
│    Sugestão      │
├──────────────────┤
│      1,5         │ ← Texto maior, negrito, âmbar
│  (1G + 1P)       │ ← Texto menor, âmbar escuro
└──────────────────┘
```

### Badge de Sugestão (Mobile):
```
┌─────────────────────────────────┐
│ ✅ Arroz Branco                 │
│                                 │
│ [Peso: 2,5kg]                   │
│ [Sugestão: 1,5 (1G + 1P)]       │
└─────────────────────────────────┘
```

---

## 🔍 Quando a Tradução Aparece

✅ **Aparece** quando:
- Unidade for `cuba-g`
- Sugestão > 0

❌ **NÃO aparece** quando:
- Unidade for `kg`, `unid`, `porção`, etc.
- Não houver sugestão (mostra apenas `-`)

---

## 💡 Exemplos Práticos

### Exemplo 1: Arroz (cuba-g)
```
Sugestão
────────
  2,5
(2G + 1P)
```

### Exemplo 2: Carne (kg)
```
Sugestão
────────
  3,5
(sem tradução, pois é kg)
```

### Exemplo 3: Sem histórico
```
Sugestão
────────
   -
```

---

## 🎨 Classes CSS Aplicadas

### OrdersTab.jsx (Desktop):
```jsx
<div className="flex flex-col items-center">
  <span className="font-bold text-xs text-amber-700">
    1,5
  </span>
  <span className="text-[9px] text-amber-600 font-medium mt-0.5">
    (1 cuba G + 1 cuba P)
  </span>
</div>
```

### CustomerOrderItems.jsx (Mobile):
```jsx
<span className="bg-green-100 text-green-600 px-2 py-0.5 rounded">
  Sugestão: 1,5
  <span className="text-[9px] ml-1">
    (1 cuba G + 1 cuba P)
  </span>
</span>
```

---

## 📂 Arquivos Modificados

1. ✅ `/components/clientes/portal/tabs/OrdersTab.jsx`
   - Importado `convertCubaGToKitchenFormat`
   - Adicionado conversão na coluna de sugestão

2. ✅ `/components/clientes/portal/CustomerOrderItems.jsx`
   - Importado `convertCubaGToKitchenFormat`
   - Adicionado conversão em modo mobile e desktop

---

## 🧪 Como Testar

1. Acesse o portal do cliente
2. Navegue até a aba "Pedidos"
3. Certifique-se de ter histórico de pedidos
4. Observe a coluna "Sugestão"
5. Deve aparecer:
   ```
   1,5
   (1 cuba G + 1 cuba P)
   ```

---

## ✨ Benefícios

✅ Cliente entende imediatamente quantas cubas pegar
✅ Reduz erros de interpretação
✅ Facilita a comunicação entre cozinha e cliente
✅ Mantém o valor decimal para digitação precisa

---

## 🔧 Manutenção

Se precisar ajustar o formato de exibição, edite:
- **Lógica de conversão**: `/lib/cubaConversionUtils.js`
- **Visual no portal**: `/components/clientes/portal/tabs/OrdersTab.jsx`
