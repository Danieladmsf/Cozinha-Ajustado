'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PortalDynamicPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Pega o customerId da URL atual
    const currentPath = window.location.pathname;
    const customerId = currentPath.split('/')[2]; // /portal/[customerId]
    
    if (customerId) {
      // Redireciona para a página do portal com o customerId
      router.replace(`/portal?customerId=${customerId}`);
    } else {
      // Se não tem customerId, vai para portal principal
      router.replace('/portal');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Carregando portal...</p>
      </div>
    </div>
  );
}
