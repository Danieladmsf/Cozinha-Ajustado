# 📋 Extrator de Nota Fiscal

Skill inteligente para importação automática de ingredientes a partir de notas fiscais (NF-e/DANFE).

## 🎯 O que faz?

- Lê PDFs de notas fiscais
- Extrai automaticamente produtos, preços e fornecedor
- Interpreta embalagens (ex: 6X5KG = 30kg)
- Calcula preço por kg/litro automaticamente
- Identifica marcas e categorias
- Verifica duplicatas
- Cria ingredientes no sistema

## 🚀 Como usar?

```
Você: "Extraia os dados desta nota: /caminho/para/nota.pdf"
```

ou simplesmente:

```
Você: "Importe os ingredientes da nota bisbo.pdf"
```

## ✨ Funcionalidades

### 1. Parsing Inteligente de Embalagens
Entende automaticamente padrões como:
- `6X5KG` → 6 embalagens de 5kg = 30kg total
- `10X500G` → 10 unidades de 500g = 5kg total
- `12X1KG` → 12 pacotes de 1kg = 12kg total
- `6/1,7KG` → 6 latas de 1,7kg = 10,2kg total

### 2. Cálculo Automático de Preços
- NF diz: R$ 14,99 por "UN" (6X5KG)
- Sistema calcula: R$ 3,00/kg (total R$ 89,94 ÷ 30kg)

### 3. Extração de Marcas
Identifica mais de 30 marcas conhecidas:
- S Isabel, Picinin, Nita, Apti, Kinino, Quero
- Tirolez, Italac, Piracanjuba, Sadia, Seara
- E muitas outras...

### 4. Categorização Automática
Mapeia códigos NCM para categorias:
- `1701*` → Açúcar e Adoçantes
- `0713*` → Grãos e Leguminosas
- `2102*` → Fermentos e Leveduras
- E mais 50+ categorias

### 5. Gestão de Duplicatas
- Detecta ingredientes já cadastrados
- Pula automaticamente duplicatas
- Opcionalmente atualiza preços

### 6. Vinculação Automática
- Busca fornecedor no banco por CNPJ ou nome
- Busca marcas cadastradas
- Cria novos quando necessário

## 📊 Exemplo de Extração

**Entrada (da NF):**
```
CODIGO: 2152
DESCRIÇÃO: ACUCAR CRISTAL S ISABEL 6X5KG
QUANTIDADE: 6 UN
VALOR UNIT: R$ 14,99
VALOR TOTAL: R$ 89,94
```

**Saída (ingrediente criado):**
```json
{
  "name": "Acucar Cristal",
  "commercial_name": "ACUCAR CRISTAL S ISABEL 6X5KG",
  "brand": "S Isabel",
  "category": "Açúcar e Adoçantes",
  "unit": "kg",
  "current_price": 3.00,
  "current_stock": 30,
  "main_supplier": "BISPO DISTRIBUIDORA",
  "supplier_code": "2152"
}
```

## 🔄 Fluxo de Trabalho

```
1. 📄 Leitura do PDF
   └─> Extrai NF-e, data, fornecedor, produtos

2. 🔍 Parsing Inteligente
   └─> Interpreta embalagens, marcas, categorias

3. 🗃️ Busca no Banco
   └─> Verifica fornecedores, marcas, duplicatas

4. 👀 Revisão Interativa
   └─> Mostra resumo e aguarda confirmação

5. 💾 Criação no Firestore
   └─> Cria ingredientes, fornecedores, marcas

6. 📊 Relatório Final
   └─> Mostra o que foi criado, pulado, erros
```

## 📝 Exemplos de Uso

### Importação Rápida
```
Você: "Extraia /home/user/studio/bisbo.pdf"

Claude:
📋 Encontrei 6 produtos na NF-e 004.916.517
   1. Açúcar Cristal - R$ 3,00/kg
   2. Feijão Preto - R$ 4,76/unidade
   3. Fermento Nita - R$ 14,15/kg
   ...

❓ Deseja importar todos?
✅ Sim / 📝 Revisar um a um / ❌ Cancelar
```

### Revisão Detalhada
```
Você: "Quero revisar cada ingrediente antes"

Claude:
📦 Produto 1 de 6: Açúcar Cristal
   Nome: Açúcar Cristal
   Marca: S Isabel
   Preço: R$ 3,00/kg
   Estoque: 30kg

✏️ Deseja editar algo? [Não/Sim]
```

### Apenas Atualizar Preços
```
Você: "Atualize apenas os preços da nota"

Claude:
🔄 Comparando preços:
   ✅ Açúcar Cristal: R$ 2,80 → R$ 3,00 (+7%)
   ✅ Feijão Preto: R$ 4,50 → R$ 4,76 (+6%)
   ⚠️ Fermento Nita: Não cadastrado

❓ Atualizar preços?
```

## ⚙️ Configurações Avançadas

### Marcas Personalizadas
Adicione suas marcas à lista `marcasConhecidas` no SKILL.md

### Categorias NCM
Personalize o mapeamento `categoriasNCM` para suas necessidades

### Validações
Ajuste as regras de validação na Fase 7 do SKILL.md

## 🐛 Solução de Problemas

### PDF não está sendo lido
- Verifique se o caminho está correto
- Certifique-se que é um DANFE padrão
- PDFs escaneados podem não funcionar

### Marcas não são detectadas
- Adicione a marca manualmente à lista
- Use o modo "Revisar um a um" para editar

### Preços incorretos
- Verifique se a embalagem foi interpretada corretamente
- Revise o cálculo nos metadados `_metadata.preco_original`

### Duplicatas não detectadas
- Verifique se o nome comercial é exatamente igual
- Compare o código do fornecedor

## 📚 Estrutura de Dados

### Campos Criados no Ingrediente
```javascript
{
  name: "Nome limpo",              // Sem marca/embalagem
  commercial_name: "Nome da NF",   // Original completo
  unit: "kg/l/unidade",            // Normalizado
  current_price: 0.00,             // Por unidade
  base_price: 0.00,                // Mesmo do current
  last_update: "YYYY-MM-DD",       // Data da NF
  active: true,                    // Sempre ativo
  main_supplier: "Fornecedor",     // Da NF
  supplier_id: "xxx",              // Vinculado
  supplier_code: "123",            // Código na NF
  brand: "Marca",                  // Extraída
  brand_id: "yyy",                 // Vinculada
  category: "Categoria",           // Por NCM
  current_stock: 0.0,              // Total calculado
  min_stock: 0,                    // Padrão
  notes: "NF-e xxx...",            // Rastreabilidade
  ingredient_type: "both",         // Padrão
  taco_variations: []              // Vazio
}
```

### Metadados (não salvos, apenas referência)
```javascript
{
  _metadata: {
    nf_numero: "004.916.517",
    nf_data: "31/10/2025",
    codigo_fornecedor: "2152",
    ncm: "17019900",
    embalagem: {
      quantidadeEmbalagens: 6,
      tamanhoEmbalagem: 5,
      unidadeEmbalagem: "KG",
      pesoTotal: 30,
      unidadeFinal: "kg"
    },
    preco_original: {
      valor: 14.99,
      unidade: "UN",
      quantidade: 6,
      total: 89.94
    }
  }
}
```

## 🔐 Segurança

- ✅ Valida todos os campos antes de criar
- ✅ Nunca sobrescreve ingredientes existentes
- ✅ Sempre mostra resumo antes de confirmar
- ✅ Mantém rastreabilidade completa (NF-e nas notas)
- ✅ Não executa ações sem confirmação do usuário

## 📈 Estatísticas

Após cada importação:
- ✅ Total de ingredientes criados
- ⏭️ Total de duplicatas puladas
- ❌ Total de erros
- 🏢 Fornecedores criados/vinculados
- 🏷️ Marcas criadas/vinculadas
- 💰 Valor total importado

## 🎓 Aprendizado

A skill aprende com o uso:
- Novas marcas detectadas são sugeridas para adição
- Padrões de embalagem incomuns são reportados
- Categorias NCM desconhecidas são sinalizadas

## 🆘 Suporte

Se encontrar problemas:
1. Revise o SKILL.md para detalhes técnicos
2. Verifique os logs de extração
3. Use o modo "Revisar um a um" para debug
4. Reporte bugs com exemplo de NF-e

## 📜 Licença

Skill criada para o sistema **Cozinha Afeto**.
Uso interno e customização permitidos.

---

**Versão:** 1.0.0
**Última atualização:** 2025-01-10
**Autor:** Sistema Cozinha Afeto
