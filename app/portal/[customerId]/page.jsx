// Required for static export with dynamic routes
export async function generateStaticParams() {
  return [];
}

import CustomerPortalRedirect from '@/components/clientes/portal/CustomerPortalRedirect';

export default function CustomerPortalPage({ params }) {
  return <CustomerPortalRedirect customerId={params.customerId} />;
}
