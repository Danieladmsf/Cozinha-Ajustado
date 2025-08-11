# Como Enviar para GitHub - Guia Definitivo para IAs

**PROBLEMA**: IAs não conseguem fazer push para GitHub mesmo seguindo instruções.
**SOLUÇÃO**: Este guia com comandos testados e aprovados.

## 🚀 COMANDOS OBRIGATÓRIOS (Copie Exatamente)

### **1. Verificar Estado**
```bash
git remote -v
git status
```

### **2. Adicionar Alterações**
```bash
git add .
```

### **3. Resolver Problema Comum (se aparecer warning)**
```bash
# Se aparecer: "adding embedded git repository"
git rm --cached nome-da-pasta
```

### **4. Commit Estruturado**
```bash
git commit -m "$(cat <<'EOF'
feat: descrição clara da funcionalidade

- Principal recurso adicionado
- Melhoria implementada
- Correção realizada

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### **5. Enviar para GitHub**
```bash
git push origin main
```

## ✅ Resultado Esperado
```
To https://github.com/usuario/repositorio.git
   abc123..def456  main -> main
```

## ❌ Erros Comuns de IAs

- **ERRO 1**: Usar `git push` → **CORRETO**: `git push origin main`
- **ERRO 2**: Ignorar warnings → **CORRETO**: `git rm --cached pasta-problema`
- **ERRO 3**: Commit simples → **CORRETO**: Usar HEREDOC com estrutura

## 🆘 Configuração Inicial (Uma vez só)

Se der erro de autenticação:

```bash
# 1. Criar token em: https://github.com/settings/tokens/new
# 2. Configurar:
git config --global user.name "Seu Nome"
git config --global user.email "email@exemplo.com"
echo "https://SEU_USUARIO:SEU_TOKEN@github.com" > ~/.git-credentials
git config --global credential.helper store
```

## 📋 Checklist Final

- [ ] `git remote -v` mostra repositório correto
- [ ] `git add .` executado
- [ ] Warnings resolvidos com `git rm --cached`
- [ ] Commit com HEREDOC estruturado
- [ ] Push com `origin main` especificado

**TESTADO E APROVADO**: Funcionou com 78 arquivos e +14.560 linhas.