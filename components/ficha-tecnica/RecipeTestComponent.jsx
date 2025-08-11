import React from 'react';
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';

export default function RecipeTestComponent() {
  const { recipe, actions, computed } = useRecipeStore();

  return (
    <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded mb-6">
      <h3 className="text-lg font-bold text-blue-800">Teste do RecipeStore</h3>

      <div className="mt-2 space-y-2">
        <input
          value={recipe.name}
          onChange={(e) => actions.setRecipeField('name', e.target.value)}
          placeholder="Nome da receita"
          className="p-2 border rounded w-full"
        />
        <p>Nome atual: <span className="font-semibold">{recipe.name || 'Vazio'}</span></p>
        <p>Tem alterações: <span className="font-semibold">{computed.needsSave ? 'SIM' : 'NÃO'}</span></p>

        <button 
          onClick={() => actions.addPreparation()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Adicionar Preparação (Total de Ingredientes: {computed.hasPreparations ? computed.totalIngredients : 0})
        </button>
      </div>
    </div>
  );
}