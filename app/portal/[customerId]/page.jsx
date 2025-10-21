
import PortalPageWrapper from '@/components/clientes/portal/PortalPageWrapper';

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // This can be left empty if you are not pre-rendering any specific customer portals at build time.
  return [];
}

export default function CustomerPortalPage({ params }) {
  return <PortalPageWrapper customerId={params.customerId} />;
}
