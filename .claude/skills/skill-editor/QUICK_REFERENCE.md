# Guia Rápido - Skill Editor

## 🎯 Quando Usar

Use esta skill quando precisar:
- Adicionar novas instruções a uma skill existente
- Expandir seções com mais detalhes
- Reorganizar conteúdo fragmentado
- Corrigir instruções mantendo linguagem direta

## ⚡ Decisão Rápida: Onde Inserir?

### Pergunta 1: Já existe seção sobre esse tema?
- **SIM** → Expandir seção existente
- **NÃO** → Ir para Pergunta 2

### Pergunta 2: Quando isso acontece no fluxo?
- **Início** → Inserir em seções de Setup/Preparação
- **Durante** → Inserir em seções de Execução/Operação
- **Fim** → Inserir em seções de Finalização/Validação

### Pergunta 3: Que tipo de conteúdo é?
- **Conceito geral** → Inserir logo após título da seção
- **Instrução específica** → Inserir após conceitos, antes de exemplos
- **Exemplo prático** → Inserir em blocos de exemplo

## 📋 Fluxo Rápido

```
1. Ler skill completa → Entender estrutura
2. Identificar local correto → Tema + Fluxo + Abstração
3. Integrar no local → Expandir seção existente
4. Validar → Checklist de qualidade
```

## 🔍 Comandos Úteis

### Mapear estrutura
```bash
grep -n "^##" SKILL.md  # Ver todas as seções principais
grep -n "^###" SKILL.md # Ver subseções
```

### Verificar problemas
```bash
# Linguagem de correção
grep -in "erro\|crítico\|fix\|correção" SKILL.md

# Adendos no final
tail -100 SKILL.md | grep -i "adendo\|update"
```

## ✅ Checklist Pós-Edição

Após cada edição, verificar:

**Estrutura:**
- [ ] Instrução está no local contextual correto
- [ ] Não há adendos no final
- [ ] Fluxo lógico mantido

**Linguagem:**
- [ ] Tom direto e instrutivo
- [ ] Não menciona erros passados
- [ ] Consistente com seções adjacentes

**Contexto:**
- [ ] Instruções relacionadas agrupadas
- [ ] Não há fragmentação
- [ ] Exemplos atualizados

## 💡 Exemplos Rápidos

### Exemplo 1: Adicionar validação
**Local:** Seção "Salvar" → Antes do exemplo de API
```markdown
### Validação Prévia

Validar campos obrigatórios antes de salvar:
- id, title, processes...
```

### Exemplo 2: Expandir lista
**Local:** Na própria lista existente
```markdown
<!-- Expandir aqui, não criar nova seção -->
- cleaning - Limpeza inicial
- cooking - Cocção com calor
- assembly - Montagem de componentes ← NOVO
```

### Exemplo 3: Consolidar fragmentação
**Local:** Criar UMA seção que agrupa tudo
```markdown
## 6. Controle de Temperatura

[Todas as instruções sobre temperatura aqui]
```

## 🚫 O Que Evitar

❌ **Não fazer:**
- Adicionar seções no final como "Update" ou "Adendo"
- Mencionar "correção de erro anterior"
- Fragmentar contexto relacionado em múltiplos locais
- Usar linguagem de alerta excessiva (⚠️ CRÍTICO)

✅ **Fazer:**
- Inserir no local contextual correto
- Escrever instruções diretas
- Agrupar contextos relacionados
- Usar tom instrutivo e confiante

## 🎓 Regra de Ouro

```
┌─────────────────────────────────────────────────┐
│ NUNCA adicione no final                         │
│ SEMPRE integre no local correto                 │
│                                                  │
│ Pergunte:                                       │
│ 1. Qual o tema? → Encontre seção relacionada   │
│ 2. Quando ocorre? → Posição no fluxo           │
│ 3. Que tipo? → Nível de abstração              │
└─────────────────────────────────────────────────┘
```
