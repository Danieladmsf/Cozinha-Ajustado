'use client';

import React, { useState, useEffect } from "react";
import { NutritionCategory } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Apple,
  PlusCircle,
  Pencil,
  Trash,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createPageUrl } from "@/utils";
import { toast } from "@/components/ui/use-toast";

export default function NutritionCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    category: "",
    description: "",
    active: true
  });
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await NutritionCategory.list();
      setCategories(data);
    } catch (error) {
      // Error loading nutrition categories
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setCurrentCategory(category);
    setFormData({
      category: category.category,
      description: category.description || "",
      active: category.active !== false
    });
    setIsDialogOpen(true);
  };

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setFormData({
      category: "",
      description: "",
      active: true
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = async (category) => {
    if (window.confirm(`Tem certeza que deseja excluir a categoria "${category.category}"?`)) {
      try {
        await NutritionCategory.delete(category.id);
        toast({
          title: "Sucesso",
          description: "Categoria excluída com sucesso."
        });
        fetchCategories();
      } catch (error) {
        // Error deleting category
        toast({
          title: "Erro",
          description: "Não foi possível excluir a categoria. Ela pode estar sendo usada por algum alimento.",
          variant: "destructive"
        });
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (currentCategory) {
        await NutritionCategory.update(currentCategory.id, formData);
        toast({
          title: "Sucesso",
          description: "Categoria atualizada com sucesso."
        });
      } else {
        await NutritionCategory.create(formData);
        toast({
          title: "Sucesso",
          description: "Categoria criada com sucesso."
        });
      }
      
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error) {
      // Error saving category
      toast({
        title: "Erro",
        description: "Não foi possível salvar a categoria.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => router.push('/nutrition')}
            className="mb-2 -ml-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Tabela Nutricional
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Categorias Nutricionais</h1>
          <p className="text-gray-500">Gerencie as categorias de alimentos da tabela nutricional</p>
        </div>
        
        <Button 
          onClick={handleAddCategory}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5" />
            Categorias de Alimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Carregando categorias...</p>
            </div>
          ) : categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.category}</TableCell>
                    <TableCell>{category.description || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={category.active !== false ? "success" : "outline"}
                        className={category.active !== false ? "bg-green-100 text-green-800" : ""}
                      >
                        {category.active !== false ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Apple className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma categoria encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece adicionando categorias para organizar seus alimentos.
              </p>
              <div className="mt-6">
                <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Adicionar Categoria
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5" />
              {currentCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="category">Nome da Categoria *</Label>
              <Input 
                id="category"
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                placeholder="Ex: Frutas e derivados"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Descreva o tipo de alimentos desta categoria"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                name="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Categoria ativa</Label>
            </div>
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {currentCategory ? "Salvar Alterações" : "Criar Categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}