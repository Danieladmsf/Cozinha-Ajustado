'use client';

import React from 'react';
import CustomerRegistrationForm from '@/components/clientes/portal/CustomerRegistrationForm';

export default function CustomerRegistrationPage({ params }) {
  return <CustomerRegistrationForm customerId={params.customerId} />;
}