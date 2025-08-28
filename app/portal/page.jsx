'use client';

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChefHat, AlertCircle, Key } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Página principal do portal - permite inserir ID do cliente manualmente
 */
export default function PortalIndex() {
  
  const router = useRouter();
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [error, setError] = useState('');

  

  const handleAccessPortal = () => {
    const cleanId = customerIdInput.trim();
    
    if (!cleanId) {
      setError('Por favor, insira o ID do cliente.');
      return;
    }

    // Validação básica do formato do ID
    if (cleanId.length < 3) {
      setError('ID do cliente muito curto.');
      return;
    }

    router.push(`/portal/${cleanId}`);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAccessPortal();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <ChefHat className="w-16 h-16 mx-auto mb-6 text-blue-600" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Portal do Cliente
          </h1>
          <p className="text-gray-600 mb-6">
            Cozinha Afeto
          </p>

          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID do Cliente
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  value={customerIdInput}
                  onChange={(e) => {
                    setCustomerIdInput(e.target.value);
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite seu ID do cliente"
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Button 
              onClick={handleAccessPortal}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!customerIdInput.trim()}
            >
              Acessar Portal
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t text-xs text-gray-500">
            <p>
              Se você não possui seu ID do cliente,<br />
              entre em contato conosco.
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-left">
              <strong>Desenvolvimento:</strong><br/>
              Exemplos de IDs para teste:<br/>
              • temp-123456<br/>
              • customer-123<br/>
              • test-customer
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}