 vi geminimini# Cozinha Ajustado - Guia de Commits

Este documento descreve o padrão para criar commits neste projeto. Seguir estas diretrizes ajuda a manter o histórico do repositório limpo, organizado e fácil de entender.

## Formato da Mensagem de Commit

Utilizamos um estilo similar ao [Conventional Commits](https://www.conventionalcommits.org/). Cada mensagem de commit deve ter o seguinte formato:

```
<tipo>: <descrição>
```

### Tipos de Commit

*   **feat**: Para novas funcionalidades (features).
*   **fix**: Para correções de bugs.
*   **chore**: Para tarefas de manutenção, como atualizações de dependências, configurações de build, ou limpeza de código que não afeta o usuário final.
*   **docs**: Para alterações na documentação.
*   **style**: Para alterações de formatação de código (espaçamento, ponto e vírgula, etc.).
*   **refactor**: Para refatoração de código que não altera a funcionalidade externa.
*   **test**: Para adicionar ou corrigir testes.

### Exemplo

```
feat: Adiciona funcionalidade de login com e-mail e senha
```

```
fix: Corrige cálculo de preço na tabela nutricional
```

```
chore: Atualiza dependências do Next.js para a versão mais recente
```

## Fluxo de Trabalho para Commits

1.  **Verifique as alterações:**
    Antes de tudo, verifique quais arquivos você modificou.
    ```bash
    git status
    ```

2.  **Adicione as alterações:**
    Adicione os arquivos que você deseja incluir no commit. Para adicionar todos os arquivos modificados:
    ```bash
    git add .
    ```
    Para adicionar um arquivo específico:
    ```bash
    git add <caminho/do/arquivo>
    ```

3.  **Faça o commit:**
    Crie o commit com uma mensagem clara e concisa, seguindo o formato descrito acima.
    ```bash
    git commit -m "tipo: descrição curta da sua alteração"
    ```

4.  **Envie para o GitHub:**
    Envie suas alterações para o repositório remoto. Substitua `<branch>` pelo nome da branch que você está usando (geralmente `main` ou `master`).
    ```bash
    git push origin <branch>
    ```

## Sincronizando as Branches `main` e `master`

A branch `main` é a branch de produção, utilizada para o deploy no Vercel. A `master` pode ser usada para desenvolvimento. Para manter a `main` atualizada:

1.  Mude para a branch `main`:
    ```bash
    git checkout main
    ```
2.  Faça o merge das alterações da `master`:
    ```bash
    git merge master
    ```
3.  Envie a `main` atualizada:
    ```bash
    git push origin main
    ```
