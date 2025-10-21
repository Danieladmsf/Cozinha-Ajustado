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
    <div className="p-3">
      <Tabs 
        value={selectedCustomer?.id || "all"} 
        onValueChange={handleValueChange}
        className="w-full"
      >
        <TabsList 
          className="flex flex-col w-full bg-transparent p-0 h-auto gap-1" 
        >
          {/* Tab "Todos os Clientes" */}
          <TabsTrigger 
            value="all" 
            className="flex items-center justify-start gap-2 px-3 py-2 text-xs font-medium data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 hover:bg-gray-50 rounded-md transition-all w-full"
          >
            <Users className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Todos os Clientes</span>
          </TabsTrigger>
          
          {/* Tabs dos Clientes */}
          {locations.map(location => (
            <TabsTrigger 
              key={location.id} 
              value={location.id}
              className="flex items-center justify-start gap-2 px-3 py-2 text-xs font-medium data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 hover:bg-gray-50 rounded-md transition-all w-full"
            >
              {location.photo ? (
                <Avatar className="h-4 w-4 flex-shrink-0">
                  <AvatarImage src={location.photo} alt={location.name} />
                  <AvatarFallback className="text-[10px] bg-blue-100 text-blue-600">
                    {location.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Building2 className="h-3 w-3 flex-shrink-0 text-gray-600" />
              )}
              <span className="truncate text-xs" title={location.name}>
                {location.name}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}