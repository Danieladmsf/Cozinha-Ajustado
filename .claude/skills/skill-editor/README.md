# Skill Editor - Editor Inteligente de Skills

## 📖 Visão Geral

Skill especializada em editar e expandir outras skills de forma consolidada e organizada. Insere novas instruções nos locais contextuais corretos, mantém conteúdo agrupado por tema e evita fragmentação.

## 🎯 Objetivo Principal

**Consolidar, não adicionar.**

Esta skill garante que:
- Novas instruções sejam inseridas no local correto
- Contextos relacionados fiquem agrupados
- Não haja adendos ou "updates" no final dos arquivos
- Linguagem seja sempre direta, sem mencionar erros passados

## 📚 Arquivos

### 1. SKILL.md (Principal)
Documentação completa com:
- Princípios fundamentais
- Fluxo de trabalho em 6 passos
- Critérios de decisão para inserção
- Padrões de organização
- Casos especiais
- Exemplos detalhados

### 2. QUICK_REFERENCE.md (Referência Rápida)
Guia prático com:
- Árvore de decisão rápida
- Comandos úteis
- Checklist pós-edição
- Regra de ouro

### 3. EXAMPLE_USAGE.md (Exemplo Prático)
Caso completo mostrando:
- Análise de estrutura
- Identificação de local correto
- Inserção integrada
- Comparação: como fazer vs como NÃO fazer

## 🚀 Como Usar

### Uso Básico

```
1. Usuário: "Adicione instrução sobre X na skill Y"

2. Skill Editor:
   - Lê skill completa
   - Analisa estrutura
   - Identifica local correto (tema + fluxo + abstração)
   - Integra instrução no local apropriado
   - Valida resultado
```

### Critérios de Decisão

**Pergunta 1: Tema**
- Já existe seção sobre isso? → Expandir seção existente
- Não existe? → Criar seção próxima a temas relacionados

**Pergunta 2: Fluxo**
- Quando isso acontece? → Início, meio ou fim do processo?

**Pergunta 3: Abstração**
- É conceito, instrução ou exemplo? → Define posição exata

## ✅ Princípios

### 1. Consolidação
- Instruções relacionadas ficam juntas
- Contextos não são fragmentados
- Uma seção = um tema completo

### 2. Linguagem Direta
- Instruções são diretas e instrutivas
- Não menciona erros passados
- Tom confiante e profissional

### 3. Organização Lógica
- Fluxo: conceito → regras → exemplos
- Hierarquia consistente
- Transições naturais

## 🎓 Exemplo Visual

### ❌ Como NÃO Fazer

```markdown
## 5. Validação
[Instruções de validação]

## 6. Processamento
[Instruções de processamento]

## 7. ADENDO: Nova validação  ← ERRADO!
[Nova instrução sobre validação no final]
```

**Problemas:**
- Contexto fragmentado (validação em 2 lugares)
- Adendo no final
- Força leitura de múltiplas seções

### ✅ Como Fazer

```markdown
## 5. Validação
[Instruções de validação existentes]

### Validação de Campos Obrigatórios  ← INSERIDO AQUI
[Nova instrução integrada no contexto]

### Exemplos
[Exemplos atualizados]

## 6. Processamento
[Instruções de processamento]
```

**Benefícios:**
- Contexto consolidado (toda validação em um lugar)
- Fluxo lógico mantido
- Integração natural

## 📋 Checklist de Qualidade

Após cada edição, verificar:

**Estrutura:**
- [ ] Instrução no local contextual correto
- [ ] Sem adendos no final
- [ ] Hierarquia consistente
- [ ] Fluxo lógico mantido

**Conteúdo:**
- [ ] Linguagem direta e instrutiva
- [ ] Não menciona erros passados
- [ ] Exemplos atualizados
- [ ] Terminologia consistente

**Contexto:**
- [ ] Instruções relacionadas agrupadas
- [ ] Não há fragmentação
- [ ] Referências corretas
- [ ] Tom consistente

## 🛠️ Comandos Úteis

```bash
# Mapear estrutura
grep -n "^##" SKILL.md

# Verificar problemas
grep -in "erro\|crítico\|fix\|correção" SKILL.md

# Verificar adendos
tail -100 SKILL.md | grep -i "adendo\|update"
```

## 💡 Casos de Uso

### Caso 1: Adicionar Validação
**Local:** Seção de salvamento, antes do exemplo de API

### Caso 2: Expandir Lista
**Local:** Dentro da lista existente, não criar nova seção

### Caso 3: Corrigir Instrução
**Local:** Substituir diretamente, sem mencionar erro

### Caso 4: Reorganizar Fragmentação
**Local:** Consolidar em UMA seção temática

## 🎯 Resultado Esperado

Skills editadas com esta ferramenta ficam:

✅ **Consolidadas** - Contextos relacionados juntos
✅ **Organizadas** - Fluxo lógico mantido
✅ **Diretas** - Linguagem instrutiva e confiante
✅ **Completas** - Sem lacunas ou fragmentação
✅ **Profissionais** - Sem menção a erros passados

## 📖 Leitura Recomendada

1. **Primeiro:** QUICK_REFERENCE.md (3 minutos)
2. **Depois:** EXAMPLE_USAGE.md (10 minutos)
3. **Referência:** SKILL.md (completo)

## 🔗 Uso com Outras Skills

Esta skill é especialmente útil para manter:
- `ficha-tecnica-assistente` - Sempre atualizada e organizada
- Qualquer outra skill - Seguindo mesmos princípios

---

**Versão:** 1.0
**Criada:** 2025-11-06
**Princípio:** Consolidar, não adicionar
