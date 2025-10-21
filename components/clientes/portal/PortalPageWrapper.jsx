'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/app/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Import the destination components
import CustomerRegistrationForm from './CustomerRegistrationForm';
import MobileOrdersPage from './MobileOrdersPage';

export default function PortalPageWrapper({ customerId }) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { toast } = useToast();

  const validateAndLoadCustomer = useCallback(async () => {
    if (!customerId) {
      setError("ID do cliente não fornecido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const customerData = await Customer.get(customerId);

      if (!customerData) {
        toast({
          title: "Cliente não encontrado",
          description: "Este portal não é válido.",
          variant: "destructive",
        });
        setError("Cliente não encontrado.");
        setLoading(false);
      } else {
        setCustomer(customerData);
        setLoading(false);
      }
    } catch (err) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do cliente.",
        variant: "destructive",
      });
      setError("Ocorreu um erro ao carregar os dados.");
      setLoading(false);
    }
  }, [customerId, toast]);

  useEffect(() => {
    validateAndLoadCustomer();
  }, [validateAndLoadCustomer]);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Erro</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return null; // Should be handled by error state
  }

  // Decide which component to render
  if (customer.pending_registration) {
    return <CustomerRegistrationForm customerId={customerId} customerData={customer} onRegistrationComplete={validateAndLoadCustomer} />;
  } else {
    return <MobileOrdersPage customerId={customerId} customerData={customer} />;
  }
}
