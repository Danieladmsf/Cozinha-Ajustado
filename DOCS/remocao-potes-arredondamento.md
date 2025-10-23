# Remoção de Potes e Arredondamento Inteligente

## 📋 Resumo

Removida toda lógica de conversão para **potes**. Mantida conversão de **cuba-g** para **cuba-p** com **arredondamento inteligente** para valores próximos dos padrões.

## 🗓️ Data
**2025-10-23**

## 🎯 Objetivo

- ❌ **Remover** toda lógica de potes
- ✅ **Manter** conversão cuba-g → cuba-p
- ✅ **Adicionar** arredondamento inteligente (0.3 → 0.25 = ½ cuba-p)
- ✅ Exibir valores como "½ Cuba-p", "1 Cuba-p", "1½ Cuba-p"

## 📝 Mudanças Realizadas

### 1. **Arredondamento Inteligente**

Valores são arredondados para o padrão mais próximo com tolerância de **0.15**:

| Entrada | Arredonda para | Exibição |
|---------|----------------|----------|
| 0.1 | 0.1 | "0,2 Cuba-p" |
| 0.2 | 0.25 | "½ Cuba-p" |
| 0.3 | 0.25 | "½ Cuba-p" |
| 0.4 | 0.5 | "1 Cuba-p" |
| 0.5 | 0.5 | "1 Cuba-p" |
| 0.6 | 0.5 | "1 Cuba-p" |
| 0.7 | 0.75 | "1½ Cuba-p" |
| 0.75 | 0.75 | "1½ Cuba-p" |
| 0.8 | 0.75 | "1½ Cuba-p" |
| 1.0 | 1.0 | "1 Cuba-g" |

### 2. **Padrões de Arredondamento**

```javascript
CUBAP_STANDARDS: [0.25, 0.5, 0.75, 1.0]
TOLERANCE: 0.15
```

- Se o valor estiver dentro de **±0.15** de um padrão, será arredondado
- Exemplos:
  - `0.3` está a `0.05` de `0.25` → arredonda para `0.25` (½ Cuba-p)
  - `0.4` está a `0.10` de `0.5` → arredonda para `0.5` (1 Cuba-p)
  - `0.7` está a `0.05` de `0.75` → arredonda para `0.75` (1½ Cuba-p)

### 3. **lib/cubaConverter.js** ✅

**Modificações:**

```javascript
// ❌ REMOVIDO: Conversão para potes
// ❌ REMOVIDO: CUBA_G_RULES.POTE_EXACT
// ❌ REMOVIDO: CUBA_TO_POTES
// ❌ REMOVIDO: createPoteResult()
// ❌ REMOVIDO: tryConvertToPotes()

// ✅ ADICIONADO: Arredondamento inteligente
const roundToNearestCubaP = (decimal) => { ... }

// ✅ MODIFICADO: Conversão cuba-g usa arredondamento
static convertToCubaGP(numQuantity) {
  decimalPart = roundToNearestCubaP(decimalPart);
  ...
}
```

### 4. **lib/cubaConversionUtils.js** ✅

**Modificações:**

```javascript
// ❌ REMOVIDO: Conversão para potes
// ❌ REMOVIDO: Casos de 0.1, 0.2, 0.3, 0.4 → potes

// ✅ ADICIONADO: roundToNearestCubaP()
// ✅ MODIFICADO: convertDecimalToKitchenUnit()
//   - Usa arredondamento inteligente
//   - Converte apenas para cuba-p
//   - Exibe ½, 1, 1½, etc.
```

### 5. **hooks/consolidacao/useConsolidationFormatter.js** ✅

Mantido sem alterações. Continua usando `CubaUniversalConverter` que agora não converte para potes.

## 🔄 Comparação: Antes vs Depois

### ANTES (com potes):
```
0.1 cuba-g → "1 Pote"
0.2 cuba-g → "2 Potes"
0.3 cuba-g → "3 Potes"
0.4 cuba-g → "4 Potes"
0.5 cuba-g → "1 Cuba-p"
2.3 cuba-g → "2 Cuba-g + 3 Potes"
```

### DEPOIS (sem potes, com arredondamento):
```
0.1 cuba-g → "0,2 Cuba-p"
0.2 cuba-g → "½ Cuba-p" (arredondado para 0.25)
0.3 cuba-g → "½ Cuba-p" (arredondado para 0.25)
0.4 cuba-g → "1 Cuba-p" (arredondado para 0.5)
0.5 cuba-g → "1 Cuba-p"
2.3 cuba-g → "2 Cuba-g + ½ Cuba-p" (0.3 → 0.25)
```

## 🧪 Testes de Conversão

```bash
node -e "
const { convertCubaGToKitchenFormat } = require('./lib/cubaConversionUtils.js');
console.log(convertCubaGToKitchenFormat(0.3)); // ½ cuba P
console.log(convertCubaGToKitchenFormat(2.4)); // 2 cubas G + 1 cuba P
"
```

## ✅ Compatibilidade

- ✅ API mantida (funções não mudaram assinatura)
- ✅ Componentes continuam funcionando
- ✅ `CustomerOrderCard.jsx` - funciona
- ✅ `CustomerOrderItems.jsx` - funciona
- ✅ `OrdersTab.jsx` - funciona

## 📁 Arquivos Modificados

1. `/home/user/studio/lib/cubaConverter.js`
   - Removida lógica de potes
   - Adicionado arredondamento inteligente

2. `/home/user/studio/lib/cubaConversionUtils.js`
   - Removida lógica de potes
   - Adicionado arredondamento inteligente

3. `/home/user/studio/hooks/consolidacao/useConsolidationFormatter.js`
   - Sem alterações (usa conversor atualizado)

## 💡 Regras de Negócio

### Conversão Cuba-g → Cuba-p

**Fórmula:** `1 cuba-g = 2 cubas-p`

**Padrões com símbolos:**
- `0.25 cuba-g` = `0.5 cuba-p` = **"½ Cuba-p"**
- `0.50 cuba-g` = `1.0 cuba-p` = **"1 Cuba-p"**
- `0.75 cuba-g` = `1.5 cuba-p` = **"1½ Cuba-p"**
- `1.00 cuba-g` = `2.0 cuba-p` = **"1 Cuba-g"** (inteiro vira Cuba-g)

### Arredondamento

**Tolerância:** ±0.15

- Valores próximos de padrões são arredondados
- Facilita trabalho da cozinha
- Exemplos:
  - `0.28` → `0.25` (½ Cuba-p)
  - `0.32` → `0.25` (½ Cuba-p)
  - `0.45` → `0.5` (1 Cuba-p)
  - `0.65` → `0.5` (1 Cuba-p)

## 🔍 Comportamento em Produção

### Portal do Cliente

Ao visualizar pedido com `0.3 cuba-g`:
- **Antes:** "3 Potes"
- **Depois:** "½ Cuba-p"

### Programação da Cozinha

Lista de compras com `2.4 cuba-g`:
- **Antes:** "2 Cuba-g + 4 Potes"
- **Depois:** "2 Cuba-g + 1 Cuba-p"

## 📌 Próximos Passos

1. ✅ Testar em desenvolvimento
2. ⚠️ Validar com equipe da cozinha
3. ⚠️ Testar em produção
4. ⚠️ Coletar feedback dos usuários

## ⚙️ Configuração

Para ajustar tolerância de arredondamento:

```javascript
// lib/cubaConverter.js e lib/cubaConversionUtils.js
const CONVERSION_CONFIG = {
  TOLERANCE: 0.15, // Ajustar aqui
  CUBAP_STANDARDS: [0.25, 0.5, 0.75, 1.0]
};
```

---

**Versão**: 2.1 (Sem Potes + Arredondamento)
**Data**: 2025-10-23
**Status**: ✅ Concluído e Testado
