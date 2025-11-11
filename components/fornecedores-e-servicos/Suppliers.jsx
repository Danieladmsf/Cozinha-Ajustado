'use client';


import React, { useState, useEffect } from "react";
import { Supplier } from "@/app/api/entities";
import { formatCapitalize } from "@/lib/textUtils";
import { CategoryTree } from "@/app/api/entities";
import { CategoryType } from "@/app/api/entities";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  File
} from "lucide-react";
import { UploadFile } from "@/app/api/integrations";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [cnpj, setCnpj] = useState("");
  
  // Estados para as categorias
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [selectedCategoryType, setSelectedCategoryType] = useState("");
  const [categoriesByType, setCategoriesByType] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filteredSubcategories, setFilteredSubcategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    loadSuppliers();
    loadCategoryTypes();
    loadCategoryTree();
  }, []);

  // Filtrar categorias quando o tipo de categoria muda
  useEffect(() => {
    if (selectedCategoryType && categoriesByType[selectedCategoryType]) {
      // Resetar a categoria e subcategoria selecionadas quando mudar o tipo
      setSelectedCategory("");
      setFilteredSubcategories([]);
    }
  }, [selectedCategoryType, categoriesByType]);

  // Filtrar subcategorias quando a categoria muda
  useEffect(() => {
    if (selectedCategory) {
      const subs = allCategories.filter(cat => 
        cat.parent_id === selectedCategory && cat.level === 2
      );
      setFilteredSubcategories(subs);
    } else {
      setFilteredSubcategories([]);
    }
  }, [selectedCategory, allCategories]);

  const loadSuppliers = async () => {
    try {
      const data = await Supplier.list();
      setSuppliers(data);
    } catch (error) {
    }
  };

  const loadCategoryTypes = async () => {
    try {
      const types = await CategoryType.list();
      types.sort((a, b) => (a.order || 99) - (b.order || 99));
      setCategoryTypes(types);
      
      // Se tiver tipos, seleciona o primeiro por padrão
      if (types.length > 0) {
        setSelectedCategoryType(types[0].value);
      }
    } catch (error) {
    }
  };

  const loadCategoryTree = async () => {
    try {
      const categoryData = await CategoryTree.list();
      setAllCategories(categoryData);
      
      // Organizar categorias por tipo
      const categoriesByTypeObj = {};
      
      // Agrupar todas as categorias de nível 1 por seu tipo
      categoryData
        .filter(cat => cat.level === 1)
        .forEach(cat => {
          if (!categoriesByTypeObj[cat.type]) {
            categoriesByTypeObj[cat.type] = [];
          }
          categoriesByTypeObj[cat.type].push(cat);
        });
      
      setCategoriesByType(categoriesByTypeObj);
    } catch (error) {
    }
  };

  // Função para formatar CNPJ
  const formatCnpj = (value) => {
    if (!value) return "";
    
    // Remove todos os caracteres não numéricos
    const cnpjDigits = value.replace(/\D/g, "");
    
    // Limita a 14 dígitos
    const limitedCnpj = cnpjDigits.slice(0, 14);
    
    // Aplica a formatação XX.XXX.XXX/XXXX-XX
    let formattedCnpj = limitedCnpj;
    
    if (limitedCnpj.length > 2) {
      formattedCnpj = limitedCnpj.replace(/^(\d{2})/, "$1.");
    }
    if (limitedCnpj.length > 5) {
      formattedCnpj = formattedCnpj.replace(/^(\d{2})\.(\d{3})/, "$1.$2.");
    }
    if (limitedCnpj.length > 8) {
      formattedCnpj = formattedCnpj.replace(/^(\d{2})\.(\d{3})\.(\d{3})/, "$1.$2.$3/");
    }
    if (limitedCnpj.length > 12) {
      formattedCnpj = formattedCnpj.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})/, "$1.$2.$3/$4-");
    }
    
    return formattedCnpj;
  };

  const handleCnpjChange = (e) => {
    const formattedCnpj = formatCnpj(e.target.value);
    setCnpj(formattedCnpj);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await UploadFile({ file });
      if (result.success) {
        setUploadedPhotoUrl(result.file_url);
        setCurrentSupplier(prev => ({
          ...prev,
          vendor_photo: result.file_url
        }));
      } else {
      }
    } catch (error) {
    }
  };

  const handleToggleActive = async (supplier) => {
    try {
      await Supplier.update(supplier.id, {
        ...supplier,
        active: !supplier.active
      });
      
      await loadSuppliers();
      
      toast({
        title: "Sucesso",
        description: `Fornecedor ${!supplier.active ? 'ativado' : 'inativado'} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do fornecedor. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Tem certeza que deseja excluir o fornecedor "${supplier.company_name}"?`)) {
      return;
    }

    try {
      await Supplier.delete(supplier.id);
      await loadSuppliers();
      
      toast({
        title: "Sucesso",
        description: "Fornecedor excluído com sucesso.",
      });
    } catch (error) {
      
      if (error.message?.includes("constraint") || error.status === 409) {
        toast({
          title: "Erro",
          description: "Não é possível excluir este fornecedor pois ele está vinculado a outros registros.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir fornecedor. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Obter valores dos campos
    const categoryId = formData.get("category");
    const subcategoryId = formData.get("subcategory");
    
    // Determinar a categoria a ser usada: subcategoria se selecionada, ou categoria principal
    let selectedCategoryName = "";
    
    if (subcategoryId) {
      const selectedSubcat = allCategories.find(sub => sub.id === subcategoryId);
      selectedCategoryName = selectedSubcat ? selectedSubcat.name : "";
    } else if (categoryId) {
      const selectedCat = allCategories.find(cat => cat.id === categoryId);
      selectedCategoryName = selectedCat ? selectedCat.name : "";
    }
    
    const data = {
      company_name: formData.get("company_name"),
      cnpj: cnpj, // Usar o estado formatado
      vendor_name: formData.get("vendor_name"),
      vendor_phone: formData.get("vendor_phone"),
      address: formData.get("address"),
      email: formData.get("email"),
      category: selectedCategoryName,
      active: formData.get("active") === "true",
      notes: formData.get("notes"),
      vendor_photo: uploadedPhotoUrl || currentSupplier?.vendor_photo || ""
    };

    try {
      if (currentSupplier?.id) {
        await Supplier.update(currentSupplier.id, data);
      } else {
        await Supplier.create(data);
      }

      await loadSuppliers();
      setIsDialogOpen(false);
      setCurrentSupplier(null);
      setUploadedPhotoUrl("");
      setCnpj(""); // Limpar CNPJ
      resetCategorySelections();
    } catch (error) {
    }
  };

  const resetCategorySelections = () => {
    setSelectedCategoryType("");
    setSelectedCategory("");
    setFilteredSubcategories([]);
  };

  const openEditDialog = (supplier) => {
    setCurrentSupplier(supplier);
    setUploadedPhotoUrl(supplier.vendor_photo || "");
    setCnpj(supplier.cnpj || ""); // Definir CNPJ formatado
    
    // Tenta encontrar a categoria ou subcategoria do fornecedor
    const matchingCategory = allCategories.find(cat => cat.name === supplier.category);
    
    if (matchingCategory) {
      // Se for uma subcategoria (nível 2)
      if (matchingCategory.level === 2 && matchingCategory.parent_id) {
        const parentCategory = allCategories.find(cat => cat.id === matchingCategory.parent_id);
        if (parentCategory) {
          // Primeiro configura o tipo de categoria
          setSelectedCategoryType(parentCategory.type);
          // Depois a categoria pai
          setSelectedCategory(parentCategory.id);
          // As subcategorias serão filtradas pelo useEffect
        }
      } 
      // Se for uma categoria de nível 1
      else if (matchingCategory.level === 1) {
        setSelectedCategoryType(matchingCategory.type);
        setSelectedCategory(matchingCategory.id);
      }
    } else {
      resetCategorySelections();
    }
    
    setIsDialogOpen(true);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier?.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier?.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores e Serviços</h1>
          <p className="text-gray-500">Gerencie seus fornecedores e prestadores de serviços</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar fornecedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            onClick={() => {
              setCurrentSupplier(null);
              setUploadedPhotoUrl("");
              setCnpj(""); // Limpar CNPJ
              resetCategorySelections();
              setIsDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell>
                  <Avatar className="h-10 w-10">
                    {supplier.vendor_photo ? (
                      <AvatarImage src={supplier.vendor_photo} alt={supplier.vendor_name} />
                    ) : (
                      <AvatarFallback className="bg-gray-200 text-gray-600">
                        {supplier.vendor_name?.charAt(0) || "V"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium font-mono">{formatCapitalize(supplier.company_name)}</TableCell>
                <TableCell className="font-mono">{formatCapitalize(supplier.cnpj)}</TableCell>
                <TableCell className="font-mono">{formatCapitalize(supplier.vendor_name)}</TableCell>
                <TableCell className="font-mono">{formatCapitalize(supplier.vendor_phone)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(supplier)}
                        className="flex items-center cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => handleToggleActive(supplier)}
                        className="flex items-center cursor-pointer"
                      >
                        {supplier.active ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Marcar Inativo
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Marcar Ativo
                          </>
                        )}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleDelete(supplier)}
                        className="flex items-center text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredSuppliers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  Nenhum fornecedor encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setCurrentSupplier(null);
          setUploadedPhotoUrl("");
          setCnpj("");
          resetCategorySelections();
        }
        setIsDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[600px]"> {/* Reduzido de 900px para 600px */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {currentSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-4"> {/* Alterado de grid-cols-12 para grid-cols-4 */}
              {/* Coluna da Foto - 1 coluna (25%) */}
              <div className="col-span-1 space-y-2"> {/* Alterado de col-span-3 para col-span-1 */}
                <label htmlFor="vendor_photo" className="text-sm font-medium flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Foto
                </label>
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-24 w-24"> {/* Reduzido de h-32 w-32 para h-24 w-24 */}
                    {(uploadedPhotoUrl || currentSupplier?.vendor_photo) ? (
                      <AvatarImage 
                        src={uploadedPhotoUrl || currentSupplier?.vendor_photo} 
                        alt={currentSupplier?.vendor_name} 
                      />
                    ) : (
                      <AvatarFallback>
                        {currentSupplier?.vendor_name?.charAt(0) || "V"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Input
                    id="vendor_photo"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-sm w-full"
                    size="sm"
                  />
                </div>
              </div>

              {/* Coluna dos Dados - 3 colunas (75%) */}
              <div className="col-span-3 space-y-3"> {/* Alterado de col-span-9 para col-span-3 e reduzido espaçamento */}
                <div className="grid grid-cols-2 gap-3"> {/* Reduzido gap de 4 para 3 */}
                  <div className="space-y-1"> {/* Reduzido espaçamento de space-y-2 para space-y-1 */}
                    <label htmlFor="company_name" className="text-sm font-medium flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {/* Reduzido tamanho do ícone */}
                      Nome da Empresa
                    </label>
                    <Input
                      id="company_name"
                      name="company_name"
                      defaultValue={currentSupplier?.company_name}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="cnpj" className="text-sm font-medium flex items-center gap-1">
                      <File className="w-3 h-3" />
                      CNPJ
                    </label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="vendor_name" className="text-sm font-medium flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Nome do Vendedor
                    </label>
                    <Input
                      id="vendor_name"
                      name="vendor_name"
                      defaultValue={currentSupplier?.vendor_name}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="vendor_phone" className="text-sm font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Telefone
                    </label>
                    <Input
                      id="vendor_phone"
                      name="vendor_phone"
                      defaultValue={currentSupplier?.vendor_phone}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={currentSupplier?.email}
                    />
                  </div>

                  {/* Dropdown 1: Tipos de Categoria (abas) */}
                  <div className="space-y-1">
                    <label htmlFor="category_type" className="text-sm font-medium">
                      Tipo de Categoria
                    </label>
                    <Select 
                      id="category_type"
                      name="category_type" 
                      value={selectedCategoryType}
                      onValueChange={setSelectedCategoryType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryTypes.length > 0 ? (
                          categoryTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="ingredient">Ingredientes</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Categorias de acordo com o tipo selecionado */}
                {selectedCategoryType && categoriesByType[selectedCategoryType] && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Dropdown 2: Categorias do tipo selecionado */}
                    <div className="space-y-1">
                      <label htmlFor="category" className="text-sm font-medium">
                        Categoria
                      </label>
                      <Select 
                        id="category"
                        name="category" 
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesByType[selectedCategoryType].map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  
                    {/* Dropdown 3: Subcategorias da categoria selecionada */}
                    {selectedCategory && filteredSubcategories.length > 0 && (
                      <div className="space-y-1">
                        <label htmlFor="subcategory" className="text-sm font-medium">
                          Subcategoria
                        </label>
                        <Select name="subcategory">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredSubcategories.map(subcat => (
                              <SelectItem key={subcat.id} value={subcat.id}>
                                {subcat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="address" className="text-sm font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Endereço
                  </label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={currentSupplier?.address}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="notes" className="text-sm font-medium">Observações</label>
                  <Textarea
                    id="notes"
                    name="notes"
                    defaultValue={currentSupplier?.notes}
                    rows={1} /* Reduzido de 2 para 1 */
                    className="min-h-[40px]" /* Altura mínima reduzida */
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    name="active"
                    defaultChecked={currentSupplier?.active ?? true}
                    value="true"
                  />
                  <label htmlFor="active" className="text-sm font-medium">
                    Fornecedor ativo
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false);
                setCurrentSupplier(null);
                setUploadedPhotoUrl("");
                setCnpj("");
                resetCategorySelections();
              }}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {currentSupplier ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
