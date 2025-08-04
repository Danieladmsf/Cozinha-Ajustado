'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MapPin, Users, AlertTriangle } from 'lucide-react';

export default function LocationCheckboxGroup({
  locations,
  item,
  locationSelection,
  onLocationChange,
  categoryId,
  itemIndex
}) {
  if (!locations || locations.length === 0) {
    return (
      <div className="mt-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
          <Label className="text-sm font-medium text-amber-800">
            Nenhum local cadastrado
          </Label>
        </div>
        <p className="text-sm text-amber-700">
          Cadastre locais de servimento para poder selecioná-los aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center mb-3">
        <MapPin className="h-4 w-4 text-gray-600 mr-2" />
        <Label className="text-sm font-medium text-gray-700">
          Locais de servimento
        </Label>
      </div>
      
      <div className="space-y-3">
        {/* Checkbox "Todos os Clientes" */}
        <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 transition-colors">
          <Checkbox
            id={`location-select-all-${categoryId}-${itemIndex}`}
            checked={locationSelection.isAllSelected(item.locations)}
            onCheckedChange={(checked) => 
              onLocationChange('select-all', checked)
            }
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <Label 
            htmlFor={`location-select-all-${categoryId}-${itemIndex}`}
            className="text-sm cursor-pointer font-medium text-gray-900 flex items-center"
          >
            <Users className="h-3 w-3 mr-1" />
            Todos os Clientes
          </Label>
        </div>
        
        {/* Divisor */}
        <div className="border-t border-gray-200 my-2" />
        
        {/* Checkboxes individuais */}
        <div className="grid grid-cols-2 gap-2">
          {locations.map(location => (
            <div 
              key={location.id} 
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Checkbox
                id={`location-${location.id}-${categoryId}-${itemIndex}`}
                checked={locationSelection.isLocationSelected(item.locations, location.id)}
                onCheckedChange={(checked) => 
                  onLocationChange(location.id, checked)
                }
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label 
                htmlFor={`location-${location.id}-${categoryId}-${itemIndex}`}
                className="text-xs cursor-pointer text-gray-700 truncate"
                title={location.name}
              >
                {location.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}