---
name: skill-editor
description: Editor especializado para melhorar e expandir skills. Insere novas instruções nos locais corretos, mantém contexto consolidado e organiza conteúdo de forma lógica. Nunca cria adendos no final - sempre integra no local apropriado.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Skill Editor - Editor Inteligente de Skills

## Objetivo

Editar e expandir skills de forma consolidada, inserindo novas instruções nos locais corretos da estrutura existente, mantendo o contexto organizado e lógico.

## Princípios Fundamentais

### 1. Consolidação, Não Adição
- **SEMPRE** integrar novas instruções no local contextual correto
- **NUNCA** adicionar seções no final como "adendo" ou "atualização"
- **SEMPRE** manter instruções relacionadas juntas
- **NUNCA** fragmentar contextos relacionados em múltiplos locais

### 2. Linguagem Direta
- **SEMPRE** escrever instruções diretas e positivas
- **NUNCA** mencionar erros anteriores, correções ou problemas passados
- **SEMPRE** usar tom instrutivo e confiante
- **NUNCA** usar linguagem de alerta excessiva (⚠️ CRÍTICO, ❌ ERRO, etc.)

### 3. Organização Lógica
- **SEMPRE** seguir fluxo lógico: conceito → instrução → exemplo
- **NUNCA** misturar níveis de abstração na mesma seção
- **SEMPRE** agrupar instruções por tema/contexto
- **NUNCA** deixar instruções órfãs ou desconexas

### 4. Verificação de Consistência
- **SEMPRE** buscar conflitos com instruções existentes em outras seções
- **NUNCA** considerar edição concluída sem verificar toda a skill
- **SEMPRE** harmonizar TODAS as seções que mencionam o mesmo tema
- **NUNCA** criar ambiguidade entre instruções conflitantes
- **CRÍTICO**: Uma edição bem localizada mas que conflita com outras seções é pior que nenhuma edição

## Fluxo de Trabalho

### Passo 1: Análise da Estrutura Atual

**Antes de qualquer edição, mapear:**

1. **Estrutura de seções** (hierarquia de títulos ##, ###, ####)
2. **Contextos temáticos** (quais seções tratam de temas relacionados)
3. **Fluxo lógico** (ordem de execução/aprendizado)
4. **Lacunas e redundâncias** (o que falta, o que está duplicado)

**Comando para análise:**
```bash
grep -n "^##" SKILL.md  # Mapear todas as seções principais
grep -n "^###" SKILL.md # Mapear subseções
```

### Passo 2: Identificar Local Correto para Nova Instrução

**Critérios de decisão:**

#### A. Por Tema/Contexto
Nova instrução fala sobre o mesmo assunto que uma seção existente?
- **SIM**: Inserir DENTRO dessa seção
- **NÃO**: Procurar seção relacionada ou criar nova seção temática

#### B. Por Fluxo de Execução
Nova instrução é executada em qual momento do processo?
- **Início**: Inserir em seções de "Preparação" ou "Setup"
- **Durante**: Inserir em seções de "Execução" ou "Operação"
- **Fim**: Inserir em seções de "Finalização" ou "Validação"

#### C. Por Nível de Abstração
Nova instrução é:
- **Conceito geral**: Inserir no início da seção (após título)
- **Instrução específica**: Inserir após conceitos, antes de exemplos
- **Exemplo prático**: Inserir após instruções, dentro de blocos de exemplo

**Exemplo de decisão:**
```
Nova instrução: "Validar campos obrigatórios antes de salvar"

Análise:
- Tema: Salvamento/Persistência → Procurar seção "Salvar"
- Fluxo: Antes de salvar → Inserir ANTES da chamada API
- Abstração: Instrução específica → Inserir após conceito geral, antes do exemplo

Decisão: Inserir na Seção 7 "Salvar no Banco",
         após explicação da estrutura,
         antes do exemplo de curl
```

### Passo 3: Preparar Inserção

**Técnicas de inserção:**

#### A. Inserção em Seção Existente
Usar Edit tool para adicionar conteúdo no local exato:

```markdown
<!-- ANTES -->
## 5. Validação

Validar dados antes de processar.

### Exemplo
...

<!-- DEPOIS (inserindo nova instrução) -->
## 5. Validação

Validar dados antes de processar.

### Campos Obrigatórios

Verificar presença de campos essenciais:
- id: identificador único
- name: nome da receita
- ingredients: lista de ingredientes

### Exemplo
...
```

#### B. Expansão de Item Existente
Adicionar detalhes a instruções existentes:

```markdown
<!-- ANTES -->
- Calcular peso final

<!-- DEPOIS -->
- Calcular peso final considerando perdas por processo:
  - Limpeza: perda de cascas, aparas
  - Cocção: evaporação, redução
  - Porcionamento: sem perda adicional
```

#### C. Criação de Nova Seção (último recurso)
Somente quando o tema é completamente novo:

```markdown
<!-- Inserir APÓS seção relacionada, não no final do arquivo -->
## 4. Cálculo de Custos
...

## 4.1. Margem de Lucro  <!-- NOVA SEÇÃO relacionada a custos -->

Calcular margem de lucro sugerida baseada no custo total.

**Fórmulas:**
- Custo baixo (<R$2): margem 400-500%
- Custo médio (R$2-5): margem 300-400%
- Custo alto (>R$5): margem 200-300%
...

## 5. Validação  <!-- Seção seguinte -->
```

### Passo 4: Integrar com Contexto Existente

**Ao inserir nova instrução, garantir:**

#### A. Consistência de Tom
- Seguir o mesmo estilo de escrita das seções adjacentes
- Manter nível de detalhamento similar
- Usar mesma terminologia

#### B. Referências Cruzadas
- Adicionar referências a seções relacionadas
- Atualizar índices se existirem
- Conectar conceitos relacionados

```markdown
**Para detalhes sobre perdas, consulte Seção 10: Tabela de Referência**
```

#### C. Atualização de Exemplos
- Se nova instrução afeta exemplos existentes, atualizá-los
- Adicionar novos exemplos que demonstrem a nova instrução
- Manter exemplos completos e funcionais

### Passo 5: Limpeza de Linguagem

**Transformar linguagem de correção em instrução direta:**

#### Antes (linguagem de correção):
```markdown
❌ ERRO: Não deixe campos vazios!
⚠️ CRÍTICO: Isso causava bugs antes!
🔧 CORREÇÃO: Agora faça assim...
```

#### Depois (linguagem direta):
```markdown
**Campos obrigatórios:**

Preencher todos os campos essenciais:
- id: identificador único
- name: nome da receita
- ingredients: array de ingredientes

**Exemplo:**
{
  "id": "abc123",
  "name": "Arroz Branco",
  "ingredients": [...]
}
```

### Passo 6: Verificação de Conflitos

**CRÍTICO: Antes de finalizar a edição, verificar se a nova instrução conflita com instruções existentes em OUTRAS seções.**

#### Por Que Esta Etapa É Essencial

Nova instrução pode:
- Contradizer instruções em outras seções
- Tornar exemplos existentes incorretos
- Criar ambiguidade sobre qual regra seguir
- Exigir ajustes em múltiplas seções relacionadas

#### Processo de Verificação de Conflitos

**1. Identificar Termos-Chave da Nova Instrução**

Extrair palavras-chave principais que possam aparecer em outras seções:

```bash
# Exemplo: Nova instrução sobre "perguntar peso ao usuário"
# Termos-chave: "perguntar", "peso", "usuário", "porção"

# Buscar por termos relacionados
grep -in "perguntar.*peso\|peso.*perguntar\|perguntar.*porção" SKILL.md
grep -in "peso.*usuário\|usuário.*peso" SKILL.md
```

**2. Ler Contexto das Menções Encontradas**

Para cada resultado encontrado:
- Ler 10 linhas antes e depois
- Identificar se é instrução relacionada ao mesmo tema
- Verificar se há conflito ou contradição

```bash
# Se encontrou conflito na linha 250
grep -A10 -B10 "^250:" SKILL.md
```

**3. Categorizar Conflitos**

**Tipo A - Contradição Direta:**
```
Nova instrução: "NÃO perguntar peso se já informado"
Instrução existente (linha 250): "SEMPRE perguntar peso ao usuário"
→ AÇÃO: Ajustar instrução existente para harmonizar
```

**Tipo B - Ambiguidade:**
```
Nova instrução: "Usar peso base de 1kg nas etapas"
Instrução existente (linha 300): "Usar peso final solicitado"
→ AÇÃO: Adicionar condições claras de quando usar cada abordagem
```

**Tipo C - Exemplo Desatualizado:**
```
Nova instrução: "Usar processes: ['assembly'] na montagem"
Exemplo existente (linha 450): "processes": ["portioning"]
→ AÇÃO: Corrigir exemplo para refletir nova instrução
```

**Tipo D - Falta de Referência Cruzada:**
```
Nova instrução: "Aplicar cálculo proporcional (Passo 2.2.1)"
Instrução existente (linha 200): Menciona cálculo mas não referencia
→ AÇÃO: Adicionar referência cruzada "ver Passo 2.2.1"
```

#### Comandos para Detecção de Conflitos

**Busca por termos relacionados:**
```bash
# Substituir TERMO_CHAVE pelos conceitos da nova instrução
grep -in "TERMO_CHAVE" SKILL.md

# Buscar por variações
grep -in "termo\|variacao\|sinonimo" SKILL.md
```

**Buscar por exemplos que podem estar desatualizados:**
```bash
# Se nova instrução muda estrutura JSON
grep -in "\"campo_alterado\"" SKILL.md

# Se nova instrução muda processo
grep -in "processes.*\[.*portioning\|assembly" SKILL.md
```

**Buscar seções relacionadas por número:**
```bash
# Se editou seção 2.3, verificar seções relacionadas
grep -n "Passo 2\." SKILL.md  # Todas as subseções de Passo 2
grep -n "ver.*2\." SKILL.md   # Referências à seção 2
```

#### Estratégias de Resolução de Conflitos

**Estratégia 1: Harmonização com Condições**

Transformar instrução absoluta em condicional:

```markdown
<!-- ANTES (conflitante) -->
SEMPRE perguntar peso ao usuário

<!-- DEPOIS (harmonizado) -->
Perguntar peso ao usuário APENAS quando:
- Peso não foi informado na solicitação inicial
- Container type é "Porção" ou "Unid."
- Ver Passo 2.2.1 para cálculo proporcional quando peso já informado
```

**Estratégia 2: Atualização de Múltiplas Seções**

Criar lista de todas as seções que precisam ajuste:

```markdown
Conflitos identificados:
1. Linha 250 - Seção "Container Type" - contradição sobre perguntar peso
2. Linha 450 - Exemplo de montagem - usa "portioning" incorreto
3. Linha 680 - Seção "Porção e Unidade" - não referencia cálculo proporcional

Ações necessárias:
1. Edit linha 250 - adicionar condição "APENAS quando necessário"
2. Edit linha 450 - corrigir para "assembly" + assembly_config
3. Edit linha 680 - adicionar referência cruzada
```

**Estratégia 3: Consolidação de Instruções Fragmentadas**

Se nova instrução revela fragmentação:

```markdown
Problema: Instruções sobre "temperatura" estão em 3 lugares diferentes
- Linha 200: menciona temperatura de serviço
- Linha 450: menciona temperatura de segurança
- Linha 600: menciona temperatura de armazenamento

Solução: Consolidar em UMA seção "Controle de Temperatura"
com subseções para cada contexto
```

#### Checklist de Verificação de Conflitos

Antes de considerar a edição finalizada:

- [ ] Identifiquei todos os termos-chave da nova instrução
- [ ] Busquei esses termos em toda a skill com grep
- [ ] Li o contexto de cada menção encontrada (±10 linhas)
- [ ] Categorizei conflitos (contradição/ambiguidade/exemplo/referência)
- [ ] Ajustei TODAS as seções conflitantes, não só a nova
- [ ] Atualizei exemplos que ficaram incorretos
- [ ] Adicionei referências cruzadas onde necessário
- [ ] Verifiquei que instruções relacionadas estão harmonizadas

#### Exemplo Completo de Verificação

**Situação:** Adicionar instrução "Usar peso base nas etapas, peso real na montagem"

**Passo a passo:**

```bash
# 1. Identificar termos-chave
# Termos: "peso", "montagem", "etapa", "base", "final", "porção"

# 2. Buscar menções
grep -in "peso.*montagem\|montagem.*peso" SKILL.md
grep -in "peso.*etapa\|etapa.*peso" SKILL.md
grep -in "peso.*final" SKILL.md
grep -in "perguntar.*peso" SKILL.md

# 3. Resultados encontrados
# Linha 250: "Perguntar ao usuário peso da porção"
# Linha 320: "Usar peso final solicitado"
# Linha 450: Exemplo com "final_weight": 85
# Linha 680: "Peso definido pelo usuário"

# 4. Ler contexto
grep -A5 -B5 "250:" SKILL.md  # Seção sobre Container Type
grep -A5 -B5 "320:" SKILL.md  # Seção sobre Cálculo
grep -A5 -B5 "450:" SKILL.md  # Exemplo de montagem
grep -A5 -B5 "680:" SKILL.md  # Seção Porção e Unidade

# 5. Identificar conflitos
# - Linha 250: contradição - diz SEMPRE perguntar, mas nova instrução diz para usar se já informado
# - Linha 320: ambiguidade - não esclarece se pode usar peso base
# - Linha 450: exemplo OK, mas falta assembly_config
# - Linha 680: falta referência cruzada

# 6. Ajustar TODAS as seções
# Edit linha 250: adicionar "APENAS quando necessário" + nota
# Edit linha 320: adicionar condição sobre peso base
# Edit linha 450: completar exemplo com assembly_config
# Edit linha 680: adicionar referência "ver Passo 2.2.1"
```

### Passo 7: Validação Final da Edição

**Checklist pós-edição:**

- [ ] Nova instrução está no local contextualmente correto?
- [ ] Fluxo lógico da seção permanece coerente?
- [ ] Instruções relacionadas estão agrupadas?
- [ ] Linguagem é direta, sem mencionar erros?
- [ ] Exemplos estão atualizados e completos?
- [ ] Não há adendos ou seções "Update" no final?
- [ ] Referências cruzadas estão corretas?
- [ ] Tom e estilo são consistentes?
- [ ] **Verificação de conflitos foi executada (Passo 6)**
- [ ] **Todas as seções conflitantes foram ajustadas**
- [ ] **Exemplos em outras seções foram atualizados se necessário**

## Padrões de Organização

### Estrutura Ideal de Seção

```markdown
## N. Título da Seção

[Parágrafo introdutório: o que é e por que é importante]

### Conceito Principal

[Explicação do conceito em alto nível]

#### Regras e Diretrizes

[Lista de regras específicas]

- Regra 1: descrição
- Regra 2: descrição

#### Casos Especiais

[Situações que fogem do padrão]

**Caso A: [Situação]**
- Como identificar
- Como proceder

**Caso B: [Situação]**
- Como identificar
- Como proceder

### Exemplos Práticos

**Exemplo 1: [Caso comum]**
```
[Código/exemplo completo]
```

**Exemplo 2: [Caso especial]**
```
[Código/exemplo completo]
```

### Referências

- Ver também: [Seções relacionadas]
```

### Ordem Lógica de Seções

**Para skills de processo:**

1. **Introdução e Objetivo** - O que a skill faz
2. **Modo de Operação** - Como a skill opera (princípios)
3. **Ferramentas e Recursos** - O que está disponível
4. **Configuração Inicial** - Setup necessário
5. **Fluxo Principal** - Passos do processo principal
6. **Detalhes Técnicos** - Especificações, cálculos, validações
7. **Exemplos Completos** - Casos práticos do início ao fim
8. **Tabelas de Referência** - Dados auxiliares
9. **Tom de Comunicação** - Como se comunicar com usuário
10. **Troubleshooting** - Situações especiais (apenas se necessário)

### Níveis de Detalhamento

**Princípio: Do geral ao específico**

```markdown
## Título Principal (##)
[Visão geral do tema completo]

### Sub-tema (###)
[Aspecto específico do tema principal]

#### Detalhe (####)
[Instrução precisa ou caso específico]
```

**Evitar:**
- Pular níveis (## → ####)
- Misturar níveis de abstração na mesma seção
- Seções com apenas um item (desnecessário)

## Comandos Úteis

### Análise de Estrutura

```bash
# Ver hierarquia de seções
grep -n "^#" SKILL.md

# Encontrar seções específicas
grep -n "^## [0-9]" SKILL.md

# Verificar tamanho de seções
awk '/^## / {if(prev) print prev" "count; prev=$0; count=0; next} {count++} END {print prev" "count}' SKILL.md
```

### Busca de Padrões Problemáticos

```bash
# Linguagem de correção
grep -in "erro\|crítico\|fix\|correção\|bug" SKILL.md

# Adendos no final
tail -100 SKILL.md | grep -i "adendo\|update\|nova\|correção"

# Seções órfãs (muito curtas)
awk '/^## / {if(prev && count<3) print "Seção curta: "prev; prev=$0; count=0; next} {count++}' SKILL.md
```

## Exemplos de Edições

### Exemplo 1: Adicionar Validação de Campos

**Situação:** Precisa adicionar validação de campos obrigatórios

**Análise:**
- Tema: Validação (relacionado a "Salvar no Banco")
- Fluxo: Antes de salvar
- Local correto: Seção 7 "Salvar no Banco", antes do exemplo de API

**Ação:**
```markdown
<!-- INSERIR ANTES do exemplo de curl -->

### Validação Prévia

Antes de enviar para API, validar estrutura completa:

**Campos obrigatórios por preparação:**
- id (string)
- title (string)
- processes (array)
- ingredients (array)
- instructions (string)
- notes (array)
- total_cost_prep (number)
- yield_percentage_prep (number)

**Validação de notes:**
Cada nota deve ter:
- title (string)
- content (string)
- updatedAt (string formato "YYYY-MM-DD")

<!-- Depois vem o exemplo de curl existente -->
```

### Exemplo 2: Expandir Instrução de Processos

**Situação:** Adicionar novos tipos de processos

**Análise:**
- Tema: Processos (já existe seção sobre isso)
- Local correto: Expandir lista existente de processos

**Ação:**
```markdown
<!-- ANTES -->
**Processos disponíveis:**
- cleaning
- cooking
- portioning

<!-- DEPOIS - expandindo a lista existente -->
**Processos disponíveis:**
- cleaning - Limpeza e preparação inicial
- cooking - Cocção com aplicação de calor
- portioning - Divisão em porções
- assembly - Montagem de componentes
- refrigeration - Resfriamento controlado
- fermentation - Fermentação natural
```

### Exemplo 3: Reorganizar Seção Fragmentada

**Situação:** Instruções sobre "temperatura" estão em 3 lugares diferentes

**Análise:**
- Contexto fragmentado: precisa consolidação
- Criar/expandir seção única sobre temperatura

**Ação:**
```markdown
<!-- Consolidar tudo em UMA seção -->

## 6. Controle de Temperatura

### Temperaturas Críticas

**Segurança alimentar:**
- Carnes: 75°C interno (cozimento completo)
- Preparações quentes: ≥60°C (serviço)
- Refrigeração: 2-4°C (armazenamento)

### Quando Incluir Nota de Temperatura

Incluir nota "Temperatura de Serviço" quando:
- Temperatura ≥65°C (segurança)
- Requer refrigeração (conservação)
- Temperatura afeta qualidade (textura)

### Medição e Controle

**Equipamentos:**
- Termômetro culinário digital
- Termômetro infravermelho (superfície)

**Pontos de medição:**
- Centro geométrico do alimento
- Parte mais espessa
- Múltiplos pontos para peças grandes

### Exemplos por Tipo de Preparação

**Carnes assadas:**
- Temperatura interna: 75°C
- Descanso: 10 minutos
- Serviço: 60-70°C

**Frituras:**
- Óleo: 180°C
- Serviço: imediato (60-70°C)

**Molhos quentes:**
- Preparo: 90-95°C (fervura)
- Serviço: 50-60°C (morno)
```

## Fluxo de Edição Completo

### Solicitação de Edição

**Usuário pede:** "Adicione instrução sobre X"

**Passo a passo:**

1. **Ler skill completa**
   ```
   Read SKILL.md (arquivo completo)
   ```

2. **Mapear estrutura**
   ```bash
   grep -n "^##" SKILL.md  # Identificar seções
   ```

3. **Identificar local correto**
   - Qual seção trata do tema relacionado?
   - Em que momento do fluxo isso ocorre?
   - Que nível de abstração tem a instrução?

4. **Ler contexto ao redor**
   ```
   Read SKILL.md offset=[linha-20] limit=50
   ```

5. **Preparar texto consolidado**
   - Escrever nova instrução com tom/estilo consistente
   - Integrar com instruções adjacentes
   - Adicionar exemplos se necessário

6. **Executar edição inicial**
   ```
   Edit SKILL.md
   old_string: [seção existente]
   new_string: [seção expandida com nova instrução integrada]
   ```

7. **CRÍTICO: Verificar conflitos (Passo 6)**
   - Identificar termos-chave da nova instrução
   - Buscar esses termos em toda a skill
   - Ler contexto de cada menção encontrada
   - Identificar e categorizar conflitos
   - Ajustar TODAS as seções conflitantes

8. **Validar resultado final (Passo 7)**
   - Ler seção editada
   - Verificar fluxo lógico
   - Confirmar integração
   - Validar que não há conflitos remanescentes

## Casos Especiais

### Caso 1: Instrução Contradiz Conteúdo Existente

**Situação:** Nova instrução contradiz instrução antiga

**Ação:**
1. Identificar qual é a instrução correta/atual
2. Substituir completamente a instrução antiga
3. Atualizar todos os exemplos afetados
4. NÃO mencionar que havia contradição
5. Apresentar apenas a instrução correta

**Exemplo:**
```markdown
<!-- NÃO fazer -->
❌ Antes estava errado: "peso_final = peso_inicial"
✅ Agora correto: "peso_final = peso_inicial * (1 - perda%)"

<!-- FAZER -->
**Cálculo de peso final:**

peso_final = peso_inicial × (1 - percentual_perda)

**Exemplo:**
- Peso inicial: 100g
- Perda: 20%
- Peso final: 100 × (1 - 0.20) = 80g
```

### Caso 2: Criar Nova Seção Grande

**Situação:** Nova funcionalidade requer seção extensa

**Ação:**
1. Identificar posição lógica na hierarquia
2. Criar estrutura completa (conceito → regras → exemplos)
3. Adicionar referências cruzadas
4. Atualizar índice se houver

**Posicionamento:**
- NUNCA no final do arquivo
- SEMPRE após seção tematicamente relacionada
- Respeitar numeração lógica

### Caso 3: Remover Conteúdo Obsoleto

**Situação:** Instrução antiga não é mais válida

**Ação:**
1. Substituir completamente por nova instrução
2. NÃO deixar comentário "removido porque..."
3. Atualizar exemplos afetados
4. Verificar referências cruzadas

## Tom de Comunicação

### Princípios de Escrita

**FAZER:**
- ✅ Instruções diretas no imperativo
- ✅ Explicações claras e objetivas
- ✅ Exemplos completos e práticos
- ✅ Terminologia consistente

**NÃO FAZER:**
- ❌ Mencionar erros passados
- ❌ Linguagem apologética
- ❌ Advertências excessivas
- ❌ Histórico de mudanças

### Exemplos de Tom

**Tom Correto (direto e instrutivo):**
```markdown
**Calcular peso final:**

peso_final = peso_inicial × (1 - percentual_perda)

Aplicar percentual de perda específico para cada processo:
- Limpeza de carnes: 10-15%
- Cocção de carnes: 20-30%
- Limpeza de vegetais: 5-15%
```

**Tom Incorreto (menciona erro/correção):**
```markdown
⚠️ CORREÇÃO IMPORTANTE: Antes calculávamos errado!

❌ ERRADO (antes): peso_final = peso_inicial
✅ CORRETO (agora): peso_final = peso_inicial × (1 - percentual_perda)

Esse erro causava problemas graves...
```

## Checklist Final

Após cada edição, verificar:

### Estrutura
- [ ] Nova instrução está no local contextual correto
- [ ] Não há adendos ou updates no final do arquivo
- [ ] Hierarquia de títulos está consistente
- [ ] Fluxo lógico está mantido

### Conteúdo
- [ ] Linguagem é direta e instrutiva
- [ ] Não menciona erros, correções ou problemas passados
- [ ] Exemplos estão completos e atualizados
- [ ] Terminologia é consistente

### Contexto
- [ ] Instruções relacionadas estão agrupadas
- [ ] Referências cruzadas estão corretas
- [ ] Nível de abstração é apropriado
- [ ] Tom é consistente com seções adjacentes

### Conflitos (CRÍTICO)
- [ ] Identifiquei termos-chave da nova instrução
- [ ] Busquei esses termos em toda a skill com grep
- [ ] Li contexto de cada menção encontrada
- [ ] Verifiquei conflitos (contradição/ambiguidade/exemplo)
- [ ] Ajustei TODAS as seções conflitantes
- [ ] Atualizei exemplos em outras seções se necessário
- [ ] Adicionei referências cruzadas onde apropriado

### Qualidade
- [ ] Não há fragmentação de contextos
- [ ] Não há redundância desnecessária
- [ ] Não há seções órfãs ou muito curtas
- [ ] Documentação está completa

## Comandos de Manutenção

### Verificar Qualidade Geral

```bash
# Contar seções por nível
grep "^##" SKILL.md | wc -l    # Seções principais
grep "^###" SKILL.md | wc -l   # Subseções
grep "^####" SKILL.md | wc -l  # Detalhes

# Verificar linguagem problemática
grep -i "erro\|crítico\|bug\|fix\|correção\|problema" SKILL.md

# Verificar adendos no final
tail -200 SKILL.md | grep -i "update\|adendo\|nova seção\|correção"
```

### Análise de Fragmentação

```bash
# Encontrar tópicos repetidos
grep -i "^###.*temperatura" SKILL.md
grep -i "^###.*validação" SKILL.md
grep -i "^###.*custo" SKILL.md

# Se encontrar múltiplas seções do mesmo tema → consolidar
```

---

**Uso desta skill:**

Quando usuário pedir para adicionar, corrigir ou expandir uma skill:
1. Ler skill completa
2. Analisar estrutura e contexto
3. Identificar local correto
4. Integrar instrução no local apropriado
5. Manter linguagem direta
6. Validar resultado
