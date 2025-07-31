import React, { useState, useEffect } from "react";
import { Brand } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, Star, StarOff, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function BrandsManager() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentBrand, setCurrentBrand] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    description: "",
    active: true,
    preferred: false
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const brandsData = await Brand.list();
      setBrands(brandsData || []);
    } catch (error) {toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da marca é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      if (currentBrand?.id) {
        await Brand.update(currentBrand.id, formData);
      } else {
        await Brand.create(formData);
      }
      
      setIsDialogOpen(false);
      setCurrentBrand(null);
      await loadData();
      
      toast({
        title: "Sucesso",
        description: currentBrand ? "Marca atualizada" : "Marca criada"
      });
    } catch (error) {toast({
        title: "Erro",
        description: "Erro ao salvar marca",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (brand) => {
    if (!window.confirm(`Deseja excluir a marca "${brand.name}"?`)) {
      return;
    }

    try {
      await Brand.delete(brand.id);
      await loadData();
      
      toast({
        title: "Sucesso",
        description: "Marca excluída"
      });
    } catch (error) {toast({
        title: "Erro",
        description: "Não foi possível excluir a marca",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (brand) => {
    setCurrentBrand(brand);
    setFormData({
      name: brand.name || "",
      manufacturer: brand.manufacturer || "",
      description: brand.description || "",
      active: brand.active ?? true,
      preferred: brand.preferred ?? false
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setCurrentBrand(null);
    setFormData({
      name: "",
      manufacturer: "",
      description: "",
      active: true,
      preferred: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredBrands = brands.filter(brand => 
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header das Marcas */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestão de Marcas</h3>
          <p className="text-sm text-gray-500">Gerencie as marcas e seus fornecedores</p>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar marcas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Marca
          </Button>
        </div>
      </div>

      {/* Lista de Marcas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Marcas ({filteredBrands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preferida</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>{brand.manufacturer || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={brand.active ? "success" : "secondary"}>
                        {brand.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {brand.preferred ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      ) : (
                        <StarOff className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(brand)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredBrands.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhuma marca encontrada para a busca" : "Nenhuma marca cadastrada"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição de Marca */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentBrand ? "Editar Marca" : "Nova Marca"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Marca *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da marca"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturer">Fabricante</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="Nome do fabricante"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição ou observações sobre a marca"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Marca ativa</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="preferred"
                  checked={formData.preferred}
                  onCheckedChange={(checked) => setFormData({ ...formData, preferred: checked })}
                />
                <Label htmlFor="preferred">Marca preferida</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {currentBrand ? "Salvar Alterações" : "Criar Marca"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}