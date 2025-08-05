# Como Enviar Alterações para o GitHub

Guia rápido e prático para fazer commits e enviar suas alterações para o repositório no GitHub.

## Passos para Enviar ao GitHub

### 1. **Verificar Alterações**
Veja quais arquivos foram modificados:
```bash
git status
```

### 2. **Adicionar Arquivos**
Adicione os arquivos que deseja enviar:
```bash
# Para adicionar arquivos específicos
git add caminho/do/arquivo.js

# Para adicionar todos os arquivos modificados
git add .
```

### 3. **Criar Commit**
Faça o commit com uma mensagem descritiva:
```bash
git commit -m "feat: descrição clara da sua alteração"
```

### 4. **Enviar para GitHub**
Envie as alterações para o repositório:
```bash
git push
```

## Tipos de Commit

Use estes prefixos nas suas mensagens:

- **feat**: Nova funcionalidade
- **fix**: Correção de bug  
- **refactor**: Melhoria no código existente
- **chore**: Manutenção (dependências, configs)
- **docs**: Documentação

## Exemplos Práticos

```bash
# Exemplo completo
git status
git add components/pedidos/Orders.jsx
git commit -m "feat: adiciona cálculo automático para categoria carnes"
git push
```

```bash
# Para enviar tudo modificado
git add .
git commit -m "fix: corrige erro no cálculo de preços"
git push
```

## Dicas Importantes

- ✅ Sempre verifique com `git status` antes de fazer commit
- ✅ Use mensagens claras e descritivas
- ✅ Teste seu código antes de enviar
- ✅ Um commit = uma funcionalidade/correção

## Em Caso de Erro

Se algo der errado, você pode:
```bash
# Ver últimos commits
git log --oneline -5

# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1

# Ver diferenças antes de commitar
git diff
```
