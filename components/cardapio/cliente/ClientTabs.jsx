'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Building2 } from 'lucide-react';

export default function ClientTabs({
  selectedCustomer,
  locations,
  customers,
  getLocationById,
  onCustomerChange
}) {
  const handleValueChange = (value) => {
    if (value === "all") {
      onCustomerChange({ id: "all", name: "Todos os Clientes" });
    } else {
      const customer = customers.find(c => c.id === value) || getLocationById(value);
      onCustomerChange(customer || null);
    }
  };

  return (
    <div className="bg-white p-6">
      <Tabs 
        value={selectedCustomer?.id || "all"} 
        onValueChange={handleValueChange}
        className="w-full"
      >
        <TabsList 
          className="grid w-full bg-gray-100 p-1 h-auto rounded-lg" 
          style={{ gridTemplateColumns: `repeat(${locations.length + 1}, minmax(0, 1fr))` }}
        >
          {/* Tab "Todos os Clientes" */}
          <TabsTrigger 
            value="all" 
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Todos os Clientes</span>
              <span className="sm:hidden">Todos</span>
            </div>
          </TabsTrigger>
          
          {/* Tabs dos Clientes */}
          {locations.map(location => (
            <TabsTrigger 
              key={location.id} 
              value={location.id}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                {location.photo ? (
                  <Avatar className="h-5 w-5 flex-shrink-0">
                    <AvatarImage src={location.photo} alt={location.name} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                      {location.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Building2 className="h-4 w-4 flex-shrink-0 text-gray-600" />
                )}
                <span className="truncate" title={location.name}>
                  {location.name}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}