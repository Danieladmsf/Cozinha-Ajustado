/**
 * Hook para validação centralizada de clientes no portal
 */
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/app/api/entities';
import { useToast } from '@/components/ui/use-toast';

export const useCustomerValidation = () => {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const router = useRouter();
  const { toast } = useToast();

  const validateAndLoadCustomer = useCallback(async (customerId) => {
    if (!customerId) {
      router.push('/');
      return null;
    }

    setLoading(true);
    try {
      const customerData = await Customer.get(customerId);
      
      if (!customerData) {
        toast({
          title: "Cliente não encontrado",
          description: "Este portal não é válido.",
          variant: "destructive"
        });
        router.push('/');
        return null;
      }

      setCustomer(customerData);
      return customerData;
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do cliente.",
        variant: "destructive"
      });
      router.push('/');
      return null;
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  const redirectBasedOnRegistration = useCallback((customerData, customerId) => {
    if (!customerData) return;
    
    if (customerData.pending_registration) {
      router.push(`/portal/${customerId}/cadastro`);
    } else {
      router.push(`/portal/${customerId}/orders`);
    }
  }, [router]);

  return {
    loading,
    customer,
    validateAndLoadCustomer,
    redirectBasedOnRegistration
  };
};