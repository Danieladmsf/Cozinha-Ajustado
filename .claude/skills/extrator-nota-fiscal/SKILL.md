# Skill: Extrator de Nota Fiscal

## Descrição
Extrai dados de notas fiscais (NF-e) em PDF e converte automaticamente em ingredientes prontos para cadastro no sistema Cozinha Afeto.

## Capacidades
- ✅ Leitura de PDFs de notas fiscais (DANFE)
- ✅ Extração automática de produtos e fornecedor
- ✅ Parsing inteligente de embalagens (6X5KG, 10X500G, etc)
- ✅ Cálculo automático de preço por kg/litro
- ✅ Extração de marcas da descrição
- ✅ Categorização por NCM
- ✅ Busca de fornecedores e marcas no banco
- ✅ Detecção de ingredientes duplicados
- ✅ Revisão interativa antes de importar
- ✅ Criação em lote no Firestore

## Quando usar
- Quando o usuário pedir para "extrair nota fiscal"
- Quando fornecer um arquivo PDF de NF-e
- Quando pedir para "importar ingredientes da nota"
- Quando mencionar "processar NF"

---

# INSTRUÇÕES DE EXECUÇÃO

## Fase 1: Leitura e Extração da NF

### Passo 1.1: Ler o PDF fornecido
```javascript
// Usar a ferramenta Read para ler o PDF
const pdfPath = "/caminho/fornecido/pelo/usuario.pdf";
const pdfContent = await Read(pdfPath);
```

### Passo 1.2: Extrair dados do PDF
Procurar no conteúdo do PDF:
- **Número da NF-e:** Buscar "Nº. XXX.XXX.XXX"
- **Data de Emissão:** Buscar "DATA DE EMISSÃO"
- **Fornecedor:** Seção "IDENTIFICAÇÃO DO EMITENTE"
  - Razão Social
  - CNPJ
  - Inscrição Estadual
  - Endereço
- **Produtos:** Tabela "DADOS DOS PRODUTOS / SERVIÇOS"
  - CÓDIGO PRODUTO
  - DESCRIÇÃO DO PRODUTO / SERVIÇO
  - NCM/SH
  - QUANT
  - VALOR UNIT
  - VALOR TOTAL
  - UN (Unidade)

### Passo 1.3: Estruturar dados extraídos
```javascript
const notaFiscal = {
  numero: "XXX.XXX.XXX",
  serie: "001",
  dataEmissao: "DD/MM/YYYY",
  fornecedor: {
    razaoSocial: "...",
    cnpj: "XX.XXX.XXX/XXXX-XX",
    inscricaoEstadual: "...",
    endereco: "...",
    cidade: "...",
    uf: "SP"
  },
  produtos: [
    {
      codigo: "...",
      descricao: "...",
      ncm: "...",
      quantidade: 0.0,
      unidade: "UN",
      valorUnitario: 0.0,
      valorTotal: 0.0,
      pedido: "..." // Extrair de "Ped: XXXXX" se existir
    }
  ]
};
```

---

## Fase 2: Parsing Inteligente dos Produtos

### Passo 2.1: Função de Parsing de Embalagem

```javascript
function parseEmbalagem(descricao) {
  // Padrões suportados:
  // - 6X5KG → 6 embalagens de 5kg = 30kg total
  // - 10X500G → 10 embalagens de 500g = 5kg total
  // - 6/1,7KG → 6 latas de 1,7kg = 10.2kg total
  // - 12X1KG → 12 unidades de 1kg = 12kg total

  const patterns = [
    /(\d+)\s*[X\/]\s*(\d+[.,]?\d*)\s*(KG|G|L|ML)/gi
  ];

  for (const pattern of patterns) {
    const match = descricao.match(pattern);
    if (match) {
      const text = match[0];
      const [qtdStr, tamanhoStr] = text.split(/[X\/]/);
      const unidade = text.match(/(KG|G|L|ML)/i)[0].toUpperCase();

      const quantidade = parseInt(qtdStr);
      const tamanhoNum = parseFloat(tamanhoStr.replace(',', '.'));

      // Calcular total
      let pesoTotal = quantidade * tamanhoNum;
      let unidadeFinal = unidade;

      // Converter G → KG se >= 1000g
      if (unidade === 'G' && pesoTotal >= 1000) {
        pesoTotal = pesoTotal / 1000;
        unidadeFinal = 'KG';
      }

      // Converter ML → L se >= 1000ml
      if (unidade === 'ML' && pesoTotal >= 1000) {
        pesoTotal = pesoTotal / 1000;
        unidadeFinal = 'L';
      }

      return {
        quantidadeEmbalagens: quantidade,
        tamanhoEmbalagem: tamanhoNum,
        unidadeEmbalagem: unidade,
        pesoTotal: pesoTotal,
        unidadeFinal: unidadeFinal.toLowerCase()
      };
    }
  }

  return null;
}
```

### Passo 2.2: Função de Extração de Marca

```javascript
function extrairMarca(descricao) {
  // Lista de marcas conhecidas (expandível)
  const marcasConhecidas = [
    'S ISABEL', 'SANTA ISABEL', 'PICININ', 'NITA', 'APTI',
    'KININO', 'QUERO', 'TIROLEZ', 'ITALAC', 'PIRACANJUBA',
    'SADIA', 'SEARA', 'PERDIGAO', 'AURORA', 'BRF',
    'VIGOR', 'NESTLE', 'YOKI', 'FUGINI', 'SALUTE',
    'PREDILECTA', 'KISABOR', 'QUALITA', 'CAMIL'
  ];

  const descUpper = descricao.toUpperCase();

  for (const marca of marcasConhecidas) {
    if (descUpper.includes(marca)) {
      // Capitalizar corretamente
      return marca.split(' ')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return null;
}
```

### Passo 2.3: Função de Geração de Nome Principal

```javascript
function gerarNomePrincipal(descricao) {
  let nome = descricao;

  // 1. Remover embalagens (6X5KG, etc)
  nome = nome.replace(/\d+\s*[X\/]\s*\d+[.,]?\d*\s*(KG|G|L|ML)/gi, '');

  // 2. Remover marca
  const marca = extrairMarca(descricao);
  if (marca) {
    nome = nome.replace(new RegExp(marca, 'gi'), '');
  }

  // 3. Remover palavras comuns de tipo/qualidade
  nome = nome.replace(/\bTIPO\s+\d+\b/gi, '');
  nome = nome.replace(/\b(SECO|INST|INSTANTANEO|LT|LATA)\b/gi, '');

  // 4. Limpar espaços extras
  nome = nome.trim().replace(/\s+/g, ' ');

  // 5. Capitalizar
  nome = nome.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return nome;
}
```

### Passo 2.4: Função de Mapeamento de Categoria por NCM

```javascript
function mapearCategoria(ncm, nomeProduto) {
  const categoriasNCM = {
    '0201': 'Carnes Bovinas',
    '0202': 'Carnes Bovinas',
    '0203': 'Carnes Suínas',
    '0207': 'Carnes de Aves',
    '0401': 'Leite e Derivados',
    '0402': 'Leite e Derivados',
    '0403': 'Leite e Derivados',
    '0404': 'Leite e Derivados',
    '0406': 'Queijos',
    '0407': 'Ovos',
    '0701': 'Vegetais e Legumes',
    '0702': 'Vegetais e Legumes',
    '0703': 'Vegetais e Legumes',
    '0704': 'Vegetais e Legumes',
    '0705': 'Vegetais e Legumes',
    '0706': 'Vegetais e Legumes',
    '0707': 'Vegetais e Legumes',
    '0708': 'Vegetais e Legumes',
    '0709': 'Vegetais e Legumes',
    '0713': 'Grãos e Leguminosas',
    '0714': 'Tubérculos',
    '0801': 'Frutas',
    '0802': 'Frutas',
    '0803': 'Frutas',
    '0804': 'Frutas',
    '0805': 'Frutas',
    '0806': 'Frutas',
    '0807': 'Frutas',
    '0808': 'Frutas',
    '0809': 'Frutas',
    '0810': 'Frutas',
    '0901': 'Temperos e Especiarias',
    '0902': 'Temperos e Especiarias',
    '0904': 'Temperos e Especiarias',
    '0905': 'Temperos e Especiarias',
    '0906': 'Temperos e Especiarias',
    '0907': 'Temperos e Especiarias',
    '0908': 'Temperos e Especiarias',
    '0909': 'Temperos e Especiarias',
    '0910': 'Temperos e Especiarias',
    '1001': 'Cereais',
    '1005': 'Cereais',
    '1006': 'Cereais',
    '1101': 'Farinhas e Derivados',
    '1102': 'Farinhas e Derivados',
    '1103': 'Farinhas e Derivados',
    '1104': 'Farinhas e Derivados',
    '1105': 'Farinhas e Derivados',
    '1106': 'Farinhas e Derivados',
    '1107': 'Farinhas e Derivados',
    '1108': 'Farinhas e Derivados',
    '1109': 'Farinhas e Derivados',
    '1507': 'Óleos e Gorduras',
    '1508': 'Óleos e Gorduras',
    '1509': 'Óleos e Gorduras',
    '1510': 'Óleos e Gorduras',
    '1511': 'Óleos e Gorduras',
    '1512': 'Óleos e Gorduras',
    '1513': 'Óleos e Gorduras',
    '1514': 'Óleos e Gorduras',
    '1515': 'Óleos e Gorduras',
    '1516': 'Óleos e Gorduras',
    '1517': 'Óleos e Gorduras',
    '1701': 'Açúcar e Adoçantes',
    '1702': 'Açúcar e Adoçantes',
    '1703': 'Açúcar e Adoçantes',
    '1704': 'Doces e Confeitos',
    '1806': 'Chocolates',
    '1901': 'Massas e Biscoitos',
    '1902': 'Massas e Biscoitos',
    '1905': 'Massas e Biscoitos',
    '2001': 'Conservas',
    '2002': 'Conservas',
    '2003': 'Conservas',
    '2004': 'Conservas',
    '2005': 'Conservas e Enlatados',
    '2006': 'Conservas',
    '2007': 'Conservas',
    '2008': 'Conservas',
    '2009': 'Sucos',
    '2101': 'Condimentos',
    '2102': 'Fermentos e Leveduras',
    '2103': 'Molhos e Condimentos',
    '2104': 'Caldos e Sopas',
    '2105': 'Sorvetes',
    '2106': 'Produtos Alimentícios',
    '2201': 'Bebidas',
    '2202': 'Bebidas',
    '2203': 'Bebidas',
    '2204': 'Bebidas',
    '2205': 'Bebidas',
    '2206': 'Bebidas',
    '2207': 'Bebidas',
    '2208': 'Bebidas',
    '2209': 'Vinagres'
  };

  const prefixo = ncm.substring(0, 4);
  return categoriasNCM[prefixo] || 'Outros';
}
```

### Passo 2.5: Converter Unidade para o Sistema

```javascript
function converterUnidade(unidadeNF) {
  const mapa = {
    'UN': 'unidade',
    'PC': 'unidade',
    'PT': 'unidade',
    'PO': 'unidade',
    'LA': 'unidade',
    'CX': 'unidade',
    'FD': 'unidade',
    'KG': 'kg',
    'G': 'g',
    'L': 'l',
    'ML': 'ml'
  };

  return mapa[unidadeNF?.toUpperCase()] || 'unidade';
}
```

---

## Fase 3: Processar Cada Produto

### Passo 3.1: Processar produto individual

```javascript
function processarProduto(produto, fornecedor, dataEmissao, numeroNF) {
  const embalagem = parseEmbalagem(produto.descricao);
  const marca = extrairMarca(produto.descricao);
  const nomePrincipal = gerarNomePrincipal(produto.descricao);
  const categoria = mapearCategoria(produto.ncm, nomePrincipal);

  // Calcular preço por unidade base
  let precoUnitario = produto.valorUnitario;
  let unidadeCompra = converterUnidade(produto.unidade);
  let quantidadeEstoque = produto.quantidade;

  if (embalagem) {
    // Se identificou embalagem, calcular preço por kg/l
    precoUnitario = produto.valorTotal / embalagem.pesoTotal;
    unidadeCompra = embalagem.unidadeFinal;
    quantidadeEstoque = embalagem.pesoTotal;
  }

  return {
    // Campos obrigatórios
    name: nomePrincipal,
    commercial_name: produto.descricao,
    unit: unidadeCompra,
    current_price: parseFloat(precoUnitario.toFixed(2)),
    base_price: parseFloat(precoUnitario.toFixed(2)),
    last_update: dataEmissao.split('/').reverse().join('-'), // DD/MM/YYYY → YYYY-MM-DD
    active: true,

    // Fornecedor
    main_supplier: fornecedor.razaoSocial,
    supplier_id: '', // Será preenchido após buscar no banco
    supplier_code: produto.codigo,

    // Marca
    brand: marca || '',
    brand_id: '', // Será preenchido após buscar no banco

    // Categoria
    category: categoria,

    // Estoque
    current_stock: quantidadeEstoque,
    min_stock: 0,

    // Notas
    notes: `NF-e ${numeroNF}${produto.pedido ? ' - Ped: ' + produto.pedido : ''} - ${produto.descricao}`,

    // Tipo
    ingredient_type: 'both',

    // Variações TACO (vazio inicialmente)
    taco_variations: [],

    // Metadados da extração (para referência)
    _metadata: {
      nf_numero: numeroNF,
      nf_data: dataEmissao,
      codigo_fornecedor: produto.codigo,
      ncm: produto.ncm,
      embalagem: embalagem,
      preco_original: {
        valor: produto.valorUnitario,
        unidade: produto.unidade,
        quantidade: produto.quantidade,
        total: produto.valorTotal
      }
    }
  };
}
```

---

## Fase 4: Buscar Fornecedores e Marcas no Banco

### Passo 4.1: Buscar fornecedor existente

```javascript
async function buscarFornecedor(razaoSocial, cnpj) {
  // Buscar fornecedor no banco por CNPJ (mais confiável)
  const fornecedores = await Supplier.list();

  // Primeiro por CNPJ
  let fornecedor = fornecedores.find(f =>
    f.document === cnpj ||
    f.cnpj === cnpj ||
    f.document?.replace(/\D/g, '') === cnpj.replace(/\D/g, '')
  );

  // Se não encontrar, buscar por nome similar
  if (!fornecedor) {
    const razaoNorm = razaoSocial.toUpperCase().trim();
    fornecedor = fornecedores.find(f => {
      const nome = (f.company_name || f.name || '').toUpperCase().trim();
      return nome.includes(razaoNorm.substring(0, 20)) ||
             razaoNorm.includes(nome.substring(0, 20));
    });
  }

  return fornecedor || null;
}
```

### Passo 4.2: Buscar marca existente

```javascript
async function buscarMarca(nomeMarca) {
  if (!nomeMarca) return null;

  const marcas = await Brand.list();
  const marcaNorm = nomeMarca.toUpperCase().trim();

  const marca = marcas.find(m =>
    (m.name || '').toUpperCase().trim() === marcaNorm
  );

  return marca || null;
}
```

### Passo 4.3: Verificar ingrediente duplicado

```javascript
async function verificarDuplicado(ingrediente) {
  const ingredientes = await Ingredient.list();

  // Buscar por nome comercial exato
  let duplicado = ingredientes.find(ing =>
    ing.commercial_name === ingrediente.commercial_name &&
    ing.main_supplier === ingrediente.main_supplier
  );

  if (duplicado) return duplicado;

  // Buscar por código do fornecedor
  if (ingrediente.supplier_code) {
    duplicado = ingredientes.find(ing =>
      ing.supplier_code === ingrediente.supplier_code &&
      ing.main_supplier === ingrediente.main_supplier
    );
  }

  return duplicado || null;
}
```

---

## Fase 5: Revisão Interativa

### Passo 5.1: Mostrar resumo da extração

Após processar todos os produtos, mostrar ao usuário:

```
=============================================================================
📋 RESUMO DA EXTRAÇÃO
=============================================================================
NF-e: XXX.XXX.XXX
Data: DD/MM/YYYY
Fornecedor: [RAZÃO SOCIAL]
CNPJ: XX.XXX.XXX/XXXX-XX

Total de produtos: N
Valor total: R$ XXX,XX

PRODUTOS EXTRAÍDOS:
-----------------------------------------------------------------------------
1. [Nome Principal]
   Nome Comercial: [Descrição completa]
   Marca: [Marca] (✅ Encontrada no banco / ⚠️ Nova)
   Categoria: [Categoria]
   Unidade: [kg/l/unidade]
   Preço: R$ XX,XX / [unidade]
   Estoque: XX [unidade]
   Status: ✅ Novo / ⚠️ DUPLICADO (ID: xxx) / ❌ Erro

[Repetir para cada produto]

FORNECEDOR:
✅ Encontrado no banco: [Nome] (ID: xxx)
   OU
⚠️ Não encontrado - será necessário criar

MARCAS:
✅ X marcas encontradas no banco
⚠️ Y marcas novas serão criadas
=============================================================================
```

### Passo 5.2: Perguntar ao usuário

Usar `AskUserQuestion` para confirmar:

```javascript
const resposta = await AskUserQuestion({
  questions: [{
    question: "Como deseja proceder com a importação?",
    header: "Importação",
    multiSelect: false,
    options: [
      {
        label: "Importar todos",
        description: "Criar todos os ingredientes extraídos (pula duplicados)"
      },
      {
        label: "Revisar um a um",
        description: "Permitir edição antes de salvar cada ingrediente"
      },
      {
        label: "Cancelar",
        description: "Não importar nada"
      }
    ]
  }]
});
```

---

## Fase 6: Criação no Banco de Dados

### Passo 6.1: Criar fornecedor (se necessário)

```javascript
async function criarFornecedor(dadosFornecedor) {
  const novoFornecedor = {
    name: dadosFornecedor.razaoSocial,
    company_name: dadosFornecedor.razaoSocial,
    document: dadosFornecedor.cnpj,
    cnpj: dadosFornecedor.cnpj,
    state_registration: dadosFornecedor.inscricaoEstadual,
    address: dadosFornecedor.endereco,
    city: dadosFornecedor.cidade,
    state: dadosFornecedor.uf,
    active: true,
    supplier_type: 'ingredient',
    notes: `Criado automaticamente na importação de NF-e`
  };

  const resultado = await Supplier.create(novoFornecedor);
  return resultado.id;
}
```

### Passo 6.2: Criar marca (se necessário)

```javascript
async function criarMarca(nomeMarca) {
  if (!nomeMarca) return null;

  const novaMarca = {
    name: nomeMarca,
    active: true,
    notes: `Criada automaticamente na importação de NF-e`
  };

  const resultado = await Brand.create(novaMarca);
  return resultado.id;
}
```

### Passo 6.3: Criar ingrediente

```javascript
async function criarIngrediente(ingredienteData) {
  // Remover metadados antes de salvar
  const { _metadata, ...dadosLimpos } = ingredienteData;

  try {
    const resultado = await Ingredient.create(dadosLimpos);
    return {
      sucesso: true,
      id: resultado.id,
      mensagem: `✅ Ingrediente "${dadosLimpos.name}" criado com sucesso`
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: `❌ Erro ao criar "${dadosLimpos.name}": ${error.message}`
    };
  }
}
```

### Passo 6.4: Processar importação em lote

```javascript
async function processarImportacao(ingredientes, modo) {
  const resultados = {
    criados: [],
    pulados: [],
    erros: []
  };

  for (const ing of ingredientes) {
    // Verificar duplicado
    const duplicado = await verificarDuplicado(ing);
    if (duplicado) {
      resultados.pulados.push({
        nome: ing.name,
        motivo: `Já existe: ${duplicado.name} (ID: ${duplicado.id})`
      });
      continue;
    }

    // Buscar e vincular fornecedor
    let fornecedor = await buscarFornecedor(ing.main_supplier, ing._metadata?.cnpj);
    if (!fornecedor) {
      // Criar novo fornecedor
      const fornecedorId = await criarFornecedor({
        razaoSocial: ing.main_supplier,
        cnpj: ing._metadata?.cnpj || ''
      });
      ing.supplier_id = fornecedorId;
    } else {
      ing.supplier_id = fornecedor.id;
    }

    // Buscar e vincular marca
    if (ing.brand) {
      let marca = await buscarMarca(ing.brand);
      if (!marca) {
        const marcaId = await criarMarca(ing.brand);
        ing.brand_id = marcaId;
      } else {
        ing.brand_id = marca.id;
      }
    }

    // Criar ingrediente
    const resultado = await criarIngrediente(ing);

    if (resultado.sucesso) {
      resultados.criados.push({
        nome: ing.name,
        id: resultado.id
      });
    } else {
      resultados.erros.push({
        nome: ing.name,
        erro: resultado.mensagem
      });
    }
  }

  return resultados;
}
```

---

## Fase 7: Relatório Final

### Passo 7.1: Mostrar resultados

Após a importação, mostrar:

```
=============================================================================
✅ IMPORTAÇÃO CONCLUÍDA
=============================================================================

📦 INGREDIENTES CRIADOS: X
[Lista dos ingredientes criados com IDs]

⏭️ INGREDIENTES PULADOS: Y
[Lista dos duplicados pulados]

❌ ERROS: Z
[Lista de erros, se houver]

🏢 FORNECEDOR:
[Status do fornecedor - criado/vinculado]

🏷️ MARCAS:
[Marcas criadas/vinculadas]

=============================================================================
💡 PRÓXIMOS PASSOS:
- Acesse /ingredientes para visualizar os ingredientes importados
- Verifique preços e ajuste se necessário
- Vincule alimentos TACO para cálculo nutricional
=============================================================================
```

---

## Tratamento de Erros

### Erros Comuns e Soluções

1. **PDF não encontrado**
   - Verificar se o caminho está correto
   - Pedir ao usuário para fornecer novamente

2. **PDF sem dados estruturados**
   - Avisar que o formato não é compatível
   - Sugerir extração manual

3. **Fornecedor não encontrado e sem CNPJ**
   - Perguntar ao usuário se deseja criar manualmente
   - Oferecer opção de buscar por nome aproximado

4. **Erro ao criar ingrediente**
   - Mostrar erro específico
   - Continuar com próximos ingredientes
   - Gerar relatório de erros ao final

5. **Ingredientes duplicados**
   - Sempre pular duplicados
   - Informar ao usuário quais foram pulados
   - Oferecer opção de atualizar preços dos existentes

---

## Validações Importantes

### Antes de criar ingrediente:
- ✅ Nome não pode estar vazio
- ✅ Preço deve ser > 0
- ✅ Unidade deve ser válida
- ✅ Data deve estar em formato correto

### Durante a extração:
- ✅ Validar se NF tem produtos
- ✅ Validar se todos os campos essenciais existem
- ✅ Tratar valores nulos ou inválidos

### Após criação:
- ✅ Verificar se ID foi retornado
- ✅ Confirmar que ingrediente está acessível
- ✅ Validar relacionamentos (fornecedor, marca)

---

## Exemplos de Uso

### Exemplo 1: Importação simples
```
Usuário: "Extraia os dados desta nota: /path/bisbo.pdf"

Claude:
1. Lê o PDF
2. Extrai 6 produtos
3. Identifica fornecedor BISPO
4. Mostra resumo
5. Pergunta: "Importar todos?"
6. Cria ingredientes
7. Mostra relatório final
```

### Exemplo 2: Revisão detalhada
```
Usuário: "Quero revisar antes de importar"

Claude:
1. Extrai dados
2. Mostra produto por produto
3. Permite editar cada um
4. Confirma antes de salvar
5. Cria no banco
```

### Exemplo 3: Atualização de preços
```
Usuário: "Atualize os preços dos ingredientes desta nota"

Claude:
1. Extrai dados
2. Identifica duplicados
3. Compara preços atuais vs novos
4. Pergunta se deseja atualizar
5. Atualiza apenas preços (não cria novos)
```

---

## Fluxo Completo Resumido

```
1. Ler PDF → 2. Extrair dados → 3. Parse produtos → 4. Buscar no banco
    ↓             ↓                ↓                    ↓
   PDF       NF estruturada   Ingredientes      Fornecedor/Marcas
                                  ↓                    ↓
                            5. Mostrar resumo ← Validações
                                  ↓
                            6. Confirmar usuário
                                  ↓
                            7. Criar no banco
                                  ↓
                            8. Relatório final
```

---

## Melhorias Futuras

- [ ] Suporte para múltiplas NFs em lote
- [ ] OCR para PDFs escaneados
- [ ] Aprendizado de marcas novas
- [ ] Sugestão automática de TACO
- [ ] Histórico de importações
- [ ] Comparação de preços entre NFs
- [ ] Alerta de variação de preço

---

## IMPORTANTE: Início da Execução

Quando esta skill for ativada, SEMPRE:

1. ✅ Pedir o caminho do PDF se não foi fornecido
2. ✅ Ler o PDF completo
3. ✅ Extrair TODOS os dados estruturados
4. ✅ Processar TODOS os produtos
5. ✅ Mostrar resumo COMPLETO antes de criar
6. ✅ Confirmar com usuário
7. ✅ Executar importação
8. ✅ Mostrar relatório final

**Nunca** criar ingredientes sem mostrar o resumo e confirmar com o usuário primeiro!
