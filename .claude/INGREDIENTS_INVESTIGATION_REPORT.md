# Investigação: Problema de Ingredientes "Não Encontrado" ao Editar

## Resumo Executivo

Itens aparecem listados na página de ingredientes, mas ao tentar editar, a mensagem "Ingrediente não encontrado" é exibida. A investigação revelou **inconsistências potenciais entre a listagem e a busca/edição de ingredientes**.

---

## 1. ARQUIVOS PRINCIPAIS ENVOLVIDOS

### Componentes Frontend
- `/home/user/studio/components/ingredientes/Ingredients.jsx` - Página principal de listagem
- `/home/user/studio/components/ingredientes/IngredientEditor.jsx` - Página de edição
- `/home/user/studio/components/ingredientes/IngredientsTable.jsx` - Tabela de exibição

### Backend/API
- `/home/user/studio/app/api/ingredients/route.js` - Endpoint REST da API
- `/home/user/studio/app/api/entities.js` - Camada de abstração Firebase

### Utilidades
- `/home/user/studio/lib/ingredientUtils.js` - Funções de processamento

---

## 2. FLUXO DE LISTAGEM (Ingredients.jsx)

### 2.1 Carregamento de Ingredientes

```javascript
const loadIngredients = async () => {
  // Linha 95-104 (Ingredients.jsx)
  const allIngredients = await Promise.race([loadPromise, timeoutPromise]);
  
  // PASSO CRÍTICO 1: Filtrar ingredientes com ID válido
  const validIngredients = allIngredients.filter(ing => ing && ing.id);
  
  // PASSO CRÍTICO 2: Processar com campos displayName, displayPrice, etc
  const processedIngredients = (validIngredients || []).map(ingredient => ({
    ...ingredient,
    displayName: ingredient.name,
    displayPrice: ingredient.current_price,
    displaySupplier: ingredient.main_supplier || 'N/A',
    displayBrand: ingredient.brand || 'N/A'
  }));
  
  // PASSO CRÍTICO 3: Filtrar apenas ingredientes ATIVOS
  const activeIngredients = processedIngredients.filter(ing => ing.active !== false);
  
  setIngredients(activeIngredients);
};
```

**Obs:** A lista mostrada para o usuário contém apenas ingredientes **ATIVOS** (`ing.active !== false`).

### 2.2 Como o Clique em "Editar" Funciona

```javascript
// Linha 545 (Ingredients.jsx - no menu dropdown)
<DropdownMenuItem
  onClick={() => router.push(`/ingredientes/editor?id=${ingredient.id}`)}
>
  <Edit className="mr-2 h-4 w-4" />
  Editar
</DropdownMenuItem>
```

O ID é passado corretamente via URL query parameter.

---

## 3. FLUXO DE EDIÇÃO (IngredientEditor.jsx)

### 3.1 Carregamento do Ingrediente

```javascript
// Linhas 261-280 (IngredientEditor.jsx)
const loadIngredient = async (id) => {
  try {
    setLoading(true);
    setError(null);
    
    // PASSO CRÍTICO: Buscar ingrediente pelo ID
    const ingredient = await Ingredient.get(id);
    
    // VERIFICAÇÃO QUE GERA A MENSAGEM DE ERRO
    if (!ingredient) {
      setError("Ingrediente não encontrado. Redirecionando para criação de novo ingrediente.");
      router.push('/ingredientes/editor?id=new');
      resetFormForNewIngredient();
      return;
    }
    
    // ... restante do carregamento
  }
};
```

### 3.2 Inicialização (useEffect)

```javascript
// Linhas 420-437 (IngredientEditor.jsx)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const ingredientId = urlParams.get('id');
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSuppliers(),
        loadBrands(),
        loadTacoFoods(),
        loadCategories()
      ]);
      
      if (ingredientId && ingredientId !== 'new') {
        setIsEditing(true);
        await loadIngredient(ingredientId);  // CHAMA AQUI
      }
    }
  };
  
  loadInitialData();
}, [window.location.search]);
```

---

## 4. ENDPOINT DE API (ingredients/route.js)

### 4.1 Verificação no PUT (Atualizar)

```javascript
// Linhas 47-53 (ingredients/route.js)
export async function PUT(request) {
  // ...
  const existingIngredient = await Ingredient.getById(id);
  if (!existingIngredient) {
    console.error(`PUT ERROR: Ingrediente com ID ${id} não encontrado.`);
    return NextResponse.json(
      { error: 'Ingredient not found' },
      { status: 404 }
    );
  }
  // ...
}
```

### 4.2 Verificação no GET (Listar)

```javascript
// Linhas 8-32 (ingredients/route.js)
export async function GET(request) {
  let ingredients = await Ingredient.getAll();
  
  // Filtro apenas de BUSCA, sem filtro de STATUS
  if (active === 'true') {
    ingredients = ingredients.filter(ing => ing.active !== false);
  }
  
  return NextResponse.json(ingredients);
}
```

---

## 5. CAMADA FIREBASE (entities.js)

### 5.1 Implementação do getById

```javascript
// Linhas 37-67 (entities.js)
getById: async (id) => {
  const startTime = Date.now();
  
  try {
    // Caso especial apenas para Customer (temp-ids)
    if (collectionName === 'Customer' && id?.startsWith('temp-')) {
      return { /* mock data */ };
    }
    
    const docRef = doc(db, collectionName, id);
    
    // Add timeout wrapper
    const docSnapPromise = getDoc(docRef);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Firestore timeout')), 8000)
    );
    
    const docSnap = await Promise.race([docSnapPromise, timeoutPromise]);
    
    // RETORNA NULL se não existir
    const result = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    
    return result;
  } catch (error) {
    // Rethrow com timeout info
    throw new Error(...);
  }
}
```

---

## 6. POSSÍVEIS CAUSAS IDENTIFICADAS

### CAUSA 1: Filtro de Status na Listagem vs Busca

**Problema:**
```
LISTAGEM (Ingredients.jsx)
├─ Chamada: Ingredient.list()
├─ Resultado: TODOS os ingredientes (ativos + inativos)
├─ Filtro LOCAL: filter(ing => ing.active !== false)
└─ Estado setIngredients: Apenas ATIVOS

EDITOR (IngredientEditor.jsx)
├─ Chamada: Ingredient.get(id)
├─ Resultado: Tenta buscar ingrediente especificado
├─ Sem filtro: Busca qualquer status
└─ Se não encontrar: "Ingrediente não encontrado"
```

**Cenários de Falha:**
1. Ingrediente está **INATIVO** (`active: false`) no banco
   - Aparece na listagem apenas se houver bug no filtro
   - Falha ao tentar editar

2. Ingrediente foi **EXCLUÍDO** após o carregamento inicial
   - Aparece na listagem (cache local)
   - Falha ao tentar editar (não existe mais no Firebase)

3. Documento **CORROMPIDO** ou **SEM ID** no Firebase
   - Filtrado em `validIngredients.filter(ing => ing && ing.id)`
   - Não deveria aparecer na lista, mas pode escapar por algum motivo

### CAUSA 2: Race Condition / Timeout

```javascript
// Ingredientes.jsx - Linha 100-104
const loadPromise = Ingredient.list().catch(error => {
  // Error loading from database
  return []; // Return empty array on error
});

const allIngredients = await Promise.race([loadPromise, timeoutPromise]);
```

Se o Firestore está lento:
- Timeout de 10 segundos dispara
- Retorna `[]` vazio
- Variável `allIngredients` fica vazia
- Ingredientes não aparecem? Ou aparecem de forma inconsistente?

### CAUSA 3: Inconsistência de Dados no Firebase

**Estrutura esperada:**
```javascript
{
  id: "abc123",           // ✓ Necessário
  name: "Muçarela",       // ✓ Necessário
  active: true,           // ✓ Esperado
  current_price: 34.90,
  main_supplier: "...",
  category: "Laticínios",
  // ... outros campos
}
```

**Estrutura problemática:**
```javascript
{
  // Sem ID de documento (apenas no Firestore, não no objeto retornado)
  name: "Queijo",
  active: false,          // ← Filtrado na listagem mas pode estar no cache
  current_price: null
}
```

### CAUSA 4: Sincronização entre Aba/Página

Se o usuário:
1. Abre a página de ingredientes
2. A lista carrega (com ingrediente X ativo)
3. Outra aba/sessão **desativa** o ingrediente X
4. Usuário clica em "Editar" na listagem (ainda vê como ativo)
5. Chamada para edição falha (agora está inativo no Firebase)

---

## 7. VERIFICAÇÕES DE "ITEM NÃO EXISTE"

### 7.1 Localização das Mensagens

| Arquivo | Linha | Mensagem | Contexto |
|---------|-------|----------|---------|
| IngredientEditor.jsx | 266 | "Ingrediente não encontrado. Redirecionando..." | Se `Ingredient.get(id)` retorna null |
| Ingredients.jsx | 220 | "Ingrediente não encontrado. Ele pode ter sido excluído." | Ao atualizar preço (404) |

### 7.2 Fluxo de Detecção

```javascript
// IngredientEditor.jsx - Carregamento
const ingredient = await Ingredient.get(id);
if (!ingredient) {
  // ← ERRO AQUI: ingrediente retorna null
  setError("Ingrediente não encontrado...");
}

// Isto acontece quando:
// 1. Firebase getDoc() não encontra o documento
// 2. Timeout de 8 segundos no Firebase
// 3. Erro na leitura do documento
```

---

## 8. INCONSISTÊNCIA ENTRE ID NA LISTAGEM E NA BUSCA

### 8.1 Possibilidade 1: ID Composto ou Modificado

Procure por:
```javascript
// Pode haver transformação do ID em algum lugar
ingredient.id  // ID original do Firebase
ingredient._id // ID alternativo?
ing.id?.startsWith(id) // Busca parcial (encontrada em route.js:82)
```

Achado em `ingredients/route.js` Linha 82:
```javascript
affectedRecipes.filter(recipe => 
  recipe.preparations?.some(prep => 
    prep.ingredients?.some(ing => {
      // ATENÇÃO: Busca parcial, não exata!
      const match = ing.id?.startsWith(id);
      return match;
    })
  )
);
```

Isto sugere que alguns IDs podem ser **prefixados** com o ID principal.

### 8.2 Possibilidade 2: Campo ID Faltando

```javascript
// ingredientUtils.js - Linha 8
.filter(ing => ing && ing.id)  // Remove ingredientes sem ID
```

Se um ingrediente não tem o campo `id`:
- Filtrado em `validIngredients`
- Não deveria aparecer na lista
- Mas se aparecer (de alguma forma), clicar em editar falhará

---

## 9. CENÁRIO MAIS PROVÁVEL

**Sequência de eventos que causa o problema:**

1. **Carregamento inicial:**
   ```
   GET /api/ingredients (sem filtro de status)
   ↓
   Retorna 50 ingredientes (40 ativos + 10 inativos)
   ```

2. **Filtro no Frontend:**
   ```
   activeIngredients = filter(ing => ing.active !== false)
   ↓
   Mostra 40 ingredientes na tela
   ```

3. **Usuário clica "Editar":**
   ```
   router.push(`/ingredientes/editor?id=${ingredient.id}`)
   ↓
   IngredientEditor faz: Ingredient.get(id)
   ```

4. **Falha possível:**
   - Se `active: false` foi definido **ENTRE** o carregamento e o clique
   - Ou se há um **documento duplicado** com IDs ligeiramente diferentes
   - Ou se há um **timeout do Firestore**

---

## 10. RECOMENDAÇÕES PARA INVESTIGAÇÃO

### 10.1 Verificações Rápidas

1. **Verificar filtro de ativos:**
   ```javascript
   // Em Ingredients.jsx linha 103
   // Confirmar que TODOS os ingredientes mostrados têm active: true
   console.log('Ingredientes na lista:', ingredients.map(i => ({ 
     id: i.id, 
     name: i.name, 
     active: i.active 
   })));
   ```

2. **Verificar ID durante clique:**
   ```javascript
   // Adicionar log antes de redirecionar
   onClick={() => {
     console.log('Clicando em editar. ID:', ingredient.id, 'Completo:', ingredient);
     router.push(`/ingredientes/editor?id=${ingredient.id}`);
   }}
   ```

3. **Verificar o que Firebase retorna:**
   ```javascript
   // Em IngredientEditor.jsx linha 264
   const ingredient = await Ingredient.get(id);
   console.log('Resultado Firebase para ID', id, ':', ingredient);
   console.log('ID existe?', !!ingredient);
   console.log('ID é válido?', ingredient?.id === id);
   ```

### 10.2 Verificações no Firebase Console

1. Abrir Firebase Console
2. Ir para Collection "Ingredient"
3. Procurar por alguns ingredientes que geram erro
4. Verificar se:
   - Existem múltiplos documentos com nomes similares
   - Campo `active` está correto
   - Campo `id` existe (deveria ser automático no Firestore)

### 10.3 Logs para Adicionar

```javascript
// Em route.js PUT - Adicionar:
console.log('ID recebido:', id);
console.log('Resultado getById:', existingIngredient);
console.log('Existe?', !!existingIngredient);

// Em entities.js getById - Adicionar:
console.log(`Buscando ${collectionName}:${id}`);
console.log('Doc snap exists?', docSnap.exists());
```

---

## 11. CÓDIGO PARA REPRODUZIR O PROBLEMA

### Teste 1: Ingrediente Inativo

```javascript
// No Firebase Console:
// 1. Abra um ingrediente que aparece na lista
// 2. Mude active: true para active: false
// 3. Recarregue a página
// 4. Tente clicar em "Editar"
// Resultado: "Ingrediente não encontrado"
```

### Teste 2: Timeout Simulado

```javascript
// Simule latência no Firestore
// Aguarde > 8 segundos entre o carregamento e o clique
// Pode haver timeout na busca do ingrediente
```

### Teste 3: Verificar Cache

```javascript
// Teste se é um problema de cache local do React
// 1. Abra DevTools (F12)
// 2. Vá para Application > Local Storage
// 3. Procure por dados de ingredientes
// 4. Limpe e recarregue
```

---

## 12. RESUMO DAS CAUSAS PROVÁVEIS

| # | Causa | Probabilidade | Impacto |
|---|-------|---------------|--------|
| 1 | Ingrediente inativo mas visível na listagem | ALTA | Usuário clica, API retorna 404 |
| 2 | Timeout do Firestore (>8s) | MÉDIA | Intermitente, afeta alguns usuários |
| 3 | Race condition (dado alterado entre listagem e edição) | MÉDIA | Raro mas possível |
| 4 | ID transformado em algum lugar | BAIXA | Difícil de reproduzir |
| 5 | Documento corrompido/sem ID no Firebase | BAIXA | Dados ruins no banco |

---

## 13. ENDPOINTS DE API USADOS

### Listagem
```
GET /api/ingredients
├─ Sem parâmetro 'active'
└─ Retorna: TODOS os ingredientes (ativos + inativos)

GET /api/ingredients?active=true
└─ Retorna: Apenas ingredientes com active !== false
```

### Edição
```
GET /ingredientes/editor?id={ingredientId}
├─ Frontend chama: Ingredient.get(id)
├─ Que chama: entities.js getById()
├─ Que chama: Firebase getDoc()
└─ Retorna: null se não encontrado ou error 404
```

### Atualização
```
PUT /api/ingredients?id={ingredientId}
├─ Verifica: existingIngredient = await Ingredient.getById(id)
├─ Se null: Retorna 404 "Ingredient not found"
└─ Senão: Atualiza documento
```

---

## 14. ARQUIVOS E LINHAS CRÍTICAS

### Frontend
- `Ingredients.jsx:103` - Filtro de ingredientes ativos
- `Ingredients.jsx:545` - Clique para editar (passa ID)
- `IngredientEditor.jsx:264` - Busca ingrediente para editar
- `IngredientEditor.jsx:266` - Mensagem de erro

### Backend
- `ingredients/route.js:47-53` - Verificação PUT
- `entities.js:37-67` - Implementação getById

### Utils
- `ingredientUtils.js:8` - Filtro de ingredientes válidos

---

## 15. PRÓXIMOS PASSOS

1. **Adicionar logs console** em ambos os lados (frontend + API)
2. **Reproduzir o erro** com um ingrediente específico
3. **Verificar Firebase** se o ingrediente realmente existe com aquele ID
4. **Testar filtro de ativos** - remover filtro temporariamente para ver se ingredientes inativos aparecem
5. **Monitorar timeouts** - se há muitas requisições lentas do Firestore

