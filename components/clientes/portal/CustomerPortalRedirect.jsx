'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/app/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CustomerPortalRedirect({ customerId }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkCustomerAndRedirect();
  }, [customerId]);

  const checkCustomerAndRedirect = async () => {
    try {
      const customer = await Customer.get(customerId);
      
      if (!customer) {
        // Cliente não encontrado - redirecionar para página de erro ou 404
        router.push('/');
        return;
      }

      // Verificar se o cliente ainda está pendente de cadastro
      if (customer.pending_registration) {
        // Redirecionar para página de cadastro
        router.push(`/portal/${customerId}/cadastro`);
      } else {
        // Cliente já cadastrado - redirecionar para pedidos
        router.push(`/portal/${customerId}/orders`);
      }

    } catch (error) {
      // Em caso de erro, redirecionar para home
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Portal do Cliente
            </h2>
            <p className="text-gray-600">Verificando seu acesso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enquanto redireciona, mostrar tela vazia
  return null;
}