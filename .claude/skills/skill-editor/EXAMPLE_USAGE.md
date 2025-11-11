# Exemplo Prático de Uso

## Cenário: Adicionar Instrução sobre Densidade de Cubas

**Usuário solicita:** "Adicione instrução sobre como calcular densidade real de uma receita para escolher cuba correta"

---

## Passo 1: Analisar Estrutura

```bash
grep -n "^## " ficha-tecnica-assistente/SKILL.md
```

**Resultado:**
```
143: ## 2.5. Estrutura de `assembly_config`
165: ## 3. Cálculo de Perdas
```

**Análise:**
- Tema: Escolha de cubas → relacionado a "assembly_config"
- Já existe seção sobre cubas na linha 143
- Local correto: DENTRO da seção 2.5, não criar nova seção

---

## Passo 2: Ler Contexto Atual

```
Read ficha-tecnica-assistente/SKILL.md offset=143 limit=100
```

**Estrutura encontrada:**
```markdown
## 2.5. Estrutura de `assembly_config`

### Tipos de Container
- cuba-g (6kg)
- cuba-p (3kg)
...

### Regras de Uso de Cubas
- Capacidade: 6L água = 6kg
- Massas menos densas: podem pesar menos
...

### Exemplos
[5 exemplos práticos]
```

---

## Passo 3: Identificar Local Exato

**Decisão:**
- Tema: Densidade de cubas ✓
- Fluxo: Durante escolha de cuba (antes dos exemplos)
- Tipo: Instrução específica (cálculo técnico)
- **Local:** Criar subseção "Cálculo de Densidade" ENTRE "Regras de Uso" e "Exemplos"

---

## Passo 4: Preparar Inserção Integrada

**Texto a inserir:**

```markdown
### Cálculo de Densidade

Para escolher cuba correta, estimar densidade da receita:

**Densidade aproximada por tipo:**

- **Líquidos/Caldos**: 1,0 kg/L (mesma densidade da água)
  - Exemplo: Sopa, caldo, molho líquido
  - Cuba de 6L = 6kg real

- **Massas leves**: 0,6-0,8 kg/L (menos denso que água)
  - Exemplo: Arroz cozido, massas cozidas, purês
  - Cuba de 6L = 3,6-4,8kg real

- **Massas médias**: 0,8-1,0 kg/L (próximo da água)
  - Exemplo: Carne moída refogada, feijão cozido
  - Cuba de 6L = 4,8-6kg real

- **Massas densas**: 1,0-1,2 kg/L (mais denso que água)
  - Exemplo: Feijoada completa, estrogonofe cremoso
  - Cuba de 6L = 6-7,2kg real

**Fórmula prática:**

```
peso_estimado = volume_cuba × densidade_tipo
```

**Exemplo de aplicação:**
- Receita: Arroz branco (massa leve)
- Peso final desejado: 4,5kg
- Densidade: 0,75 kg/L
- Cuba necessária: 4,5kg ÷ 0,75 = 6L → Cuba-G ✓
```

---

## Passo 5: Executar Edição

```
Edit ficha-tecnica-assistente/SKILL.md

old_string:
### Regras de Uso de Cubas

[conteúdo existente]

### Exemplos

new_string:
### Regras de Uso de Cubas

[conteúdo existente]

### Cálculo de Densidade

[novo conteúdo integrado]

### Exemplos
```

---

## Passo 6: Validar

**Checklist:**
- [x] Inserido no local contextual correto (seção de cubas)
- [x] Não criou adendo no final
- [x] Fluxo lógico: Regras → Cálculo → Exemplos ✓
- [x] Linguagem direta e instrutiva ✓
- [x] Integrado com contexto existente ✓
- [x] Exemplos práticos incluídos ✓

---

## ❌ Como NÃO Fazer

### Erro 1: Adicionar no Final

```markdown
## 11. Tom de Comunicação
...

## 12. ADENDO: Cálculo de Densidade  ❌ ERRADO!

[Nova instrução aqui no final]
```

**Problema:**
- Contexto fragmentado (cubas faladas em 2 lugares)
- Adiciona seção órfã no final
- Usuário pode não ver a instrução ao ler seção de cubas

### Erro 2: Mencionar Correção

```markdown
### Cálculo de Densidade

⚠️ CORREÇÃO: Antes não explicávamos como calcular densidade!  ❌ ERRADO!
❌ ERRO anterior: Escolhíamos cuba sem considerar densidade
✅ AGORA: Use a fórmula abaixo...
```

**Problema:**
- Menciona erro anterior
- Tom apologético em vez de instrutivo
- Linguagem de correção desnecessária

### Erro 3: Criar Seção Separada

```markdown
## 2.5. Estrutura de `assembly_config`
[Instruções sobre cubas]

## 2.6. Densidade de Receitas  ❌ ERRADO!
[Cálculo de densidade]
```

**Problema:**
- Fragmenta contexto relacionado
- Força usuário a ler múltiplas seções sobre mesmo tema
- Quebra fluxo natural de leitura

---

## ✅ Resultado Correto

```markdown
## 2.5. Estrutura de `assembly_config`

### Tipos de Container
[Lista de tipos]

### Regras de Uso de Cubas
[Capacidade e uso]

### Cálculo de Densidade  ← INSERIDO AQUI
[Fórmula e exemplos]

### Exemplos
[Casos práticos]
```

**Por que está correto:**
- ✅ Contexto consolidado (tudo sobre cubas em uma seção)
- ✅ Fluxo lógico (regras → cálculo → exemplos)
- ✅ Linguagem direta (sem mencionar correção)
- ✅ Integrado perfeitamente (não parece "adicionado depois")

---

## Outros Exemplos Rápidos

### Exemplo 2: Adicionar Novo Tipo de Processo

**Usuário:** "Adicione processo 'marinating' (marinação)"

**Análise:**
- Tema: Processos → já existe lista de processos
- Ação: EXPANDIR lista existente, não criar nova seção

**Local correto:**
```markdown
**Processos disponíveis:**
- cleaning - Limpeza
- cooking - Cocção
- marinating - Marinação  ← ADICIONAR AQUI NA LISTA
- portioning - Porcionamento
```

**NÃO fazer:**
```markdown
## 8. NOVO: Processo de Marinação  ❌
```

---

### Exemplo 3: Corrigir Fórmula Errada

**Usuário:** "A fórmula de rendimento está errada, corrija"

**Ação:**
1. Localizar seção de rendimento
2. Substituir fórmula diretamente
3. Atualizar exemplos
4. NÃO mencionar que estava errado

**FAZER:**
```markdown
**Cálculo de rendimento:**

rendimento% = (peso_final / peso_inicial) × 100

**Exemplo:**
- Peso inicial: 100g
- Peso final: 75g
- Rendimento: 75%
```

**NÃO fazer:**
```markdown
⚠️ CORREÇÃO: A fórmula anterior estava errada!  ❌
Antes: rendimento = final - inicial (ERRADO)
Agora: rendimento = (final / inicial) × 100 (CERTO)
```

---

## Resumo

**Princípio fundamental:**
> Integre no local correto, não adicione no final

**Três perguntas:**
1. **Tema?** → Encontre seção relacionada
2. **Quando?** → Posição no fluxo (início/meio/fim)
3. **Tipo?** → Nível de abstração (conceito/instrução/exemplo)

**Sempre:**
- Linguagem direta
- Contexto consolidado
- Tom instrutivo
- Fluxo lógico
