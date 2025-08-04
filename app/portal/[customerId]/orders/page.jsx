// Required for static export with dynamic routes
export async function generateStaticParams() {
  return [];
}

// Import the mobile-optimized component
import MobileOrdersPage from "@/components/clientes/portal/MobileOrdersPage";

export default function CustomerOrderPage({ params }) {
  return <MobileOrdersPage customerId={params.customerId} />;
}
