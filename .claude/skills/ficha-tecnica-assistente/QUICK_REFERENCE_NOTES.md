# Guia Rápido - Estrutura de Notas

## 🎯 Decisão Rápida: Quais notas incluir?

### Para PREPARAÇÕES (etapas com ingredientes):

```
┌─────────────────────────────────────────────────────┐
│ CHECKLIST DE NOTAS                                  │
└─────────────────────────────────────────────────────┘

Esta etapa tem ingredientes diretos?
   • SIM → Incluir nota "Ingredientes"
   • NÃO → Omitir (montagem com sub_components)

Sempre incluir:
   • Nota "Equipamentos Utilizados"
   • Nota "Modo de Preparo"

Há temperatura crítica? (≥65°C, refrigeração, etc.)
   • SIM → Incluir nota "Temperatura de Serviço"
   • NÃO → Omitir
```

### Para MONTAGEM:

```
┌─────────────────────────────────────────────────────┐
│ CHECKLIST DE NOTAS - MONTAGEM                       │
└─────────────────────────────────────────────────────┘

Sempre incluir:
   • Nota "Ingredientes" (componentes + custos)
   • Nota "Equipamentos Utilizados"
   • Nota "Modo de Preparo"

Há requisito de temperatura?
   • SIM → Incluir nota "Temperatura de Serviço"
   • NÃO → Omitir
```

---

## 📋 Templates Prontos

### Template 1: Preparação COM temperatura (4 notas)

```json
"notes": [
  {
    "title": "Ingredientes",
    "content": "Lista detalhada dos ingredientes com quantidades e observações:\n- [Ingrediente 1]: [X]g - [Observação sobre perdas]\n- [Ingrediente 2]: [Y]g - [Observação]\n\n**Rendimento:** [X]%\n**Perdas/Ganhos:** [Resumo]",
    "updatedAt": "2025-11-06"
  },
  {
    "title": "Equipamentos Utilizados",
    "content": "Equipamentos necessários para esta etapa:\n- [Equipamento 1] - [finalidade]\n- [Equipamento 2] - [finalidade]\n\n**OBRIGATÓRIOS:** Balança digital, Contentores plásticos com tampa",
    "updatedAt": "2025-11-06"
  },
  {
    "title": "Modo de Preparo",
    "content": "**Passo a passo resumido:**\n1. [Etapa 1]\n2. [Etapa 2]\n3. [Etapa 3]\n\n**Pontos críticos:**\n- [Ponto 1]\n- [Ponto 2]\n\n**Dica principal:** [Dica mais importante]",
    "updatedAt": "2025-11-06"
  },
  {
    "title": "Temperatura de Serviço",
    "content": "**Temperatura ideal:** [X]°C\n**Como manter:** [banho-maria/geladeira/etc]\n**Validade:** [tempo]\n\n**OBS:** [Observação sobre segurança/qualidade]",
    "updatedAt": "2025-11-06"
  }
]
```

### Template 2: Preparação SEM temperatura (3 notas)

```json
"notes": [
  {
    "title": "Ingredientes",
    "content": "Lista detalhada dos ingredientes com quantidades e observações:\n- [Ingrediente 1]: [X]g - [Observação]\n- [Ingrediente 2]: [Y]g - [Observação]\n\n**Rendimento:** [X]%\n**Perdas/Ganhos:** [Resumo]",
    "updatedAt": "2025-11-06"
  },
  {
    "title": "Equipamentos Utilizados",
    "content": "Equipamentos necessários para esta etapa:\n- [Equipamento 1] - [finalidade]\n- [Equipamento 2] - [finalidade]\n\n**OBRIGATÓRIOS:** Balança digital, Contentores plásticos com tampa",
    "updatedAt": "2025-11-06"
  },
  {
    "title": "Modo de Preparo",
    "content": "**Passo a passo resumido:**\n1. [Etapa 1]\n2. [Etapa 2]\n3. [Etapa 3]\n\n**Pontos críticos:**\n- [Ponto 1]\n- [Ponto 2]\n\n**Dica principal:** [Dica mais importante]",
    "updatedAt": "2025-11-06"
  }
]
```

---

## 🔍 Quando incluir "Temperatura de Serviço"?

### Incluir quando:
- Temperatura ≥ 65°C (segurança alimentar)
- Requer refrigeração (conservação)
- Requer congelamento
- Temperatura impacta textura/qualidade (ex: fritar e servir imediatamente)
- Há tempo máximo em temperatura específica

### Omitir quando:
- Temperatura ambiente sem criticidade
- Ingredientes secos/estáveis
- Etapa intermediária sem requisito de armazenamento
- Preparação sem tempo/temperatura críticos

---

## 💡 Exemplos de Decisão

### Exemplo 1: Arroz Cozido
```
Ingredientes: ✅ (arroz, água, sal, óleo)
Equipamentos: ✅ (caldeirão, fogão, etc.)
Modo Preparo: ✅ (lavar, refogar, cozinhar)
Temperatura: ✅ (manter ≥65°C em banho-maria - SEGURANÇA ALIMENTAR)
```
**Resultado**: 4 notas

### Exemplo 2: Recheio Frio (presunto + queijo)
```
Ingredientes: ✅ (presunto, queijo)
Equipamentos: ✅ (facas, ralador)
Modo Preparo: ✅ (fatiar, ralar)
Temperatura: ❌ (não há requisito crítico)
```
**Resultado**: 3 notas

### Exemplo 3: Salgado Frito
```
Ingredientes: ✅ (massa, recheio + custos)
Equipamentos: ✅ (fritadeira, termômetro)
Modo Preparo: ✅ (montar, fritar)
Temperatura: ✅ (servir 60-70°C imediatamente - QUALIDADE)
```
**Resultado**: 4 notas

---

## 🎓 Regra de Ouro

```
┌───────────────────────────────────────────────────┐
│ Mínimo: 3 notas (Ingredientes, Equipamentos,     │
│                  Modo de Preparo)                 │
│                                                    │
│ Máximo: 4 notas (+ Temperatura de Serviço)       │
│                                                    │
│ Decisão: Incluir temperatura APENAS se houver    │
│          requisito crítico                        │
└───────────────────────────────────────────────────┘
```
