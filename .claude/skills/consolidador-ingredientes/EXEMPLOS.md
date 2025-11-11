# Exemplos Práticos de Uso - Consolidador de Ingredientes

## Cenário 1: Começando com Grupo Simples (Quinoa)

### Passo 1: Análise
```
Usuário: analise o grupo Quinoa

Resposta esperada:
═══════════════════════════════════════════════════════════════
ANÁLISE DE GRUPO: Quinoa
═══════════════════════════════════════════════════════════════

📋 INFORMAÇÕES GERAIS
Prioridade: BAIXA
Total de receitas afetadas: 1
Receitas que precisam migração: 0

⚠️  OBSERVAÇÃO IMPORTANTE:
   ID 'ewrfewfwefewf' é inválido

🎯 PLANO DE CONSOLIDAÇÃO
✓ ID A MANTER: rlSXQWfcD4aWwEcLM8di
  Usado em: 1 receita
  - Arroz integral com quinoa

✗ IDs A REMOVER:
  - ewrfewfwefewf (não usado - ID inválido)

💡 RECOMENDAÇÃO: Remoção simples e segura
```

### Passo 2: Execução
```
Usuário: consolide o grupo Quinoa

Resposta esperada:
═══════════════════════════════════════════════════════════════
CONSOLIDAÇÃO: Quinoa
═══════════════════════════════════════════════════════════════

⚙️  FASE 1: MIGRAÇÕES
   ℹ️  Nenhuma migração necessária

⚙️  FASE 2: REMOÇÕES
   🗑️  Removendo ID: ewrfewfwefewf
   ✅ Ingrediente removido com sucesso

✅ CONSOLIDAÇÃO COMPLETA
   - Ingredientes removidos: 1
   - Receitas afetadas: 0
   - Erros: 0
═══════════════════════════════════════════════════════════════
```

---

## Cenário 2: Grupo com Migração Simples (Repolho)

### Passo 1: Análise
```
Usuário: analise o grupo Repolho
```

### Passo 2: Simulação
```
Usuário: simule a consolidação de Repolho

Resposta esperada:
═══════════════════════════════════════════════════════════════
SIMULAÇÃO: Repolho
═══════════════════════════════════════════════════════════════

📋 OPERAÇÕES QUE SERIAM EXECUTADAS:

1. MIGRAÇÃO
   ID: 684bfe3cce1a5c4bb28d47bc → EwRbXxoenpv9J5eBwIMe
   Receitas afetadas: 1
   - Mix de repolho salteado

2. MANTER
   ID: EwRbXxoenpv9J5eBwIMe
   Já usado em: 7 receitas

📊 IMPACTO TOTAL:
   - Migrações: 1 receita
   - Remoções: 0
   - Tempo estimado: ~2 segundos

💡 Esta é uma operação segura com baixo impacto.
═══════════════════════════════════════════════════════════════
```

### Passo 3: Execução
```
Usuário: consolide o grupo Repolho

[Skill pede confirmação]

Usuário: sim, confirmo

[Skill executa e mostra resultado]
```

---

## Cenário 3: Remoção em Lote (Ingredientes Não Utilizados)

```
Usuário: remova ingredientes não utilizados do grupo Ketchup

Resposta esperada:
═══════════════════════════════════════════════════════════════
REMOÇÃO DE INGREDIENTES NÃO UTILIZADOS: Ketchup
═══════════════════════════════════════════════════════════════

✓ Validação: Nenhum ID está em uso

🗑️  REMOVENDO:
   - ID: Eu3Rx5SQ2pbPzhRZbD4q ✅
   - ID: szwZkwEvjD8XVFBxckTU ✅

✅ REMOÇÃO COMPLETA
   - Ingredientes removidos: 2
   - Nenhuma receita foi afetada
═══════════════════════════════════════════════════════════════
```

---

## Cenário 4: Grupo Complexo (Cebola - CRÍTICO)

### Passo 1: Análise Detalhada
```
Usuário: analise o grupo Cebola

Resposta esperada:
═══════════════════════════════════════════════════════════════
ANÁLISE DE GRUPO: Cebola
═══════════════════════════════════════════════════════════════

📋 INFORMAÇÕES GERAIS
Prioridade: CRÍTICA 🔴
Total de receitas afetadas: 165
Receitas que precisam migração: 60

🎯 PLANO DE CONSOLIDAÇÃO

✓ ID A MANTER: SNyG6G84jM1WJdk6ZKFV
  Usado em: 105 receitas
  Amostra de receitas:
    - Fajitas de frango
    - Vatapá
    - Almôndega ao Molho
    ... e mais 102 receitas

→ IDs A MIGRAR:

  ID: QWXWVoo4kKqA2Yph6yFo
  Receitas: 58
    - Quibe com coalhada
    - Escondidinho de frango
    ... e mais 56 receitas

  ID: VuKJ35R1s8XUZARsndkR
  Receitas: 2
    - Carne Louca
    - Farofa com couve

✗ IDs A REMOVER:
  - XVZ5Ow41nJjGO2UkZ4GX (não usado)

📊 ESTIMATIVA DE IMPACTO
Operações totais: 3
  - Migrações de receitas: 60
  - Remoções de ingredientes: 1
Tempo estimado: ~2m 1s

⚠️  NÍVEL DE RISCO: 🔴 ALTO

💡 RECOMENDAÇÕES
🔴 Grupo de ALTO risco
🔴 CRÍTICO: Faça backup completo do banco
🔴 Considere testar em staging primeiro
🔴 Execute em horário de manutenção
🔴 Valide extensivamente após consolidação
🔴 Mantenha os backups por vários dias
═══════════════════════════════════════════════════════════════
```

### Passo 2: Simulação Completa
```
Usuário: simule a consolidação completa de Cebola

[Skill mostra detalhes de cada migração sem executar]
```

### Passo 3: Backup Manual
```
Usuário: antes de consolidar Cebola, quero fazer backup do banco

[Usuário faz backup externamente]
```

### Passo 4: Execução com Validação Estendida
```
Usuário: consolide o grupo Cebola com validação completa

[Skill executa passo a passo, validando cada migração]
```

---

## Cenário 5: Validação Pós-Consolidação

```
Usuário: valide a consolidação de Sal Refinado

Resposta esperada:
═══════════════════════════════════════════════════════════════
VALIDAÇÃO: Sal Refinado
═══════════════════════════════════════════════════════════════

✓ ID principal (54xeQ4iHbLV3DdZs3yfr) está ativo
✓ Usado em 53 receitas (esperado: 53) ✅
✓ IDs antigos não estão mais em uso
✓ Ingredientes removidos confirmados

📋 TESTE DE RECEITAS (amostra):
  ✓ Quibe com coalhada - OK
  ✓ Isca de Frango - OK
  ✓ R. Cenoura - OK

✅ VALIDAÇÃO COMPLETA: Sucesso
   Nenhum problema detectado
═══════════════════════════════════════════════════════════════
```

---

## Cenário 6: Tratamento de Erro

```
Usuário: consolide o grupo Couve-flor

Skill detecta possível problema:
═══════════════════════════════════════════════════════════════
⚠️  ATENÇÃO: Possível Problema Detectado
═══════════════════════════════════════════════════════════════

O ID 684bfe28943203651ae5a925 está marcado para migração,
mas precisa ser verificado manualmente primeiro.

Este ID pode não ser realmente couve-flor!

Receitas que usam este ID:
  - Cubos de Carne com Tomate Cereja
  - Tiras de carne xadrez
  - Iscas de Carne c/ Molho de Requeijão

Deseja:
1. Verificar ingrediente antes de continuar
2. Cancelar consolidação
3. Continuar mesmo assim (não recomendado)

Digite sua escolha:
═══════════════════════════════════════════════════════════════
```

---

## Comandos Úteis Adicionais

### Listar Grupos por Prioridade
```
Usuário: liste os grupos críticos

Resposta:
🔴 GRUPOS CRÍTICOS (2):
1. Cebola - 165 receitas
2. Azeite Extra Virgem - 80 receitas
```

### Ver Status Geral
```
Usuário: mostre o status geral das consolidações

Resposta:
═══════════════════════════════════════════════════════════════
STATUS GERAL DE CONSOLIDAÇÕES
═══════════════════════════════════════════════════════════════

📊 ESTATÍSTICAS:
Total de grupos: 25
Grupos consolidados: 3
Grupos pendentes: 22
Receitas migradas: 12
Ingredientes removidos: 5

✅ CONSOLIDADOS:
  - Quinoa (baixa)
  - Repolho (baixa)
  - Mostarda (baixa)

⏳ PENDENTES:
  🔴 Crítica (2): Cebola, Azeite Extra Virgem
  🟠 Alta (2): Sal Refinado, Páprica Doce
  🟡 Média (6): ...
  🟢 Baixa (12): ...
═══════════════════════════════════════════════════════════════
```

### Buscar Receitas Específicas
```
Usuário: quais receitas usam o ingrediente QWXWVoo4kKqA2Yph6yFo?

Resposta:
Este ingrediente é usado em 58 receitas:
  - Quibe com coalhada e geléia de pimenta
  - Escondidinho de frango com batata doce
  - Filé de Frango ao Molho Curry
  ... (lista completa)
```

---

## Fluxo Completo Recomendado

### Semana 1: Grupos Baixos (Aprendizado)
```
Dia 1: Quinoa, Maçã, Barriga suína
Dia 2: Ketchup, Peito de Frango, Pão francês (remoções)
Dia 3: Champignon, Mostarda, Leite de coco
Dia 4: Validação e revisão
```

### Semana 2: Grupos Médios
```
Dia 1: Creme de leite, Feijão Branco
Dia 2: Repolho, Óleo de gergelim
Dia 3: Extrato de Tomate, Parmesão
Dia 4: Vinagre, Açúcar Cristal, Validação
```

### Semana 3: Grupos Altos e Críticos
```
Dia 1: Backup completo + Páprica Doce
Dia 2: Sal Refinado
Dia 3: Couve-flor (verificar primeiro!)
Dia 4: Validação extensiva
```

### Semana 4: Grupos Críticos (Máxima Atenção)
```
Dia 1: Backup + Staging + Azeite Extra Virgem
Dia 2: Validação Azeite
Dia 3: Backup + Staging + Cebola
Dia 4: Validação final + Documentação
```

---

## Troubleshooting

### Problema: API não responde
```
Usuário: a API não está respondendo, o que faço?

Skill verifica e responde:
- Teste de conectividade
- Status dos serviços
- Sugestão de tentar novamente mais tarde
- Logs salvos localmente para retry
```

### Problema: Migração falhou parcialmente
```
Usuário: algumas receitas não foram migradas, como corrigir?

Skill oferece:
1. Ver quais falharam
2. Tentar novamente apenas as que falharam
3. Rollback das bem-sucedidas
4. Investigar logs de erro
```

---

**Lembre-se**: Sempre comece pelos grupos mais simples para ganhar confiança antes de atacar os críticos!
