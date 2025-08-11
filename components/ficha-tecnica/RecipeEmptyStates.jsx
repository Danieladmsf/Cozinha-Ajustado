import React from 'react';
import { CookingPot } from "lucide-react";

const EmptyRecipeState = () => (
  <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
    <div className="flex flex-col items-center gap-3">
      <CookingPot className="h-10 w-10 text-blue-500" />
      <h3 className="text-lg font-medium text-blue-800">Comece sua ficha técnica</h3>
      <p className="text-blue-600 max-w-md mx-auto">
        Para iniciar, adicione um novo processo utilizando o botão acima.
      </p>
    </div>
  </div>
);

const EmptyPrePreparoState = () => (
  <div className="bg-purple-50 p-6 rounded-lg border border-purple-100 text-center">
    <div className="flex flex-col items-center gap-3">
      <CookingPot className="h-10 w-10 text-purple-500" />
      <h3 className="text-lg font-medium text-purple-800">Seção de Pré Preparo</h3>
      <p className="text-purple-600 max-w-md mx-auto">
        Configure os ingredientes e processos de pré preparo para suas receitas.
      </p>
    </div>
  </div>
);

const RecipeEmptyStates = {
  EmptyRecipeState,
  EmptyPrePreparoState,
};

export default RecipeEmptyStates;