import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const FiltersSection = ({ 
  selectedCustomer, 
  onCustomerChange,
  searchTerm, 
  onSearchChange,
  customers,
  customerCount,
  filterStats 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cliente
        </label>
        <Select value={selectedCustomer} onValueChange={onCustomerChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Clientes</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Cliente
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Digite o nome do cliente..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-2">
        <Badge variant="secondary" className="h-fit">
          {customerCount} cliente(s) com pedidos
        </Badge>
        {filterStats && filterStats.isFiltered && (
          <Badge variant="outline" className="h-fit text-xs">
            {filterStats.filterEfficiency}% dos pedidos exibidos
          </Badge>
        )}
      </div>
    </div>
  );
};

export default FiltersSection;