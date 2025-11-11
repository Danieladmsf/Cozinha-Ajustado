# Cozinha Afeto - Authentication System Analysis

## Executive Summary

The Cozinha Afeto project uses **Firebase Authentication** as the primary authentication system, though the implementation is currently in a **development/mock state** without full user authentication enforcement. The system has two main parts:

1. **Admin Panel**: Main application with no active authentication
2. **Client Portal**: Uses a **Customer ID-based access control** system instead of user authentication

---

## 1. AUTHENTICATION SYSTEM OVERVIEW

### Authentication Type
- **Framework**: Firebase Auth (initialized but not actively enforced)
- **Database**: Firebase Firestore (for data persistence)
- **Current State**: Development mode - No production authentication

### Architecture
```
├── Frontend (Next.js 14 - App Router)
├── API Routes (Next.js)
├── Firebase Auth (Configured but not enforced)
├── Firebase Firestore (Primary database)
└── Client Portal (Custom Customer ID access)
```

---

## 2. FIREBASE CONFIGURATION

### Location
**File**: `/home/user/studio/lib/firebase.js`

### Setup Code
```javascript
import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAP_zieVJnXSLSNY8Iv1F7oYETA577r9YY",
  authDomain: "psabordefamilia-2167e.firebaseapp.com",
  databaseURL: "https://psabordefamilia-2167e-default-rtdb.firebaseio.com",
  projectId: "psabordefamilia-2167e",
  storageBucket: "psabordefamilia-2167e.firebasestorage.app",
  messagingSenderId: "372180651336",
  appId: "1:372180651336:web:f7a3a48d99e7db6974b77d"
};

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const storage = getStorage(app);
```

**Key Features**:
- Multi-tab persistence management
- Local caching optimized for Firestore 12.x
- Exports: `db`, `auth`, `storage`

---

## 3. ADMIN PANEL AUTHENTICATION (Main Application)

### Current Status
**NO ACTIVE AUTHENTICATION** - The admin panel is currently accessible without login/authentication checks.

### Implementation Details

#### Layout Structure
**File**: `/home/user/studio/app/layout.jsx`

- Uses `'use client'` directive (client-side rendering)
- Renders sidebar navigation with 14 main menu items
- Has conditional portal route handling
- No authentication checks or user context

#### Main Page
**File**: `/home/user/studio/app/page.jsx`

```javascript
import Dashboard from '@/components/dashboard/Dashboard';

export default function HomePage() {
  return <Dashboard />;
}
```

- Simple route to Dashboard component
- No auth protection

#### Navigation Component
**File**: `/home/user/studio/components/shared/navigation.jsx`

- Renders sidebar with navigation items
- No logout button or user profile menu
- No authentication state management

#### Middleware Configuration
**File**: `/home/user/studio/middleware.js`

```javascript
import { NextResponse } from 'next/server'

export function middleware(request) {
  const response = NextResponse.next()
  
  // Configurar headers de segurança e performance
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  // ... more security headers
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
```

- **Currently**: Only sets security headers
- **Does NOT**: Implement route protection or authentication checks
- **TODO**: Should protect admin routes from unauthorized access

### Recommended Auth Implementation for Admin Panel
- [ ] Add Firebase `onAuthStateChanged()` listener
- [ ] Create protected route wrapper
- [ ] Implement login/logout pages
- [ ] Add user context provider
- [ ] Protect API routes

---

## 4. CLIENT PORTAL AUTHENTICATION

### Access Control Mechanism
The client portal uses **Customer ID-based access control** instead of user authentication.

### Portal Structure
```
/portal                           → Entry point
├── /portal/[customerId]         → Customer profile/registration
├── /portal/[customerId]/orders  → Customer orders
└── /portal/page.jsx            → ID input form
```

### Component Hierarchy

#### 1. Portal Entry Page
**File**: `/home/user/studio/app/portal/page.jsx`

```javascript
export default function PortalIndex() {
  const router = useRouter();
  const [customerIdInput, setCustomerIdInput] = useState('');
  const [error, setError] = useState('');

  const handleAccessPortal = () => {
    const cleanId = customerIdInput.trim();
    
    if (!cleanId) {
      setError('Por favor, insira o ID do cliente.');
      return;
    }

    if (cleanId.length < 3) {
      setError('ID do cliente muito curto.');
      return;
    }

    router.push(`/portal/${cleanId}`);
  };
  
  return (
    // Form with customer ID input
  );
}
```

**Purpose**: Manual customer ID input
**Validation**: Basic length check (minimum 3 characters)

#### 2. Portal Page Wrapper
**File**: `/home/user/studio/components/clientes/portal/PortalPageWrapper.jsx`

```javascript
export default function PortalPageWrapper({ customerId }) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState(null);

  const validateAndLoadCustomer = useCallback(async () => {
    if (!customerId) {
      setError("ID do cliente não fornecido.");
      return;
    }

    setLoading(true);
    try {
      const customerData = await Customer.get(customerId);

      if (!customerData) {
        setError("Cliente não encontrado.");
      } else {
        setCustomer(customerData);
      }
    } catch (err) {
      setError("Ocorreu um erro ao carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  useEffect(() => {
    validateAndLoadCustomer();
  }, [validateAndLoadCustomer]);

  // Route based on registration status
  if (customer?.pending_registration) {
    return <CustomerRegistrationForm />;
  } else {
    return <MobileOrdersPage />;
  }
}
```

**Key Responsibilities**:
- Validates customer ID exists in Firestore
- Loads customer data from `Customer` collection
- Routes to registration form if pending
- Routes to orders page if registered

#### 3. Client Authentication Middleware
**File**: `/home/user/studio/components/clientes/portal/ClientAuthMiddleware.jsx`

This is the **PRIMARY authentication component** for the client portal. It provides:

**Main Component**: `ClientAuthMiddleware`

```javascript
export default function ClientAuthMiddleware({ 
  children, 
  customerId, 
  requiredAccess = "basic" 
}) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessLevel, setAccessLevel] = useState(null);

  useEffect(() => {
    if (customerId) {
      validateCustomerAccess();
    }
  }, [customerId]);

  const validateCustomerAccess = async () => {
    try {
      // Check for temporary ID
      if (customerId?.startsWith('temp-')) {
        setAccessLevel("temp");
        setLoading(false);
        return;
      }

      // Validate basic format
      if (!customerId || customerId === '[customerId]' || customerId.trim().length === 0) {
        setError("O link de acesso não é válido ou expirou");
        return;
      }

      // Fetch customer data
      const customerData = await Customer.getById(customerId);
      
      if (!customerData) {
        setError("O link de acesso não é válido ou expirou");
        return;
      }

      // Validate customer status
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

      // Determine access level
      let level = "basic";
      if (isPending) {
        level = "pending";
      } else if (isActive) {
        level = "full";
        if (customerData.category === "vip") {
          level = "vip";
        }
      }

      // Check required access
      if (!hasRequiredAccess(level, requiredAccess)) {
        setError("Nível de acesso insuficiente");
        return;
      }

      setCustomer(customerData);
      setAccessLevel(level);

    } catch (error) {
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

  if (loading) {
    return <LoadingUI />;
  }

  if (error) {
    return <ErrorUI error={error} />;
  }

  return children({ customer, accessLevel });
}
```

**Access Levels**:
1. **temp** (1): Temporary customer ID (format: `temp-xxx`)
2. **pending** (2): Customer awaiting registration completion
3. **basic** (3): Standard customer access
4. **full** (4): Fully registered, active customer
5. **vip** (5): VIP customer with extended access

**Validation Checks**:
- [ ] Valid customer ID format
- [ ] Customer exists in Firestore
- [ ] Customer not blocked/suspended
- [ ] Customer is active or pending registration
- [ ] Access level meets requirement

#### 4. Portal Hooks
**Export**: `useClientAuth()`

```javascript
export function useClientAuth() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(null);
  
  useEffect(() => {
    // Extract from browser URL first
    const urlCustomerId = extractCustomerIdFromUrl();
    
    // Fallback to router.query
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
```

**Export**: `ProtectedPortalRoute`

```javascript
export function ProtectedPortalRoute({ children, requiredAccess = "basic" }) {
  const { customerId, isValidId } = useClientAuth();
  
  if (!isValidId) {
    return <InvalidLinkUI />;
  }

  return (
    <ClientAuthMiddleware customerId={customerId} requiredAccess={requiredAccess}>
      {children}
    </ClientAuthMiddleware>
  );
}
```

**Export**: `AccessUtils`

```javascript
export const AccessUtils = {
  canMakeOrders: (customer, accessLevel) => {
    return customer && 
           (accessLevel === "full" || accessLevel === "vip") && 
           customer.active && 
           !customer.blocked;
  },

  canEditProfile: (customer, accessLevel) => {
    return customer && 
           (accessLevel === "pending" || accessLevel === "full" || accessLevel === "vip");
  },

  canViewHistory: (customer, accessLevel) => {
    return customer && 
           (accessLevel === "full" || accessLevel === "vip") && 
           customer.active;
  },

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
```

#### 5. Customer Registration Form
**File**: `/home/user/studio/components/clientes/portal/CustomerRegistrationForm.jsx`

- Form for pending customers to complete registration
- Collects: name, company, address, CNPJ, phone, email, category, notes
- File upload for customer photo
- Updates `pending_registration` to `false` on submission

---

## 5. API ROUTES & USER DATA

### User Endpoint
**File**: `/home/user/studio/app/api/user/route.js`

```javascript
// GET /api/user - Get user data
export async function GET(request) {
  try {
    const userData = await User.getMyUserData();
    return NextResponse.json(userData || {});
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get user data', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/user - Update user data
export async function PUT(request) {
  try {
    const userData = await request.json();
    const result = await User.updateMyUserData(userData);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user data', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/user - Save user config
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type === 'recipe-config') {
      const configData = await request.json();
      const result = await User.updateMyUserData({
        recipe_config: configData
      });
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid config type' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save config', details: error.message },
      { status: 500 }
    );
  }
}
```

### User Entity
**File**: `/home/user/studio/app/api/entities.js`

```javascript
export const User = {
  // Development: Returns mock user data (no auth required)
  me: async () => {
    return new Promise((resolve, reject) => {
      resolve({
        id: 'mock-user-id',
        email: 'dev@cozinhaafeto.com',
        displayName: 'Usuário de Desenvolvimento',
        photoURL: null
      });
    });
  },

  // Load from Firestore using mock ID
  getMyUserData: async () => {
    try {
      const userId = 'mock-user-id'; // In production: get from authenticated user
      const userData = await UserEntity.getById(userId);
      return userData;
    } catch (error) {
      return null;
    }
  },

  // Save to Firestore using mock ID
  updateMyUserData: async (userData) => {
    try {
      const userId = 'mock-user-id'; // In production: get from authenticated user
      
      let existingUser = null;
      try {
        existingUser = await UserEntity.getById(userId);
      } catch (error) {
        // User doesn't exist yet
      }
      
      if (existingUser) {
        await UserEntity.update(userId, userData);
      } else {
        const docRef = doc(db, 'User', userId);
        await setDoc(docRef, {
          id: userId,
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return {
        success: true,
        message: 'Dados do usuário salvos com sucesso no Firestore'
      };
    } catch (error) {
      throw new Error('Falha ao salvar configurações: ' + error.message);
    }
  }
};
```

---

## 6. FIRESTORE SECURITY RULES

### Current Rules
**File**: `/home/user/studio/firestore.rules`

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // impressaoProgramacao collection
    match /impressaoProgramacao/{docId} {
      // Allow read for everyone
      allow read: if true;

      // Allow write for everyone (development)
      // TODO: In production, add authentication validation
      allow create, update: if true;

      // Prevent deletion
      allow delete: if false;

      // Sub-collection for editing presence
      match /editingPresence/{userId} {
        allow read: if true;
        allow write, delete: if true;
      }
    }

    // Orders collection
    match /pedidos/{docId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

**Current State**: 
- Development/testing mode
- NO authentication enforcement
- All authenticated users can read/write
- No user-based access control

**TODO for Production**:
- [ ] Add `request.auth != null` checks
- [ ] Implement user-based access control
- [ ] Add role-based access (admin/customer)
- [ ] Validate customer ownership of resources
- [ ] Protect sensitive collections

---

## 7. DEPENDENCIES

From `package.json`:

```json
{
  "firebase": "^12.0.0",
  "firebase-admin": "^13.4.0",
  "next": "^14.2.31",
  "zustand": "^5.0.7"
}
```

**Key Libraries**:
- **firebase**: Client-side Firebase SDK (Auth, Firestore, Storage)
- **firebase-admin**: Server-side Firebase Admin SDK
- **zustand**: State management (if used for auth state)

**NOT USED**:
- NextAuth.js
- Context API for auth (no auth context found)
- Custom session management

---

## 8. CURRENT IMPLEMENTATION STATUS

### Admin Panel
- [x] Firebase initialized
- [ ] Login page
- [ ] Logout functionality
- [ ] Protected routes
- [ ] User context/state management
- [ ] Session persistence
- [ ] Role-based access control
- [ ] Auth state listener (onAuthStateChanged)

### Client Portal
- [x] Firebase initialized
- [x] Customer ID-based access control
- [x] Access level validation (temp, pending, basic, full, vip)
- [x] Customer data loading
- [x] Protected routes with access checking
- [x] Registration form
- [x] Permission utilities
- [ ] Email/password authentication
- [ ] Account recovery
- [ ] Session timeout

---

## 9. SECURITY GAPS & RECOMMENDATIONS

### Critical Issues
1. **No Admin Authentication**
   - Admin panel is completely open
   - Anyone can access `/dashboard`, `/receitas`, etc.
   - Recommendation: Implement Firebase Auth login

2. **Development Hardcoded User ID**
   - `User.getMyUserData()` uses hardcoded `'mock-user-id'`
   - No actual authentication happening
   - Recommendation: Replace with `getCurrentUser()` from Firebase Auth

3. **Insecure Firestore Rules**
   - All collections allow read/write without authentication
   - No user-based access control
   - Recommendation: Add proper security rules

4. **No Session Management**
   - No token refresh logic
   - No session timeout
   - Recommendation: Implement proper session handling

### Medium Priority Issues
1. No password reset functionality
2. No email verification
3. No account creation flow
4. No logout functionality
5. No user role management

### Recommendations
1. **Implement Admin Authentication**
   - Create login page with email/password
   - Use `signInWithEmailAndPassword()` from Firebase Auth
   - Store auth state in Context or Zustand
   - Protect routes with middleware

2. **Update User Entity**
   ```javascript
   export const User = {
     // Get currently authenticated user from Firebase
     getCurrentUser: async () => {
       return new Promise((resolve) => {
         const unsubscribe = onAuthStateChanged(auth, (user) => {
           unsubscribe();
           resolve(user);
         });
       });
     },

     // Update to use actual auth user
     getMyUserData: async () => {
       const user = await this.getCurrentUser();
       if (!user) throw new Error('Not authenticated');
       
       return await UserEntity.getById(user.uid);
     }
   };
   ```

3. **Update Firestore Rules**
   ```firestore
   match /users/{userId} {
     allow read: if request.auth.uid == userId;
     allow write: if request.auth.uid == userId;
   }

   match /recipes/{recipeId} {
     allow read: if request.auth != null;
     allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
   }
   ```

4. **Add Auth Middleware**
   ```javascript
   export function middleware(request) {
     // Check for auth token
     // Redirect to login if not authenticated
     // Allow public routes (portal, /api/public)
   }
   ```

---

## 10. FILE STRUCTURE SUMMARY

```
cozinha-afeto/
├── lib/
│   └── firebase.js                    # Firebase config & initialization
├── middleware.js                      # Request middleware (security headers only)
├── app/
│   ├── layout.jsx                     # Root layout (no auth)
│   ├── page.jsx                       # Home page (no auth)
│   ├── api/
│   │   ├── user/route.js             # User endpoints (mock auth)
│   │   └── entities.js                # Firestore entity helpers & User export
│   └── portal/
│       ├── page.jsx                   # Portal entry (customer ID input)
│       └── [customerId]/
│           ├── page.jsx               # Portal wrapper
│           ├── orders/
│           │   └── page.jsx           # Customer orders page
│           └── cadastro/
│               └── page.jsx           # Customer registration
├── components/
│   ├── shared/
│   │   └── navigation.jsx             # Sidebar navigation (no auth)
│   └── clientes/portal/
│       ├── ClientAuthMiddleware.jsx   # Portal auth middleware
│       ├── PortalPageWrapper.jsx      # Portal auth wrapper
│       ├── CustomerRegistrationForm.jsx
│       └── MobileOrdersPage.jsx
└── firestore.rules                    # Firestore security rules (no auth)
```

---

## 11. NEXT STEPS FOR PRODUCTION

1. **Phase 1**: Implement admin authentication
   - Create login/logout pages
   - Add auth state management
   - Update API routes to check auth
   - Protect routes with middleware

2. **Phase 2**: Enhance security
   - Update Firestore rules
   - Implement role-based access
   - Add email verification
   - Add session management

3. **Phase 3**: Client portal improvements
   - Add email/password login option
   - Implement password reset
   - Add session timeout
   - Improve security checks

4. **Phase 4**: Monitoring & logging
   - Add auth event logging
   - Implement audit trails
   - Add suspicious activity alerts
   - Monitor access patterns
