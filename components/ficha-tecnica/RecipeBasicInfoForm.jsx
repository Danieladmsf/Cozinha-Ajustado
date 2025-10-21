import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { useRecipeStore } from '@/hooks/ficha-tecnica/useRecipeStore';

export default function RecipeBasicInfoForm() {
  const { recipe, actions, computed } = useRecipeStore();
  const { 
    availableCategories = [], 
    categoriesLoading = false, 
    categoriesError = null, 
    getCategoriesWithCurrent = () => [],
    validationErrors = {},
    isLoading = false,
    formatDisplayValue = (val) => val
  } = computed;

  const handleInputChange = (e) => {
    actions.setRecipeField(e.target.name, e.target.value);
  };

  const handleCategoryChange = (value) => {
    actions.setRecipeField('category', value);
  };

  const handlePrepTimeChange = (e) => {
    actions.setRecipeField('prep_time', e.target.value);
  };

  return (
    <Card className="bg-white shadow-sm border">
      <CardHeader className="bg-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-lg">
        <CardTitle className="text-lg font-semibold text-gray-700">
          Informações Básicas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-start">
          <div>
            <Label htmlFor="name" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <span className="text-blue-500 mr-1.5">●</span> Nome Principal *
            </Label>
            <Input
              id="name"
              name="name"
              value={recipe.name || ''}
              onChange={handleInputChange}
              placeholder="Ex: Maminha Assada"
              required
              disabled={isLoading}
              className={`w-full ${validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              aria-describedby={validationErrors.name ? 'name-error' : undefined}
            />
            {validationErrors.name && (
              <p id="name-error" className="text-sm text-red-600 mt-1">
                {validationErrors.name}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="name_complement" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <span className="text-purple-500 mr-1.5">●</span> Complemento (opcional)
            </Label>
            <Input
              id="name_complement"
              name="name_complement"
              value={recipe.name_complement || ''}
              onChange={handleInputChange}
              placeholder="Ex: ao molho de mostarda"
              disabled={isLoading}
              className="w-full"
            />
          </div>
          
          <div>
            <Label htmlFor="cuba_weight" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <span className="text-pink-500 mr-1.5">●</span> {recipe.weight_field_name || 'Peso da Cuba'} (kg)
              <span className="ml-auto text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">Calculado automaticamente</span>
            </Label>
            <Input
              id="cuba_weight"
              name="cuba_weight"
              type="text"
              value={formatDisplayValue(recipe.cuba_weight, 'weight')}
              readOnly
              placeholder="Calculado pela soma das etapas de finalização"
              className="w-full bg-gray-50 text-gray-600 cursor-not-allowed"
              title="Este valor é calculado automaticamente pela soma das etapas de Porcionamento e Montagem"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Categoria
              {recipe.category && !availableCategories.find(cat => cat.value === recipe.category) && (
                <span className="text-xs text-orange-500">
                  (Categoria personalizada)
                </span>
              )}
            </Label>
            <Select 
              value={recipe.category} 
              onValueChange={handleCategoryChange}
              disabled={isLoading || categoriesLoading}
            >
              <SelectTrigger className={`transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 hover:border-gray-400 ${validationErrors.category ? 'border-red-500' : ''}`}>
                <SelectValue 
                  placeholder={categoriesLoading ? "Carregando categorias..." : "Selecione a categoria"}
                />
              </SelectTrigger>
              <SelectContent>
                {categoriesLoading ? (
                  <SelectItem value="loading" disabled>Carregando categorias...</SelectItem>
                ) : categoriesError ? (
                  <SelectItem value="error" disabled>Erro ao carregar categorias</SelectItem>
                ) : availableCategories.length === 0 ? (
                  <SelectItem value="empty" disabled>Nenhuma categoria disponível</SelectItem>
                ) : (
                  getCategoriesWithCurrent(recipe.category).map(category => (
                    <SelectItem key={category.id} value={category.value}>
                      {category.name}
                      {category.id.startsWith('custom-') && (
                        <span className="text-xs text-gray-400 ml-1">(personalizada)</span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {validationErrors.category && (
              <p className="text-sm text-red-600 mt-1">
                {validationErrors.category}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              Tempo de Preparo (min)
            </Label>
            <Input
              type="number"
              min="0"
              value={recipe.prep_time || 0}
              onChange={handlePrepTimeChange}
              disabled={isLoading}
              className={`transition-all duration-200 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 hover:border-gray-400 ${validationErrors.prep_time ? 'border-red-500' : ''}`}
              aria-describedby={validationErrors.prep_time ? 'prep-time-error' : undefined}
            />
            {validationErrors.prep_time && (
              <p id="prep-time-error" className="text-sm text-red-600 mt-1">
                {validationErrors.prep_time}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}