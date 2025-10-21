import React from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CustomerSelector({ 
  customers = [], 
  selectedCustomer, 
  onCustomerChange, 
  searchTerm = "", 
  onSearchChange 
}) {
  
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Campo de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400"
        />
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-amber-600">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <Button
              key={customer.id}
              variant="ghost"
              onClick={() => onCustomerChange(customer)}
              className={cn(
                "w-full justify-start p-3 h-auto text-left transition-all duration-200",
                selectedCustomer?.id === customer.id
                  ? "bg-amber-100 border-amber-300 text-amber-900 border-2"
                  : "bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium text-sm">{customer.name}</span>
                {customer.company && (
                  <span className="text-xs opacity-75 mt-1">{customer.company}</span>
                )}
                {customer.category && (
                  <span className="text-xs mt-1 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                    {customer.category}
                  </span>
                )}
              </div>
            </Button>
          ))
        )}
      </div>

      {/* Cliente Selecionado */}
      {selectedCustomer && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900">Cliente Selecionado</p>
              <p className="text-sm text-amber-700">{selectedCustomer.name}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCustomerChange(null)}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              Limpar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}