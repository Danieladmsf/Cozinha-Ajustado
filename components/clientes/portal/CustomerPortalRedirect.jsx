'use client';

import React, { useEffect } from 'react';
import { useCustomerValidation } from '@/hooks/portal/useCustomerValidation';
import { LoadingCard } from '@/components/common/LoadingCard';

export default function CustomerPortalRedirect({ customerId }) {
  const { loading, validateAndLoadCustomer, redirectBasedOnRegistration } = useCustomerValidation();

  useEffect(() => {
    const checkCustomerAndRedirect = async () => {
      const customer = await validateAndLoadCustomer(customerId);
      if (customer) {
        redirectBasedOnRegistration(customer, customerId);
      }
    };

    if (customerId) {
      checkCustomerAndRedirect();
    }
  }, [customerId, validateAndLoadCustomer, redirectBasedOnRegistration]);

  if (loading) {
    return <LoadingCard message="Verificando seu acesso..." />;
  }

  return null;
}