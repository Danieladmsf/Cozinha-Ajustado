'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Customer } from '@/app/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShoppingCart, User, ArrowLeft } from 'lucide-react';

export default function CustomerOrderPortal() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadCustomer();
  }, [params.customerId]);

  const loadCustomer = async () => {
    try {
      const customerData = await Customer.get(params.customerId);
      
      if (!customerData) {
        toast({
          title: "Cliente não encontrado",
          description: "Este portal não é válido.",
          variant: "destructive"
        });
        router.push('/');
        return;
      }

      // Se ainda está pendente de cadastro, redirecionar
      if (customerData.pending_registration) {
        router.push(`/portal/${params.customerId}/cadastro`);
        return;
      }

      setCustomer(customerData);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do cliente.",
        variant: "destructive"
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToRegistration = () => {
    router.push(`/portal/${params.customerId}/cadastro`);
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
            <p className="text-gray-600">Carregando portal...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return null; // Será redirecionado
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Portal de Pedidos
              </h1>
              <p className="text-gray-600 mt-1">
                Bem-vindo, {customer.name}!
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleBackToRegistration}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Editar Cadastro
            </Button>
          </div>
        </div>

        {/* Customer Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="font-medium">{customer.name}</p>
              </div>
              {customer.company && (
                <div>
                  <p className="text-sm text-gray-600">Empresa</p>
                  <p className="font-medium">{customer.company}</p>
                </div>
              )}
              {customer.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-sm text-gray-600">Telefone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Sistema de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Sistema de Pedidos em Desenvolvimento
              </h3>
              <p className="text-gray-600 mb-6">
                O sistema de pedidos online estará disponível em breve. 
                Por enquanto, entre em contato conosco para fazer seus pedidos.
              </p>
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Formas de entrar em contato:
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {customer.phone && (
                    <Button
                      onClick={() => {
                        const cleanNumber = customer.phone.replace(/\D/g, '');
                        const formattedNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`;
                        const message = encodeURIComponent(`Olá! Gostaria de fazer um pedido. Cliente: ${customer.name}`);
                        window.open(`https://wa.me/${formattedNumber}?text=${message}`, '_blank');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      WhatsApp
                    </Button>
                  )}
                  {customer.email && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = `mailto:${customer.email}?subject=Pedido - ${customer.name}`;
                      }}
                    >
                      Email
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}