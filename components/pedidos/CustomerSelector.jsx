import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Circle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"; // Adicionado ScrollArea
import { cn } from "@/lib/utils";

export default function CustomerSelector({ 
  customers,
  selectedCustomer,
  setSelectedCustomer,
  filterText,
  setFilterText,
  hasUnsavedChanges,
  saving
}) {
  const filteredCustomers = customers
    .filter(customer => 
      customer.name?.toLowerCase().includes(filterText.toLowerCase()) ||
      customer.company?.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return (
    <aside className="p-4 border-r border-slate-200 w-full md:w-72 lg:w-80 bg-white flex flex-col h-full shadow-md"> {/* Ajustado width e shadow */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar cliente..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="pl-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-md shadow-sm"
        />
      </div>
      
      <ScrollArea className="flex-1 -mx-2"> {/* Adicionado ScrollArea e margem negativa para compensar padding dos itens */}
        <div className="space-y-1 px-2"> {/* Adicionado px-2 aqui */}
          {filteredCustomers.map(customer => (
            <button // Transformado em button para melhor acessibilidade
              key={customer.id}
              type="button"
              className={cn(
                "w-full p-2.5 rounded-md text-left transition-all duration-150 ease-in-out relative group",
                selectedCustomer?.id === customer.id
                  ? "bg-blue-100 text-blue-800 shadow-sm"
                  : "hover:bg-slate-100 text-slate-700"
              )}
              onClick={() => setSelectedCustomer(customer)}
            >
              <div className="font-medium text-sm">{customer.name}</div>
              {customer.company && (
                <div className="text-xs text-slate-500 group-hover:text-slate-600">{customer.company}</div>
              )}
              {customer.active === false && (
                <Badge variant="outline" className="mt-1.5 text-xs border-yellow-400 text-yellow-700 bg-yellow-50">Inativo</Badge>
              )}
              
              {selectedCustomer?.id === customer.id && hasUnsavedChanges && (
                <div className="absolute top-1.5 right-1.5">
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  ) : (
                    <Circle className="w-3 h-3 fill-blue-500 text-blue-500" />
                  )}
                </div>
              )}
            </button>
          ))}
          
          {filteredCustomers.length === 0 && !customers.length && ( // Mensagem se não houver clientes cadastrados
            <div className="text-center p-6 text-slate-500">
              <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
            </div>
          )}
          {filteredCustomers.length === 0 && customers.length > 0 && ( // Mensagem se a busca não retornar resultados
            <div className="text-center p-6 text-slate-500">
              <p className="text-sm">Nenhum cliente encontrado com "{filterText}"</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}