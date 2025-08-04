import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Customer } from "@/app/api/entities";
import { ChefHat, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Middleware de autenticação para o portal do cliente
 * Valida acesso e redireciona se necessário
 */
export default function ClientAuthMiddleware({ children, customerId, requiredAccess = "basic" }) {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessLevel, setAccessLevel] = useState(null);
  const [clientUrl, setClientUrl] = useState('Loading...');

  useEffect(() => {
    if (customerId) {
      validateCustomerAccess();
    } else {
      setError("ID do cliente não fornecido");
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientUrl(window.location.href);
    }
  }, []);

  const validateCustomerAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se é um link temporário (novo cliente)
      if (customerId?.startsWith('temp-')) {
        setAccessLevel("temp");
        setLoading(false);
        return;
      }

      // Validar formato básico do ID do cliente
      if (!customerId || customerId === '[customerId]' || customerId.trim().length === 0) {
        setError("O link de acesso não é válido ou expirou");
        return;
      }

      // Buscar dados do cliente
      const customerData = await Customer.getById(customerId);
      
      if (!customerData) {
        setError("O link de acesso não é válido ou expirou");
        return;
      }

      // Validar status do cliente
      const isActive = customerData.active;
      const isPending = customerData.pending_registration;
      const isBlocked = customerData.blocked || customerData.suspended;

      if (isBlocked) {
        setError("Acesso bloqueado - cliente suspenso");
        return;
      }

      if (!isActive && !isPending) {
        setError("Acesso negado - cliente inativo");
        return;
      }

      // Determinar nível de acesso
      let level = "basic";
      if (isPending) {
        level = "pending";
      } else if (isActive) {
        level = "full";
        if (customerData.category === "vip") {
          level = "vip";
        }
      }

      // Verificar se o acesso requerido é compatível
      if (!hasRequiredAccess(level, requiredAccess)) {
        setError("Nível de acesso insuficiente");
        return;
      }

      setCustomer(customerData);
      setAccessLevel(level);

    } catch (error) {
      // Usar mensagem mais amigável para o usuário
      if (error.message?.includes('not found') || error.code === 'not-found') {
        setError("O link de acesso não é válido ou expirou");
      } else {
        setError("Erro na validação de acesso. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasRequiredAccess = (userLevel, requiredLevel) => {
    const levels = {
      "temp": 1,
      "pending": 2,
      "basic": 3,
      "full": 4,
      "vip": 5
    };

    return levels[userLevel] >= levels[requiredLevel];
  };

  const redirectToRegistration = () => {
    router.push(`/portal/${customerId}`);
  };

  const retryAccess = () => {
    validateCustomerAccess();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={retryAccess} variant="outline" className="w-full">
                Tentar Novamente
              </Button>
              {(error.includes("inativo") || error.includes("registro")) && (
                <Button onClick={redirectToRegistration} className="w-full">
                  Completar Cadastro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success - render children with customer context
  return children({ customer, accessLevel });
}

/**
 * Extrai o customerId da URL atual (compatível com static export)
 */
function extractCustomerIdFromUrl() {
  if (typeof window === 'undefined') return null;
  
  const pathname = window.location.pathname;
  
  // Para rotas como /portal/[customerId]
  const portalMatch = pathname.match(/\/portal\/([^/]+)$/);  
  if (portalMatch) {
    return portalMatch[1];
  }
  
  // Para rotas como /portal/orders/[customerId]
  const ordersMatch = pathname.match(/\/portal\/orders\/([^/]+)$/);
  if (ordersMatch) {
    return ordersMatch[1];
  }
  
  // Fallback: tentar extrair dos query params da URL
  const urlParams = new URLSearchParams(window.location.search);
  const customerIdParam = urlParams.get('customerId');
  if (customerIdParam) {
    return customerIdParam;
  }
  
  return null;
}

/**
 * Hook para usar dados do cliente autenticado (compatível com static export)
 */
export function useClientAuth() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(null);
  
  useEffect(() => {
    // Primeiro, tentar extrair da URL do navegador
    const urlCustomerId = extractCustomerIdFromUrl();
    
    // Se não conseguir da URL, tentar do router.query (funciona em dev)
    const routerCustomerId = router.query.customerId;
    
    const finalCustomerId = urlCustomerId || routerCustomerId;
    setCustomerId(finalCustomerId);
  }, [router.asPath, router.query.customerId]);

  return {
    customerId,
    isValidId: customerId && (typeof customerId === 'string') && customerId !== '[customerId]',
    isTemporaryId: customerId?.startsWith('temp-'),
    redirectToOrders: () => {
      if (customerId) {
        router.push(`/portal/orders/${customerId}`);
      }
    },
    redirectToProfile: () => {
      if (customerId) {
        router.push(`/portal/${customerId}`);
      }
    }
  };
}

/**
 * Componente de proteção de rota para páginas do portal
 */
export function ProtectedPortalRoute({ children, requiredAccess = "basic" }) {
  const { customerId, isValidId } = useClientAuth();
  const [clientUrl, setClientUrl] = useState('Loading...');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClientUrl(window.location.href);
    }
  }, []);

  // Debug info removido para produção

  if (!isValidId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <ChefHat className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Link Inválido</h2>
            <p className="text-gray-600 mb-4">O link de acesso não é válido ou expirou.</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-left bg-gray-100 p-3 rounded mt-4">
                <strong>Debug Info:</strong><br/>
                CustomerId: {customerId || 'null'}<br/>
                IsValid: {String(isValidId)}<br/>
                URL: {clientUrl}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ClientAuthMiddleware customerId={customerId} requiredAccess={requiredAccess}>
      {children}
    </ClientAuthMiddleware>
  );
}

/**
 * Utilitários para validação de acesso
 */
export const AccessUtils = {
  /**
   * Verifica se o cliente pode fazer pedidos
   */
  canMakeOrders: (customer, accessLevel) => {
    return customer && 
           (accessLevel === "full" || accessLevel === "vip") && 
           customer.active && 
           !customer.blocked;
  },

  /**
   * Verifica se o cliente pode editar perfil
   */
  canEditProfile: (customer, accessLevel) => {
    return customer && 
           (accessLevel === "pending" || accessLevel === "full" || accessLevel === "vip");
  },

  /**
   * Verifica se o cliente pode ver histórico
   */
  canViewHistory: (customer, accessLevel) => {
    return customer && 
           (accessLevel === "full" || accessLevel === "vip") && 
           customer.active;
  },

  /**
   * Obtém as permissões do cliente
   */
  getPermissions: (customer, accessLevel) => {
    return {
      makeOrders: AccessUtils.canMakeOrders(customer, accessLevel),
      editProfile: AccessUtils.canEditProfile(customer, accessLevel),
      viewHistory: AccessUtils.canViewHistory(customer, accessLevel),
      isVip: accessLevel === "vip",
      isPending: accessLevel === "pending",
      isTemporary: accessLevel === "temp"
    };
  }
};