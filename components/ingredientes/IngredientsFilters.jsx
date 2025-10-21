import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, Tag, Truck } from "lucide-react";

export default function IngredientsFilters({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  supplierFilter,
  setSupplierFilter,
  uniqueCategories,
  uniqueSuppliers,
  hasActiveFilters,
  resetFilters
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
          <Filter className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">Filtros de Busca</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="ml-auto text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
          <Input
            placeholder="Buscar ingredientes, marcas, fornecedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-3 bg-white border-2 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl text-slate-700 placeholder:text-slate-400 shadow-sm hover:shadow-md transition-all duration-200"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-purple-500" />
            <label className="text-sm font-medium text-slate-600">Categoria</label>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-white border-2 border-slate-200 focus:border-purple-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-0">
              <SelectItem value="all" className="rounded-lg">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  Todas categorias
                </span>
              </SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category} className="rounded-lg">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    {category}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Supplier Filter */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-orange-500" />
            <label className="text-sm font-medium text-slate-600">Fornecedor</label>
          </div>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="bg-white border-2 border-slate-200 focus:border-orange-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
              <SelectValue placeholder="Todos fornecedores" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-0">
              <SelectItem value="all" className="rounded-lg">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  Todos fornecedores
                </span>
              </SelectItem>
              {uniqueSuppliers.map(supplier => (
                <SelectItem key={supplier} value={supplier} className="rounded-lg">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    {supplier}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}