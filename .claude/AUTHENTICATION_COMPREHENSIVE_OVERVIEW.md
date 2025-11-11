# Cozinha Afeto - Complete Authentication System Overview

## Quick Summary

The Cozinha Afeto application uses **Firebase Authentication and Firestore** but is currently in **DEVELOPMENT MODE** with:
- Hardcoded mock user IDs (`'mock-user-id'`)
- Permissive Firestore security rules (public read/write)
- NO authentication enforcement on any routes
- Customer portal using ID-based access (no password)
- All routes and API endpoints publicly accessible

**Status**: NOT PRODUCTION READY - Requires authentication implementation before deployment.

---

## Table of Contents

1. [Authentication Architecture](#authentication-architecture)
2. [Key Components & Files](#key-components--files)
3. [Authentication Flow](#authentication-flow)
4. [Protected Routes Implementation](#protected-routes-implementation)
5. [User State Management](#user-state-management)
6. [Portal Access Pattern](#portal-access-pattern)
7. [API Endpoints & Security](#api-endpoints--security)
8. [Firestore Security Rules](#firestore-security-rules)
9. [Authentication Middleware](#authentication-middleware)
10. [Current Vulnerabilities](#current-vulnerabilities)
11. [Implementation Roadmap](#implementation-roadmap)

---

## Authentication Architecture

### Technology Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| **Auth Method** | Firebase Authentication (Auth) | Initialized, Not Enforced |
| **Database** | Firebase Firestore | Active |
| **Storage** | Firebase Storage | Active |
| **SDK Version** | firebase v12.0.0 | Latest |
| **Admin SDK** | firebase-admin v13.4.0 | Configured |
| **Session** | localStorage/sessionStorage | Dev Only |

### Firebase Project Details

- **Project ID in Config**: `psabordefamilia-2167e`
- **Auth Domain**: `psabordefamilia-2167e.firebaseapp.com`
- **Firestore Project**: `cozinha-e-afeto` (from `.firebaserc`)
- **Storage Bucket**: `psabordefamilia-2167e.firebasestorage.app`
- **Configuration File**: `/home/user/studio/lib/firebase.js`

### Authentication Strategy

Currently uses **NO ENFORCED AUTHENTICATION**. The application:
1. Initializes Firebase Auth (not using it)
2. Stores user data in Firestore
3. Uses hardcoded user ID for all operations
4. Allows portal access via customer ID only

---

## Key Components & Files

### 1. Firebase Initialization

**File**: `/home/user/studio/lib/firebase.js`

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

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);
export const storage = getStorage(app);
```

**Key Points**:
- Auth, Firestore, and Storage are initialized
- Offline persistence with multi-tab cache enabled
- Configuration is public (no secrets exposed here, keys are frontend-safe)

### 2. User Entity & Mock Authentication

**File**: `/home/user/studio/app/api/entities.js` (Lines 354-447)

**Critical Issue**: Uses hardcoded mock user ID throughout:

```javascript
export const User = {
  // Get current user data - No authentication required
  me: async () => {
    return new Promise((resolve, reject) => {
      // Return mock user data for development without authentication
      resolve({
        id: 'mock-user-id',
        email: 'dev@cozinhaafeto.com',
        displayName: 'Usuário de Desenvolvimento',
        photoURL: null
      });
    });
  },

  // Get user data - Load from Firestore
  getMyUserData: async () => {
    try {
      const userId = 'mock-user-id'; // Em produção, pegar do usuário autenticado
      
      const userData = await UserEntity.getById(userId);
      return userData;
    } catch (error) {
      return null;
    }
  },

  // Update user data - Save to Firestore
  updateMyUserData: async (userData) => {
    try {
      const userId = 'mock-user-id'; // Em produção, pegar do usuário autenticado
      
      // Primeiro, tenta buscar o usuário existente
      let existingUser = null;
      try {
        existingUser = await UserEntity.getById(userId);
      } catch (error) {
      }
      
      if (existingUser) {
        const updatedData = {
          ...existingUser,
          ...userData,
          updatedAt: new Date()
        };
        await UserEntity.update(userId, updatedData);
      } else {
        const newUserData = {
          id: userId,
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const docRef = doc(db, 'User', userId);
        await setDoc(docRef, newUserData);
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

**Problems Identified**:
- All user IDs hardcoded as `'mock-user-id'`
- Multiple comments stating "Em produção, pegar do usuário autenticado" (Production: get from authenticated user)
- No actual Firebase Auth integration
- Same user data for all visitors

### 3. User API Endpoint

**File**: `/home/user/studio/app/api/user/route.js`

```javascript
import { User } from '@/app/api/entities';
import { NextResponse } from 'next/server';

// GET /api/user - Buscar dados do usuário
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

// PUT /api/user - Atualizar dados do usuário
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

// POST /api/user/config - Salvar configuração específica
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

**Issues**:
- NO authentication check on any method
- Accepts requests from anyone
- Always operates on the same hardcoded user

### 4. Middleware

**File**: `/home/user/studio/middleware.js`

```javascript
import { NextResponse } from 'next/server'

export function middleware(request) {
  const response = NextResponse.next()

  // Configurar headers de segurança e performance
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Desabilitar recursos desnecessários
  response.headers.set(
    'Feature-Policy',
    'camera \'none\'; microphone \'none\'; geolocation \'none\'; usb \'none\'; serial \'none\'; hid \'none\''
  )

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
```

**Current State**:
- Only sets security headers
- NO authentication or authorization checks
- Excludes API routes and Next.js resources
- All routes pass through without verification

---

## Authentication Flow

### Current Flow (Development Mode)

```
User visits /dashboard or any route
         ↓
middleware.js runs
    ↓
Sets security headers only
    ↓
No auth check → request continues
         ↓
Component/API uses hardcoded 'mock-user-id'
         ↓
Firestore allows read/write (permissive rules)
         ↓
Full access granted to all data
```

### Expected Flow (Production)

```
User visits /dashboard
         ↓
middleware checks Authorization header
         ↓
If no token → Redirect to /login
         ↓
User enters credentials on /login
         ↓
Firebase Auth.signInWithEmailAndPassword()
         ↓
Gets ID token from Firebase
         ↓
Token stored in secure HTTP-only cookie
         ↓
Subsequent requests include token
         ↓
middleware verifies token with Firebase
         ↓
Request proceeds with authenticated user's UID
         ↓
Firestore rules check request.auth.uid
         ↓
Access granted/denied based on rules
```

---

## Protected Routes Implementation

### Current Route Structure

**Internal/Admin Routes** (Should require authentication):
- `/dashboard` - Main dashboard
- `/receitas` - Recipe management
- `/ficha-tecnica` - Technical sheets
- `/cardapio` - Menu/pricing management
- `/programacao` - Kitchen programming/scheduling
- `/pedidos` - Orders management
- `/ingredientes` - Ingredients management
- `/categorias` - Categories management
- `/fornecedores-e-servicos` - Suppliers & services
- `/clientes` - Customers management
- `/contas` - Accounts/bills
- `/fechamento` - Weekly closing
- `/tabela-nutricional` - Nutrition table
- `/analise-de-receitas` - Recipe analysis
- `/confìgurar-cardapio` - Menu configuration
- `/sobras` - Waste management

**Public/Portal Routes** (Limited access):
- `/portal` - Customer portal entry
- `/portal/[customerId]` - Customer-specific portal
- `/portal/[customerId]/cadastro` - Customer registration
- `/portal/[customerId]/orders` - Customer orders

### Route Access Matrix

| Route | Intended Access | Current Access | Protection |
|-------|---|---|---|
| `/dashboard` | Authenticated users | PUBLIC | None |
| `/receitas` | Authenticated users | PUBLIC | None |
| `/portal` | Anyone with ID | PUBLIC | None |
| `/portal/[id]` | Registered customers | PUBLIC | Basic validation |
| `/api/*` | Authenticated requests | PUBLIC | None |

---

## User State Management

### Session Storage Methods

The application uses multiple storage mechanisms:

#### 1. localStorage (Persistent)
- Portal sessions: `sessionKey = 'portal_sessions_${customerId}'`
- UI state: sidebar collapse status
- Conflict resolution snapshots for sync

#### 2. sessionStorage (Tab-specific)
- Pre-preparation expanded states
- Temporary UI state

#### 3. Firestore (Server)
- User preferences and configuration
- Stored in `User` collection with ID `'mock-user-id'`
- Includes `recipe_config` for user settings

#### 4. Browser Memory (React State)
- Component-level state
- Auth context (when implemented)

### User Data Structure

**Firestore Collection**: `User`

**Document ID**: `'mock-user-id'` (hardcoded)

**Document Structure**:
```javascript
{
  id: 'mock-user-id',
  email: 'dev@cozinhaafeto.com',
  displayName: 'Usuário de Desenvolvimento',
  photoURL: null,
  preferences: {
    theme: 'light',
    notifications: true
  },
  recipe_config: {
    // User's recipe configuration settings
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Configuration Management

**File**: `/home/user/studio/hooks/ficha-tecnica/useRecipeConfig.js`

User recipe configurations are saved to `/api/user?type=recipe-config` endpoint which stores them in the `recipe_config` field of the user document.

---

## Portal Access Pattern

### Portal Entry

**File**: `/home/user/studio/app/portal/page.jsx`

The portal allows customers to access their data by entering a customer ID:

```javascript
const handleAccessPortal = () => {
  const cleanId = customerIdInput.trim();
  
  if (!cleanId) {
    setError('Por favor, insira o ID do cliente.');
    return;
  }

  // Validação básica do formato do ID
  if (cleanId.length < 3) {
    setError('ID do cliente muito curto.');
    return;
  }

  router.push(`/portal/${cleanId}`);
};
```

**Security Issues**:
- No password required
- Customer ID can be guessed (just 3+ characters)
- IDs visible in URL
- Development examples shown: `temp-123456`, `customer-123`, `test-customer`

### Portal Wrapper & Validation

**File**: `/home/user/studio/components/clientes/portal/PortalPageWrapper.jsx`

```javascript
const validateAndLoadCustomer = useCallback(async () => {
  if (!customerId) {
    setError("ID do cliente não fornecido.");
    setLoading(false);
    return;
  }

  setLoading(true);
  try {
    const customerData = await Customer.get(customerId);

    if (!customerData) {
      toast({
        title: "Cliente não encontrado",
        description: "Este portal não é válido.",
        variant: "destructive",
      });
      setError("Cliente não encontrado.");
      setLoading(false);
    } else {
      setCustomer(customerData);
      setLoading(false);
    }
  } catch (err) {
    setError("Ocorreu um erro ao carregar os dados.");
    setLoading(false);
  }
}, [customerId, toast]);
```

**Portal Flow**:
1. Customer enters ID on `/portal`
2. Navigates to `/portal/[customerId]`
3. System fetches customer from Firestore
4. If `pending_registration === true` → Shows `CustomerRegistrationForm`
5. If `pending_registration === false` → Shows `MobileOrdersPage`

### Portal Authentication

**File**: `/home/user/studio/components/clientes/portal/ClientAuthMiddleware.jsx`

Provides validation for portal access with access levels:

```javascript
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
```

**Access Levels**:
- `temp` - Temporary link for new customers
- `pending` - Incomplete registration
- `basic` - Basic access
- `full` - Full access
- `vip` - VIP customer access

**Access Control Functions**:
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
}
```

### Customer Registration Form

**File**: `/home/user/studio/components/clientes/portal/CustomerRegistrationForm.jsx`

Allows customers to complete their profile with:
- Photo upload to Firebase Storage
- Name (required)
- Company, CNPJ, phone, email
- Address
- Category selection
- Notes

On submission:
```javascript
const updateData = {
  ...formData,
  photo: uploadedPhotoUrl,
  pending_registration: false, // Mark as completed
  notes: formData.notes || "Cadastro completado pelo cliente via portal"
};

await Customer.update(customerId, updateData);
```

---

## API Endpoints & Security

### User API Routes

**Base**: `/api/user`

| Endpoint | Method | Purpose | Auth | Status |
|----------|--------|---------|------|--------|
| `/api/user` | GET | Get user data | None | Public |
| `/api/user` | PUT | Update user data | None | Public |
| `/api/user?type=recipe-config` | POST | Save recipe config | None | Public |

### Recipe API Routes

**Base**: `/api/recipes`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/recipes` | GET | List recipes |
| `/api/recipes` | POST | Create recipe |
| `/api/recipes/upload` | POST | Bulk recipe upload |

### Ingredients API

**Base**: `/api/ingredients`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ingredients` | GET | List ingredients |
| `/api/ingredients` | POST | Create ingredient |

### Other API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/category-tree` | GET | Category hierarchy |
| `/api/category-types` | GET | Category types |
| `/api/upload` | POST | File upload to Storage |
| `/api/populate` | POST | Populate test data |
| `/api/populate` | GET | Check population status |

### API Authentication Status

**Critical Issue**: All API endpoints lack authentication verification.

No endpoint checks:
- Authorization headers
- Firebase ID tokens
- User identity
- Firestore permissions

---

## Firestore Security Rules

**File**: `/home/user/studio/firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Regras para impressaoProgramacao
    match /impressaoProgramacao/{docId} {
      // Permitir leitura para todos (permite usuários anônimos)
      allow read: if true;

      // Permitir escrita para todos (desenvolvimento)
      // TODO: Em produção, adicionar validação de autenticação
      allow create, update: if true;

      // Não permitir deletar (apenas admins podem fazer via console)
      allow delete: if false;

      // Sub-coleção de presença de edição
      match /editingPresence/{userId} {
        // Permitir leitura para todos
        allow read: if true;
        // Permitir escrita/delete para qualquer um (desenvolvimento)
        // TODO: Em produção, validar que userId corresponde ao usuário
        allow write, delete: if true;
      }
    }

    // Regras para pedidos (já existentes, manter como estão)
    match /pedidos/{docId} {
      // Permitir leitura para todos (desenvolvimento)
      allow read: if true;
      // Permitir escrita para todos (desenvolvimento)
      allow write: if true;
    }
  }
}
```

### Current Security Posture

**HIGHLY PERMISSIVE**:
- ✓ All collections readable by anyone
- ✓ All collections writable by anyone
- ✗ No authentication required
- ✗ No user identification
- ✗ No document-level security
- ✗ No role-based access

### Collections in Firestore

From `/home/user/studio/app/api/entities.js`:

```javascript
export const BillPayment = createEntity('BillPayment');
export const Brand = createEntity('Brand');
export const Category = createEntity('Category');
export const CategoryTree = createEntity('CategoryTree');
export const CategoryType = createEntity('CategoryType');
export const Customer = createEntity('Customer');
export const Ingredient = createEntity('Ingredient');
export const MenuCategory = createEntity('MenuCategory');
export const MenuConfig = createEntity('MenuConfig');
export const MenuLocation = createEntity('MenuLocation');
export const MenuNote = createEntity('MenuNote');
export const NutritionCategory = createEntity('NutritionCategory');
export const NutritionFood = createEntity('NutritionFood');
export const Order = createEntity('Order');
export const OrderReceiving = createEntity('OrderReceiving');
export const OrderWaste = createEntity('OrderWaste');
export const PriceHistory = createEntity('PriceHistory');
export const Recipe = createEntity('Recipe');
export const RecipeIngredient = createEntity('RecipeIngredient');
export const RecipeNutritionConfig = createEntity('RecipeNutritionConfig');
export const RecipeProcess = createEntity('RecipeProcess');
export const RecurringBill = createEntity('RecurringBill');
export const Supplier = createEntity('Supplier');
export const UserNutrientConfig = createEntity('UserNutrientConfig');
export const VariableBill = createEntity('VariableBill');
export const WeeklyMenu = createEntity('WeeklyMenu');
export const AppSettings = createEntity('AppSettings');
export const UserEntity = createEntity('User');
```

**All 26+ collections are publicly accessible.**

---

## Authentication Middleware

### Current Middleware

**File**: `/home/user/studio/middleware.js`

Currently only handles security headers, not authentication.

### Needed Middleware

For production, middleware should:

1. Check for authentication token
2. Verify token with Firebase
3. Extract user ID from token
4. Attach user info to request
5. Redirect unauthenticated users to login
6. Enforce rate limiting

Example implementation:
```javascript
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes = [
  '/dashboard',
  '/receitas',
  '/ficha-tecnica',
  '/api/user',
  '/api/recipes'
];

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  // Check if route needs protection
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      // Verify token (implementation depends on auth method)
      const verified = await verifyToken(token);
      
      // Attach user info to request
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', verified.uid);
      
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      
      return response;
    } catch (err) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}
```

---

## Current Vulnerabilities

### Critical Issues (Must Fix Before Production)

1. **No Authentication Enforcement**
   - Any user can access any route
   - No login system
   - Hardcoded user ID for all operations
   - Severity: CRITICAL

2. **Permissive Firestore Rules**
   - All data accessible to anyone
   - No authentication checks
   - No authorization rules
   - Severity: CRITICAL

3. **No API Authentication**
   - API endpoints accept all requests
   - No token validation
   - No user context
   - Severity: CRITICAL

4. **Portal ID-Based Access**
   - No password required
   - Customer ID guessable
   - IDs visible in URLs
   - Severity: HIGH

5. **No Session Management**
   - localStorage used (insecure)
   - No session expiration
   - No CSRF protection
   - Severity: HIGH

### High Priority Issues

6. **Hardcoded API Keys**
   - Firebase config in client code (acceptable for web)
   - But no server-side restrictions

7. **No Rate Limiting**
   - API endpoints accept unlimited requests
   - No DDoS protection

8. **No Audit Logging**
   - No tracking of user actions
   - Can't detect unauthorized access

### Medium Priority Issues

9. **No Email Verification**
   - Portal customers not verified

10. **No Password Reset**
    - No way to recover account access

---

## Implementation Roadmap

### Phase 1: Authentication Context (Week 1)

**Goal**: Establish auth state management

1. Create `hooks/useAuth.js`:
   ```javascript
   'use client';
   import { createContext, useContext, useEffect, useState } from 'react';
   import { onAuthStateChanged, signOut } from 'firebase/auth';
   import { auth } from '@/lib/firebase';

   const AuthContext = createContext();

   export function AuthProvider({ children }) {
     const [user, setUser] = useState(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);

     useEffect(() => {
       const unsubscribe = onAuthStateChanged(auth, 
         (currentUser) => {
           setUser(currentUser);
           setLoading(false);
         },
         (err) => {
           setError(err.message);
           setLoading(false);
         }
       );

       return unsubscribe;
     }, []);

     const logout = async () => {
       await signOut(auth);
     };

     return (
       <AuthContext.Provider value={{ user, loading, error, logout }}>
         {children}
       </AuthContext.Provider>
     );
   }

   export function useAuth() {
     const context = useContext(AuthContext);
     if (!context) {
       throw new Error('useAuth must be used within AuthProvider');
     }
     return context;
   }
   ```

2. Update `app/layout.jsx` to wrap with `AuthProvider`

3. Create login page at `/login`

### Phase 2: Protected Routes (Week 2)

**Goal**: Implement route protection

1. Create `components/ProtectedRoute.jsx`
2. Create `components/Login.jsx`
3. Update middleware to check auth
4. Redirect unauthenticated users

### Phase 3: API Security (Week 3)

**Goal**: Secure API endpoints

1. Add token verification middleware
2. Update all endpoints to check auth
3. Implement permission checks
4. Add error handling

### Phase 4: Firestore Rules (Week 4)

**Goal**: Implement proper security rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only read/write their own user document
    match /User/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }

    // Customers can access their own customer doc
    match /Customer/{customerId} {
      allow read: if request.auth.uid == resource.data.owner_id;
      allow update: if request.auth.uid == resource.data.owner_id;
      allow create: if request.auth != null; // Only authenticated users
    }

    // Admin-only collections
    match /Recipe/{docId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }

    // Helper function
    function isAdmin() {
      return request.auth.token.admin == true;
    }
  }
}
```

### Phase 5: Portal Auth (Week 5)

**Goal**: Add proper portal authentication

1. Implement email/password registration
2. Add password verification
3. Implement password reset
4. Update portal access patterns

### Phase 6: Testing & Hardening (Week 6)

**Goal**: Verify security

1. Security testing
2. Penetration testing
3. Audit logging implementation
4. Rate limiting setup

---

## Key Files Reference Table

| Category | File | Purpose | Status |
|----------|------|---------|--------|
| **Config** | `lib/firebase.js` | Firebase initialization | Active |
| **Auth** | `app/api/entities.js` | User management | Mock |
| **API** | `app/api/user/route.js` | User endpoints | Unprotected |
| **Middleware** | `middleware.js` | Request handling | Headers only |
| **Portal** | `app/portal/page.jsx` | Portal entry | Unprotected |
| **Portal** | `components/clientes/portal/PortalPageWrapper.jsx` | Portal validation | Basic |
| **Portal** | `components/clientes/portal/ClientAuthMiddleware.jsx` | Access levels | Dev only |
| **Portal** | `components/clientes/portal/CustomerRegistrationForm.jsx` | Registration | Active |
| **Rules** | `firestore.rules` | Firestore security | Permissive |
| **Config** | `.firebaserc` | Firebase project | Set |
| **Config** | `firebase.json` | Firebase deployment | Set |

---

## Testing Checklist

### Current State (Should All Pass)
- [ ] Can access `/dashboard` without any credentials
- [ ] Can access `/portal/any-id` with any ID
- [ ] API endpoints accept requests without auth header
- [ ] User data always uses `'mock-user-id'`

### After Auth Implementation (Should All Pass)
- [ ] Cannot access `/dashboard` without valid token
- [ ] `/login` redirects authenticated users to `/dashboard`
- [ ] API endpoints reject requests without valid token
- [ ] User data uses actual authenticated user's UID
- [ ] Session expires after configured timeout
- [ ] Logout clears auth state and token
- [ ] Firestore denies unauthorized reads/writes
- [ ] Portal requires password, not just ID

---

## Development vs Production

### Development Features (Current)
- Hardcoded user IDs
- Permissive Firestore rules
- No login required
- Public API access
- Mock customer portal

### Production Requirements (Needed)
- Firebase Auth with email/password
- Strict Firestore rules based on auth
- Login/logout system
- Token-based API access
- Secure customer portal with passwords
- Rate limiting
- Audit logging
- Session management
- CSRF protection
- Email verification

---

## Summary & Next Actions

### Current State
The Cozinha Afeto application has Firebase infrastructure in place but **NO authentication enforcement**. All routes, APIs, and data are publicly accessible. This is suitable for development but dangerous for production.

### Immediate Actions (Before Any Production Use)
1. Implement AuthProvider and useAuth hook
2. Create login page
3. Add middleware authentication checks
4. Create protected route wrapper
5. Update Firestore rules

### Recommended Timeline
- Week 1-2: Basic authentication
- Week 3-4: API security and rules
- Week 5-6: Portal authentication
- Week 7: Testing and audit

### Contact Points for Implementation
- `/lib/firebase.js` - Firebase setup (ready to use)
- `app/api/entities.js` - User management (needs real auth)
- `middleware.js` - Request handling (needs auth checks)
- `firestore.rules` - Database security (needs hardening)
- `app/layout.jsx` - Root layout (needs AuthProvider)

---

**Last Updated**: November 6, 2025  
**Status**: DEVELOPMENT MODE - NOT PRODUCTION READY  
**Urgency**: HIGH - Implement before any production deployment  
**Documentation**: See `/home/user/studio/.claude/` for detailed analyses
