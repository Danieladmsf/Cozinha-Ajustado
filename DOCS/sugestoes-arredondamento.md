# 📊 Lógica de Arredondamento de Sugestões

## ✅ Regra Principal

**Sugestões automáticas** são arredondadas apenas para múltiplos de **0,25**:

| Valor Sugerido | Equivalente em Cubas |
|----------------|----------------------|
| **0,25** | 0,5 cuba P (meia cuba pequena) |
| **0,5** | 1 cuba P |
| **0,75** | 1,5 cuba P |
| **1,0** | 1 cuba G |
| **1,25** | 1 cuba G + 0,5 cuba P |
| **1,5** | 1 cuba G + 1 cuba P |
| **1,75** | 1 cuba G + 1,5 cuba P |
| **2,0** | 2 cubas G |
| **2,25** | 2 cubas G + 0,5 cuba P |
| **2,5** | 2 cubas G + 1 cuba P |
| **2,75** | 2 cubas G + 1,5 cuba P |
| **3,0** | 3 cubas G |

---

## 📝 Digitação Manual

Clientes podem digitar **qualquer valor**, incluindo:
- **0,1** = 1 pote
- **0,2** = 2 potes
- **0,3** = 3 potes
- **0,4** = 4 potes
- **1,6** = 1 cuba G + 1 cuba P + 1 pote

Esses valores **são aceitos** e **entram no histórico**, mas o sistema **não vai sugerir** automaticamente esses valores granulares.

---

## 🧮 Exemplos de Arredondamento

| Valor Histórico | Arredondado para Sugestão | Explicação |
|-----------------|---------------------------|------------|
| 0,1 | 0,25 | Arredonda para cima (0,5 cuba P) |
| 0,2 | 0,25 | Arredonda para cima |
| 0,3 | 0,25 | Arredonda para baixo |
| 0,35 | 0,25 | Arredonda para baixo |
| 0,38 | 0,5 | Arredonda para cima (1 cuba P) |
| 0,4 | 0,5 | Arredonda para cima |
| 0,6 | 0,5 | Arredonda para baixo |
| 0,7 | 0,75 | Arredonda para cima (1,5 cuba P) |
| 0,8 | 0,75 | Arredonda para baixo |
| 1,1 | 1,0 | Arredonda para baixo |
| 1,2 | 1,25 | Arredonda para cima |
| 1,4 | 1,5 | Arredonda para cima |
| 1,6 | 1,5 | Arredonda para baixo |
| 1,65 | 1,75 | Arredonda para cima |
| 1,8 | 1,75 | Arredonda para baixo |
| 2,3 | 2,25 | Arredonda para baixo |
| 2,4 | 2,5 | Arredonda para cima |

---

## 🎯 Cenário Prático

### Semana 1: Cliente digita manualmente
- **Segunda**: 1,6 cuba-g de Arroz (1G + 1P + 1 pote)
- **Terça**: 1,3 cuba-g de Arroz
- **Quarta**: 1,8 cuba-g de Arroz

### Semana 2: Sistema calcula sugestão
1. **Média histórica**: (1,6 + 1,3 + 1,8) / 3 = **1,57**
2. **Arredonda para 0,25**: 1,57 → **1,5** ✅
3. **Sugestão exibida**: `1,5 cuba-g`

Se o cliente aceitar a sugestão de 1,5, está tudo bem. Se preferir ajustar para 1,6 novamente, também pode!

---

## 🔒 Valores Muito Pequenos

Valores **menores que 0,125** são arredondados para **0** (zero) nas sugestões, pois são considerados insignificantes.

| Valor | Sugestão |
|-------|----------|
| 0,05 | 0 (não sugerir) |
| 0,1 | 0,25 |
| 0,12 | 0 (muito pequeno) |
| 0,13 | 0,25 |

---

## 💡 Resumo

✅ **Sugestões**: Apenas 0,25 / 0,5 / 0,75 / 1,0 / 1,25 / 1,5 / 1,75 / 2,0...
✅ **Digitação manual**: Qualquer valor (0,1 / 0,2 / 0,3 / 0,4 / 1,6 etc)
✅ **Histórico**: Todos os valores digitados são salvos e usados para calcular médias
✅ **Arredondamento**: `Math.round(value * 4) / 4` → múltiplos de 0,25

---

## 📍 Localização no Código

Arquivo: `/lib/order-suggestions.js`
Função: `OrderSuggestionManager.roundToPracticalValue()`
Linha: ~463

```javascript
// Math.round(value * 4) / 4 arredonda para múltiplos de 0.25
return Math.round(value * 4) / 4;
```
