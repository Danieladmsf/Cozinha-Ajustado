# Como Enviar Alterações para o GitHub

Guia completo e sem confusões para fazer commits e enviar suas alterações para o repositório no GitHub.

## ⚠️ IMPORTANTE: Configuração Inicial (Faça uma vez só)

### **Passo 0: Configurar Git (Primeira vez)**
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seuemail@gmail.com"
```

### **Passo 0.1: Configurar Autenticação GitHub**
**PROBLEMA COMUM**: "fatal: could not read Username for 'https://github.com'"

**SOLUÇÃO: Personal Access Token (Recomendado)**

1. **Criar Token no GitHub:**
   - Acesse: https://github.com/settings/tokens/new
   - **Token name**: "Claude Code Deploy"
   - **Expiration**: 90 days
   - **Scopes**: Marque apenas `repo` (acesso aos repositórios)
   - Clique em **"Generate token"**
   - **⚠️ COPIE O TOKEN** (só aparece uma vez!)

2. **Configurar Token no Git:**
```bash
# Configurar credenciais (substitua SEU_TOKEN pelo token copiado)
git config --global credential.helper store
echo "https://SEU_USUARIO:SEU_TOKEN@github.com" > ~/.git-credentials
```

**Exemplo:**
```bash
# Se seu usuário é "daniela" e token é "ghp_abc123..."
echo "https://daniela:ghp_abc123@github.com" > ~/.git-credentials
```

## Passos para Enviar ao GitHub

### **1. Verificar Alterações**
Veja quais arquivos foram modificados:
```bash
git status
```

### **2. Adicionar Arquivos**
```bash
# Para adicionar arquivos específicos
git add caminho/do/arquivo.js

# Para adicionar todos os arquivos modificados
git add .

# Para adicionar uma pasta específica
git add app/nova-funcionalidade/
```

### **3. Criar Commit**
Faça o commit com uma mensagem descritiva:
```bash
git commit -m "feat: descrição clara da sua alteração"
```

### **4. Enviar para GitHub**
Envie as alterações para o repositório:
```bash
git push
```

**Se der erro "permission denied" ou "authentication failed":**
```bash
# Verificar se o token está configurado
cat ~/.git-credentials

# Se não estiver, configure novamente (passo 0.1)
```

## Tipos de Commit

Use estes prefixos nas suas mensagens:

- **feat**: Nova funcionalidade
- **fix**: Correção de bug  
- **refactor**: Melhoria no código existente
- **chore**: Manutenção (dependências, configs)
- **docs**: Documentação

## Exemplos Práticos Completos

### **Exemplo 1: Nova funcionalidade**
```bash
git status                                           # Ver o que mudou
git add components/lista-compras/                    # Adicionar nova pasta
git commit -m "feat: implementa lista de compras dinâmica"  # Commitar
git push                                             # Enviar para GitHub
```

### **Exemplo 2: Correção de bug**
```bash
git status
git add app/cardapio/page.jsx                       # Arquivo específico
git commit -m "fix: corrige cálculo de preços na tela de cardápio"
git push
```

### **Exemplo 3: Múltiplos arquivos**
```bash
git status
git add .                                           # Todos os arquivos
git commit -m "refactor: melhora interface de ingredientes"
git push
```

## Resolução de Problemas Comuns

### **Problema 1: "fatal: could not read Username"**
**Solução:** Configurar Personal Access Token (ver Passo 0.1)

### **Problema 2: "Your branch is ahead of origin/main"**
**Solução:** Fazer git push para enviar commits locais

### **Problema 3: "permission denied (publickey)"**
**Solução:** Usar HTTPS com token em vez de SSH

### **Problema 4: Esqueceu de adicionar arquivos**
```bash
git status                    # Ver arquivos não commitados
git add arquivo-esquecido.js  # Adicionar arquivo
git commit --amend           # Emendar último commit
git push --force-with-lease  # Forçar envio (cuidado!)
```

## Comandos Úteis para Debug

```bash
# Ver últimos commits
git log --oneline -5

# Ver diferenças antes de commitar  
git diff

# Ver status detalhado
git status -v

# Ver configuração do repositório
git remote -v

# Ver configuração do usuário
git config --list | grep user

# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1
```

## Fluxo Resumido (Copie e Cole)

```bash
# 1. Ver o que mudou
git status

# 2. Adicionar tudo
git add .

# 3. Commitar
git commit -m "feat: sua descrição aqui"

# 4. Enviar
git push
```

## ✅ Checklist Final

Antes de cada push, verifique:

- [ ] `git status` mostra os arquivos corretos
- [ ] Mensagem de commit é clara e descritiva  
- [ ] Token de acesso está configurado
- [ ] Código foi testado localmente
- [ ] Não há arquivos sensíveis (senhas, tokens) no commit

---

## 🆘 Em Caso de Emergência

Se algo der muito errado:

```bash
# Ver últimos 5 commits
git log --oneline -5

# Voltar ao commit anterior (CUIDADO: perde alterações)
git reset --hard HEAD~1

# Ou pedir ajuda com o log de erro específico
```

**Lembre-se:** O Git é seguro! Raramente você perde código permanentemente. Na dúvida, faça backup antes de comandos com `--force` ou `--hard`.