import { useState, useEffect, useCallback } from "react";
import { Ingredient } from "@/app/api/entities";
import { toast } from "@/components/ui/use-toast";

export function useIngredients() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    traditional: 0,
    commercial: 0
  });

  // Função auxiliar para retry com backoff exponencial
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 1) {
          console.log(`✅ Sucesso na tentativa ${attempt}/${maxRetries}`);
        }
        return result;
      } catch (error) {
        console.error(`❌ Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
        
        if (attempt === maxRetries) {
          throw error; // Última tentativa, propagar erro
        }
        
        // Backoff exponencial: 1s, 2s, 4s...
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const loadIngredients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Implementar loading com retry e fallback
      const loadWithRetry = async () => {
        return await retryWithBackoff(
          async () => {
            // Timeout mais conservador para cada tentativa
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout na requisição (8s)")), 8000)
            );
            
            const loadPromise = Ingredient.list();
            return await Promise.race([loadPromise, timeoutPromise]);
          },
          3, // máximo 3 tentativas
          1000 // delay inicial de 1s
        );
      };

      let allIngredients = [];
      
      try {
        allIngredients = await loadWithRetry();
      } catch (retryError) {
        console.error('❌ Todas as tentativas de carregamento falharam:', retryError);
        
        // Fallback: tentar usar dados do localStorage se disponíveis
        const cachedIngredients = localStorage.getItem('ingredients_cache');
        if (cachedIngredients) {
          console.log('📦 Usando dados em cache como fallback');
          try {
            const cached = JSON.parse(cachedIngredients);
            // Verificar se cache não está muito antigo (24 horas)
            const cacheTimestamp = localStorage.getItem('ingredients_cache_timestamp');
            const isRecentCache = cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 24 * 60 * 60 * 1000;
            
            if (isRecentCache && Array.isArray(cached)) {
              allIngredients = cached;
              setError('⚠️ Dados carregados do cache (conexão instável detectada)');
            } else {
              throw new Error('Cache expirado ou inválido');
            }
          } catch (cacheError) {
            console.error('❌ Erro ao usar cache:', cacheError);
            throw retryError; // Usar erro original
          }
        } else {
          throw retryError; // Não há fallback disponível
        }
      }
      
      // Processar ingredientes (mesmo fluxo anterior)
      const validIngredients = Array.isArray(allIngredients) 
        ? allIngredients.filter(ing => ing && ing.id)
        : [];

      if (validIngredients.length === 0) {
        console.warn('⚠️ Nenhum ingrediente válido encontrado');
        setError('Nenhum ingrediente encontrado. Verifique a conexão ou tente novamente.');
        setIngredients([]);
        setStats({ total: 0, active: 0, traditional: 0, commercial: 0 });
        return;
      }

      const processedIngredients = validIngredients.map(ingredient => ({
        ...ingredient,
        displayName: ingredient.name,
        displayPrice: ingredient.current_price,
        displaySupplier: ingredient.main_supplier || 'N/A',
        displayBrand: ingredient.brand || 'N/A'
      }));

      const activeIngredients = processedIngredients.filter(ing => ing.active !== false);

      // Cache dos dados para uso futuro
      if (!error) { // Só fazer cache se não estamos usando fallback
        try {
          localStorage.setItem('ingredients_cache', JSON.stringify(processedIngredients));
          localStorage.setItem('ingredients_cache_timestamp', Date.now().toString());
        } catch (cacheError) {
          console.warn('⚠️ Não foi possível cachear os dados:', cacheError);
        }
      }

      setIngredients(activeIngredients);
      
      setStats({
        total: processedIngredients.length,
        active: activeIngredients.length,
        traditional: activeIngredients.filter(ing =>
          ing.ingredient_type === 'traditional' || ing.ingredient_type === 'both'
        ).length,
        commercial: activeIngredients.filter(ing =>
          ing.ingredient_type === 'commercial' || ing.ingredient_type === 'both'
        ).length
      });

      console.log('✅ Ingredientes carregados com sucesso:', {
        total: processedIngredients.length,
        active: activeIngredients.length,
        cached: !!error // indica se usou cache
      });

    } catch (err) {
      console.error('❌ Erro fatal ao carregar ingredientes:', err);
      setError('Erro ao carregar ingredientes: ' + err.message + '. Tente recarregar a página.');
      setIngredients([]);
      setStats({ total: 0, active: 0, traditional: 0, commercial: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (ingredient) => {
    if (!ingredient || !ingredient.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ingrediente não possui ID válido para exclusão."
      });
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o ingrediente "${ingredient.name}"?`)) {
      try {
        const result = await Ingredient.delete(ingredient.id);
        
        setIngredients(prevIngredients => 
          prevIngredients.filter(ing => ing.id !== ingredient.id)
        );
        
        // Também atualizar as estatísticas
        setStats(prevStats => ({
          ...prevStats,
          total: Math.max(0, prevStats.total - 1),
          active: Math.max(0, prevStats.active - 1),
          traditional: ingredient.ingredient_type === 'traditional' || ingredient.ingredient_type === 'both' 
            ? Math.max(0, prevStats.traditional - 1) : prevStats.traditional,
          commercial: ingredient.ingredient_type === 'commercial' || ingredient.ingredient_type === 'both'
            ? Math.max(0, prevStats.commercial - 1) : prevStats.commercial
        }));
        
        // Mostrar mensagem de sucesso adequada
        const message = result.alreadyDeleted 
          ? "Ingrediente já havia sido excluído e foi removido da lista" 
          : "Ingrediente excluído com sucesso";
        
        toast({
          title: "Ingrediente removido",
          description: `${ingredient.name}: ${message}`
        });
        
        // Recarregar do servidor para garantir sincronização
        setTimeout(() => loadIngredients(), 1000);
      } catch (err) {
        console.error('Erro ao excluir ingrediente:', err);
        setError('Erro ao excluir ingrediente: ' + err.message);
        toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: err.message
        });
      }
    }
  }, [loadIngredients]);

  const updateIngredientPrice = useCallback((ingredientId, newPrice, lastUpdate) => {
    const currentDate = lastUpdate || new Date().toISOString().split('T')[0];
    
    setIngredients(prevIngredients => 
      prevIngredients.map(ing => 
        ing.id === ingredientId 
          ? { 
              ...ing, 
              current_price: newPrice, 
              displayPrice: newPrice,
              last_update: currentDate
            }
          : ing
      )
    );
    
    console.log('✅ Estado local atualizado:', {
      ingredientId,
      newPrice,
      lastUpdate: currentDate
    });
  }, []);

  // Nova função para atualização completa do ingrediente
  const updateIngredient = useCallback((ingredientId, updatedData) => {
    setIngredients(prevIngredients => 
      prevIngredients.map(ing => 
        ing.id === ingredientId 
          ? { 
              ...ing,
              ...updatedData,
              displayPrice: updatedData.current_price || ing.current_price,
              displaySupplier: updatedData.main_supplier || ing.main_supplier || 'N/A',
              displayBrand: updatedData.brand || ing.brand || 'N/A'
            }
          : ing
      )
    );
    
    console.log('✅ Ingrediente atualizado completamente:', {
      ingredientId,
      updatedFields: Object.keys(updatedData)
    });
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  return {
    ingredients,
    loading,
    error,
    stats,
    loadIngredients,
    handleDelete,
    updateIngredientPrice,
    updateIngredient
  };
}