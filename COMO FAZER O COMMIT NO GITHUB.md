# Como Fazer Commit no GitHub

Este guia explica como fazer commit local e enviar para o repositório GitHub.

## Passos para Fazer Commit

### 1. Verificar Status
```bash
git status
```
Mostra os arquivos modificados, adicionados ou removidos.

### 2. Adicionar Arquivos ao Staging
```bash
# Adicionar todos os arquivos
git add .

# Ou adicionar arquivos específicos
git add nome-do-arquivo.js
```

### 3. Verificar Mudanças Staged
```bash
git diff --staged
```
Mostra as mudanças que serão incluídas no commit.

### 4. Criar Commit Local
```bash
git commit -m "feat: descrição das mudanças

- Detalhe 1
- Detalhe 2
- Detalhe 3

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 5. Enviar para GitHub
```bash
git push origin main
```

## Tipos de Commit (Conventional Commits)

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `refactor:` - Refatoração de código
- `docs:` - Alterações na documentação
- `style:` - Mudanças de formatação
- `test:` - Adição ou correção de testes
- `chore:` - Tarefas de manutenção

## Exemplo Completo
```bash
# 1. Verificar status
git status

# 2. Adicionar mudanças
git add .

# 3. Criar commit
git commit -m "feat: adiciona nova funcionalidade de login

- Implementa autenticação de usuário
- Adiciona validação de formulário
- Atualiza interface de login

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Enviar para GitHub
git push origin main
```

## Comandos Úteis

### Verificar Log de Commits
```bash
git log --oneline -5
```

### Desfazer Mudanças (antes do commit)
```bash
git restore nome-do-arquivo.js
```

### Remover do Staging
```bash
git restore --staged nome-do-arquivo.js
```

### Verificar Branch Atual
```bash
git branch
```

## Dicas Importantes

1. **Sempre verifique o status** antes de fazer commit
2. **Escreva mensagens descritivas** para os commits
3. **Use conventional commits** para padronizar as mensagens
4. **Teste o código** antes de fazer push
5. **Mantenha commits pequenos** e focados em uma funcionalidade

## Troubleshooting

### Se houver conflitos no push:
```bash
git pull origin main
# Resolver conflitos manualmente
git add .
git commit -m "fix: resolve merge conflicts"
git push origin main
```

### Se precisar alterar o último commit:
```bash
git commit --amend -m "nova mensagem"
```

---

**Último commit realizado:** a801644 - feat: atualiza sistema de portal de clientes e adiciona novos componentes