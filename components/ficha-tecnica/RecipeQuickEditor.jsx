
'use client';

import React, { useState } from 'react';
import { useRecipeQuickEditor } from '@/hooks/ficha-tecnica/useRecipeQuickEditor';
import RecipeEditModal from './RecipeEditModal';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Eye, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatUtils";

export default function RecipeQuickEditor() {
  const { recipes, loading, error, refreshRecipes, updateRecipe } = useRecipeQuickEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const handleEditClick = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedRecipe(null);
    setIsModalOpen(false);
  };

  const handleSaveRecipe = async (editedRecipe) => {
    await updateRecipe(editedRecipe.id, editedRecipe);
    handleCloseModal();
    refreshRecipes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Erro ao carregar receitas: {error}</p>
        <Button onClick={refreshRecipes} className="mt-4">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome da Receita</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Custo/kg (Rendimento)</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipes.map((recipe) => (
            <TableRow key={recipe.id}>
              <TableCell className="font-medium">{recipe.name}</TableCell>
              <TableCell>{recipe.category}</TableCell>
              <TableCell>{formatCurrency(recipe.cost_per_kg_yield)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEditClick(recipe)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {selectedRecipe && (
        <RecipeEditModal
          recipe={selectedRecipe}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveRecipe}
        />
      )}
    </div>
  );
}
