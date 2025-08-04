'use client';

import React, { useState, useEffect } from "react";
import { Recipe } from "@/app/api/entities";
import { Ingredient } from "@/app/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Cookie, Package } from "lucide-react";

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  
  // Hydration guard
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Adicionar tags de cabeçalho estruturado para SEO
  useEffect(() => {
    // Adicionar dados estruturados JSON-LD para SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Cozinha Afeto",
      "description": "Sistema de gestão completo para restaurantes",
      "url": "http://localhost:9000",
      "applicationCategory": "RestaurantManagement",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "BRL"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      scripts.forEach(script => script.remove());
    };
  }, []);
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isClient) {
      loadData();
    }
  }, [isClient]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only load data on client side to avoid build issues
      if (typeof window === 'undefined') {
        setRecipes([]);
        setIngredients([]);
        setLoading(false);
        return;
      }

      // Load recipes with better error handling
      const recipesData = await Recipe.getAll().catch(error => {
        console.error("[Dashboard] Error loading recipes:", error);
        return []; // Return empty array on error instead of throwing
      });

      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load ingredients with better error handling
      const ingredientsData = await Ingredient.getAll().catch(error => {
        console.error("[Dashboard] Error loading ingredients:", error);
        return []; // Return empty array on error instead of throwing
      });

      // Garantir que todos os dados tenham IDs válidos
      const validatedRecipes = (recipesData || []).map((recipe, index) => ({
        ...recipe,
        id: recipe.id || `recipe-${index}-${Date.now()}`
      }));

      const validatedIngredients = (ingredientsData || []).map((ingredient, index) => ({
        ...ingredient,
        id: ingredient.id || `ingredient-${index}-${Date.now()}`
      }));

      setRecipes(validatedRecipes);
      setIngredients(validatedIngredients);
    } catch (error) {
      console.error("[Dashboard] Critical error loading data:", error);
      setError("Erro ao carregar dados. Por favor, recarregue a página.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to retry requests with delay
  const retryWithDelay = async (fn, retries = 3, delay = 2000) => {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0 && error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithDelay(fn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  };

  const getMostProfitableRecipes = () => {
    return recipes
      .filter(recipe => recipe.active)
      .sort((a, b) => {
        const aCost = a.cost_per_gram_yield || 0;
        const bCost = b.cost_per_gram_yield || 0;
        
        if (aCost === 0 && bCost === 0) {
          return 0;
        }
        if (aCost === 0) {
          return 1;
        }
        if (bCost === 0) {
          return -1;
        }
        
        return aCost - bCost;
      })
      .slice(0, 5);
  };

  const profitableRecipes = getMostProfitableRecipes();

  // Show loading during hydration
  if (!isClient || loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="text-lg font-medium">Carregando...</div>
        <div className="text-sm text-gray-600">Aguarde enquanto carregamos os dados do dashboard.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 font-medium">Erro no Dashboard</div>
          <div className="text-red-700 text-sm mt-1">{error}</div>
          <button
            onClick={loadData}
            className="mt-3 px-4 py-2 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const formatCostPerGram = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "R$ 0,00";
    }
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  const formatWeight = (weight) => {
    if (!weight) return "0 g";
    
    if (weight >= 1000) {
      return `${(weight / 1000).toFixed(2).replace('.', ',')} kg`;
    } else {
      return `${weight} g`;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Operacional</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Receitas Ativas</CardTitle>
            <Cookie className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recipes.filter(r => r.active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ingredientes Ativos</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ingredients.filter(i => i.active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receitas Mais Rentáveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profitableRecipes.map(recipe => (
                <div key={recipe.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{recipe.name}</p>
                    <Badge variant="outline" className="mt-1">
                      {recipe.category}
                    </Badge>
                    <p className="text-sm text-gray-500 mt-1">
                      Rendimento: {formatWeight(recipe.yield_weight)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Custo por kg (Bruto):</p>
                      <p className="font-bold text-blue-600">
                        {formatCostPerGram(recipe.cost_per_gram_raw)}
                      </p>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-500">Custo por kg (Rend):</p>
                      <p className="text-sm font-medium text-green-600">
                        {formatCostPerGram(recipe.cost_per_gram_yield)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {profitableRecipes.length === 0 && (
                <p className="text-center text-gray-500">Nenhuma receita cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
