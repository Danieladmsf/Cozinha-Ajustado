# Checklist de Segurança - Consolidação de Ingredientes

## Antes de Começar

### ✅ Preparação Inicial
- [ ] Revisei o relatório completo em `/tmp/RELATORIO_DUPLICADOS.txt`
- [ ] Entendi o plano de ação em `/tmp/PLANO_ACAO_CONSOLIDACAO.txt`
- [ ] Li os dados estruturados em `/tmp/DUPLICADOS_JSON.json`
- [ ] Tenho acesso ao banco de dados
- [ ] Tenho permissões para modificar ingredientes e receitas
- [ ] Defini horário de execução (preferir baixo uso)

### ✅ Backup (CRÍTICO!)
- [ ] Backup completo do banco de dados feito
- [ ] Backup testado e validado
- [ ] Backup armazenado em local seguro
- [ ] Tenho plano de restore se necessário
- [ ] Documentei data/hora do backup

### ✅ Ambiente
- [ ] Conexão estável com a internet
- [ ] API está respondendo normalmente
- [ ] Não há manutenções programadas
- [ ] Outros usuários foram notificados (se aplicável)
- [ ] Defini janela de tempo adequada

---

## Durante a Consolidação

### Para CADA Grupo

#### ✅ Análise Pré-Consolidação
- [ ] Analisei o grupo com `analise o grupo [NOME]`
- [ ] Revisei todas as receitas que serão afetadas
- [ ] Entendi quais IDs serão mantidos/migrados/removidos
- [ ] Verifiquei o nível de prioridade/risco
- [ ] Li as observações especiais (se houver)

#### ✅ Simulação
- [ ] Executei simulação com `simule a consolidação de [NOME]`
- [ ] Revisei as operações que serão executadas
- [ ] Confirmei que o tempo estimado é aceitável
- [ ] Não identificei problemas na simulação

#### ✅ Confirmação
- [ ] Tenho certeza de que quero prosseguir
- [ ] Confirmei os IDs de origem e destino
- [ ] Entendi o impacto nas receitas
- [ ] Não há dúvidas pendentes

#### ✅ Execução
- [ ] Executei `consolide o grupo [NOME]`
- [ ] Confirmei quando solicitado
- [ ] Acompanhei o progresso em tempo real
- [ ] Verifiquei se houve erros durante execução
- [ ] Salvei o log gerado

#### ✅ Validação Pós-Consolidação
- [ ] Executei `valide a consolidação de [NOME]`
- [ ] Todas as validações passaram
- [ ] Testei manualmente algumas receitas
- [ ] Verifiquei custos e cálculos
- [ ] Não identifiquei problemas

#### ✅ Documentação
- [ ] Registrei no log de auditoria
- [ ] Salvei backups específicos
- [ ] Documentei qualquer problema encontrado
- [ ] Atualizei status do grupo

---

## Checklist Específico por Nível de Risco

### 🔴 GRUPOS CRÍTICOS (Cebola, Azeite Extra Virgem)

#### Pré-Consolidação
- [ ] Backup completo feito nas últimas 24h
- [ ] Testado em ambiente de staging/desenvolvimento
- [ ] Equipe técnica notificada
- [ ] Plano de rollback documentado e testado
- [ ] Janela de manutenção agendada
- [ ] Sistema de monitoramento ativo

#### Durante
- [ ] Executando em horário de manutenção
- [ ] Monitorando métricas em tempo real
- [ ] Log detalhado sendo salvo
- [ ] Alguém de backup disponível

#### Pós-Consolidação
- [ ] Validação extensiva (pelo menos 20 receitas)
- [ ] Testes de custos e cálculos
- [ ] Testes de interface do usuário
- [ ] Monitoramento por 24-48h
- [ ] Backups mantidos por pelo menos 1 semana

### 🟠 GRUPOS DE ALTA PRIORIDADE (Sal, Páprica)

#### Pré-Consolidação
- [ ] Backup feito antes da consolidação
- [ ] Revisei todas as receitas afetadas
- [ ] Plano de rollback pronto

#### Pós-Consolidação
- [ ] Validação de pelo menos 10 receitas
- [ ] Testes de cálculos básicos
- [ ] Backups mantidos por 3-5 dias

### 🟡 GRUPOS DE MÉDIA PRIORIDADE

#### Pré-Consolidação
- [ ] Backup recente disponível
- [ ] Revisei principais receitas

#### Pós-Consolidação
- [ ] Validação de pelo menos 5 receitas
- [ ] Backups mantidos por 2-3 dias

### 🟢 GRUPOS DE BAIXA PRIORIDADE

#### Pré-Consolidação
- [ ] Backup geral disponível
- [ ] Entendi o que será feito

#### Pós-Consolidação
- [ ] Validação básica executada
- [ ] Backups mantidos por 1-2 dias

### ⚪ GRUPOS SEM USO (Apenas Remoções)

#### Pré-Consolidação
- [ ] Confirmei que 0 receitas usam os IDs
- [ ] Backup geral disponível

#### Pós-Consolidação
- [ ] Confirmei que IDs foram removidos
- [ ] Nenhuma receita foi afetada

---

## Casos Especiais - Atenção Redobrada

### ⚠️ Couve-flor
- [ ] Verifiquei manualmente o ID `684bfe28943203651ae5a925`
- [ ] Confirmei que é realmente couve-flor
- [ ] Revisei as 8 receitas que serão migradas
- [ ] Testei uma receita antes da migração completa

### ⚠️ Quinoa
- [ ] Entendi que `ewrfewfwefewf` é um ID inválido
- [ ] Confirmei remoção direta sem preocupações

### ⚠️ Pão francês
- [ ] Verifiquei que os IDs estão corretos
- [ ] IDs podem estar concatenados - revisei

---

## Após Completar TODAS as Consolidações

### ✅ Validação Final
- [ ] Executei `mostre o status geral das consolidações`
- [ ] Todos os 25 grupos foram processados
- [ ] Nenhum grupo pendente
- [ ] Nenhum erro não resolvido

### ✅ Testes Finais
- [ ] Testei receitas de diferentes categorias
- [ ] Verifiquei cálculos de custos
- [ ] Verifiquei cálculos de pesos
- [ ] Interface do usuário funciona normalmente
- [ ] Busca de ingredientes funciona
- [ ] Criação/edição de receitas funciona

### ✅ Limpeza
- [ ] Logs organizados e arquivados
- [ ] Backups rotulados corretamente
- [ ] Cache atualizado se necessário
- [ ] Arquivos temporários limpos (se não mais necessários)

### ✅ Documentação Final
- [ ] Resumo executivo criado
- [ ] Problemas encontrados documentados
- [ ] Soluções aplicadas documentadas
- [ ] Lições aprendidas registradas
- [ ] Próximos passos identificados

### ✅ Comunicação
- [ ] Equipe notificada da conclusão
- [ ] Usuários podem retomar uso normal (se aplicável)
- [ ] Documentação compartilhada
- [ ] Sucesso celebrado! 🎉

---

## Plano de Emergência

### Se algo der errado:

#### 1. PARE IMEDIATAMENTE
- [ ] Não continue com próximas consolidações
- [ ] Documente exatamente o que aconteceu
- [ ] Salve todos os logs e mensagens de erro

#### 2. AVALIE O DANO
- [ ] Quantas receitas foram afetadas?
- [ ] Qual foi o erro específico?
- [ ] É recuperável ou precisa de rollback?

#### 3. DECIDA A AÇÃO
- [ ] Tentar corrigir pontualmente?
- [ ] Fazer rollback parcial?
- [ ] Fazer rollback completo?

#### 4. EXECUTE A RECUPERAÇÃO
- [ ] Use os backups salvos
- [ ] Siga o plano de rollback
- [ ] Valide após recuperação

#### 5. INVESTIGUE
- [ ] Por que ocorreu o problema?
- [ ] Como prevenir no futuro?
- [ ] Precisa ajustar o processo?

---

## Sinais de Que Algo Está Errado

### 🚨 PARE SE:
- API retorna erros consecutivos
- Receitas ficam com dados corrompidos
- Cálculos ficam incorretos
- Tempo de execução muito maior que estimado
- Perda de dados detectada
- Integridade do banco comprometida

### ⚠️ ATENÇÃO SE:
- Algumas poucas falhas isoladas
- Validações mostram inconsistências menores
- Tempo levemente acima do estimado
- Warnings não críticos aparecem

### ✅ TUDO CERTO SE:
- Todas as operações completam com sucesso
- Validações passam 100%
- Receitas testadas funcionam normalmente
- Nenhum erro nos logs
- Tempo dentro do estimado

---

## Contatos de Emergência

Em caso de problemas críticos:
- [ ] Tenho backup para restaurar
- [ ] Sei como restaurar o backup
- [ ] Tenho acesso ao suporte técnico (se aplicável)
- [ ] Documentei tudo para análise posterior

---

## Assinaturas (Recomendado para Grupos Críticos)

**Antes da Consolidação:**
- Responsável: ________________
- Data/Hora: __________________
- Backup confirmado: ☐

**Após a Consolidação:**
- Responsável: ________________
- Data/Hora: __________________
- Validação OK: ☐

---

**LEMBRE-SE**: É melhor ser excessivamente cauteloso do que ter que explicar por que o banco de dados está corrompido!

**MANTRA**: Analise → Simule → Confirme → Execute → Valide → Documente
