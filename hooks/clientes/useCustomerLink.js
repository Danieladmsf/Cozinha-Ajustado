import { useState, useCallback } from 'react';
import { Customer } from '@/app/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { 
  generateCustomerPortalLink, 
  copyToClipboard, 
  formatCustomerDataForCreation 
} from '@/lib/customerLinkUtils';

export function useCustomerLink() {
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const { toast } = useToast();

  // Gerar URL do portal do cliente (usa função da lib)
  const generateCustomerLink = useCallback((customerId) => {
    return generateCustomerPortalLink(customerId);
  }, []);

  // Criar cliente com pre-cadastro
  const createCustomerWithLink = useCallback(async (customerName) => {
    if (!customerName.trim()) {
      toast({
        title: "Erro",
        description: "O nome do cliente é obrigatório.",
        variant: "destructive",
      });
      return null;
    }

    setIsCreatingLink(true);
    try {
      // Usar função da lib para formatar dados
      const customerData = formatCustomerDataForCreation({
        name: customerName,
        notes: "Cliente aguardando preenchimento via link"
      });

      const newCustomer = await Customer.create(customerData);
      
      // Gerar o link
      const link = generateCustomerLink(newCustomer.id);
      
      if (link) {
        const copySuccess = await copyToClipboard(link);
        
        if (copySuccess) {
          toast({
            title: "Cliente criado e link copiado",
            description: `Cliente "${customerName}" criado. Link copiado para a área de transferência.`,
          });
        } else {
          // Se falhar ao copiar, retorna o link para exibir no modal
          return { customer: newCustomer, link, needsManualCopy: true };
        }
      }

      return { customer: newCustomer, link, needsManualCopy: false };
      
    } catch (error) {
      toast({
        title: "Erro ao criar cliente",
        description: `Não foi possível criar o cliente. Detalhes: ${error.message || error}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreatingLink(false);
    }
  }, [toast, generateCustomerLink, copyToClipboard]);

  // Copiar link de cliente existente
  const copyExistingCustomerLink = useCallback(async (customer) => {
    if (!customer || !customer.id) {
      toast({
        title: "Erro",
        description: "ID do cliente não disponível.",
        variant: "destructive",
      });
      return { success: false };
    }

    const link = generateCustomerLink(customer.id);
    if (link) {
      const copySuccess = await copyToClipboard(link);
      
      if (copySuccess) {
        toast({
          title: "Link copiado",
          description: `Link do portal do cliente ${customer.name} copiado para a área de transferência.`,
        });
        return { success: true };
      } else {
        // Retorna o link para cópia manual
        return { success: false, link, needsManualCopy: true };
      }
    }
    
    return { success: false };
  }, [toast, generateCustomerLink, copyToClipboard]);

  return {
    isCreatingLink,
    generateCustomerLink,
    createCustomerWithLink,
    copyExistingCustomerLink,
    copyToClipboard
  };
}