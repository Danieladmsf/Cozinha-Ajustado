# Authentication System Analysis - Cozinha Afeto

## Executive Summary

The Cozinha Afeto application implements a **hybrid authentication architecture** combining:
- **Firebase Authentication** (initialized but not actively used for login/logout flows)
- **Mock User System** (primary authentication mechanism for development)
- **Client Portal Access Control** (customer-based access with role-level permissions)
- **Anonymous Session Management** (for collaborative editing without login)

**Current Status**: The application is in **development mode** with authentication partially implemented. Production authentication requirements are documented with TODO comments throughout the codebase.

---

## 1. Authentication Architecture Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cozinha Afeto App                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
├─── Internal Portal (Dashboard & Admin) ─────────────────────────┤
│    └─ Mock User System (mock-user-id)                           │
│       └─ User Data stored in Firestore (User collection)        │
│       └─ API Routes: /api/user (GET/PUT/POST)                  │
│                                                                  │
├─── Client Portal (External Access) ─────────────────────────────┤
│    └─ Customer ID Based Access                                  │
│       ├─ URL Extraction: /portal/[customerId]                  │
│       ├─ ClientAuthMiddleware Component                         │
│       └─ Access Levels: temp, pending, basic, full, vip        │
│                                                                  │
├─── Collaborative Editing (Programação) ───────────────────────┤
│    └─ Anonymous User Sessions                                   │
│       ├─ localStorage: anonymous_user_id                       │
│       └─ Firebase: editingPresence sub-collection              │
│                                                                  │
└─ Firebase (Firestore + Auth) ────────────────────────────────────┘
   ├─ Database: Firestore (real-time data sync)
   ├─ Auth: Firebase Auth (initialized but minimal usage)
   └─ Storage: Firebase Storage (file uploads)
```

---

## 2. Key Files and Components

### Core Authentication Files

| File Path | Purpose | Type |
|-----------|---------|------|
| `/lib/firebase.js` | Firebase initialization and configuration | Configuration |
| `/app/api/entities.js` | User entity CRUD operations and mock user system | API Entity |
| `/app/api/user/route.js` | User data endpoints (GET/PUT/POST) | API Route |
| `/middleware.js` | HTTP headers and security headers | Middleware |
| `/firestore.rules` | Firebase Firestore access control rules | Security Rules |
| `/components/clientes/portal/ClientAuthMiddleware.jsx` | Client portal authentication wrapper | Component |
| `/components/clientes/portal/PortalPageWrapper.jsx` | Portal entry point and customer validation | Component |
| `/hooks/programacao/useImpressaoProgramacao.js` | Anonymous user session management | Hook |

### Supporting Files

| File Path | Purpose |
|-----------|---------|
| `/.firebaserc` | Firebase project configuration |
| `/firebase.json` | Firebase deployment configuration |
| `/firestore.indexes.json` | Firestore index definitions |
| `/lib/constants.js` | Application constants including `MOCK_USER_ID` |
| `/app/portal/page.jsx` | Portal landing page (manual ID entry) |
| `/app/portal/[customerId]/page.jsx` | Dynamic portal route |

---

## 3. Authentication Methods

### 3.1 Internal Portal Authentication (Mock User)

**Implementation**: Hardcoded mock user for development

**Location**: `/app/api/entities.js`

```javascript
// User entity with mock authentication
export const User = {
  me: async () => {
    return {
      id: 'mock-user-id',
      email: 'dev@cozinhaafeto.com',
      displayName: 'Usuário de Desenvolvimento',
      photoURL: null
    };
  },

  getMyUserData: async () => {
    const userId = 'mock-user-id'; // Em produção, pegar do usuário autenticado
    const userData = await UserEntity.getById(userId);
    return userData;
  },

  updateMyUserData: async (userData) => {
    const userId = 'mock-user-id';
    // Save to Firestore User collection
    await UserEntity.update(userId, userData);
  }
};
```

**User Storage**: Firestore `User` collection
**Default User ID**: `mock-user-id`

**API Endpoints**:
- `GET /api/user` - Fetch current user data
- `PUT /api/user` - Update user data
- `POST /api/user?type=recipe-config` - Save user configuration

### 3.2 Client Portal Authentication

**Type**: Customer ID-based access control (not password-protected)

**Flow**:
1. User visits `/portal` (landing page)
2. Enters or is provided a customer ID
3. System validates customer ID via `ClientAuthMiddleware`
4. Customer record is fetched from Firestore `Customer` collection
5. Access level is determined based on customer status

**Location**: `/components/clientes/portal/ClientAuthMiddleware.jsx`

**Access Validation Logic**:

```javascript
const hasRequiredAccess = (userLevel, requiredLevel) => {
  const levels = {
    "temp": 1,          // Temporary link for new customers
    "pending": 2,       // Pending registration
    "basic": 3,         // Basic access (not active)
    "full": 4,          // Full access (active)
    "vip": 5            // VIP customer
  };
  return levels[userLevel] >= levels[requiredLevel];
};
```

**Customer Status Checks**:
- `active`: Customer is active
- `pending_registration`: Customer is pending (registration form shown)
- `blocked` or `suspended`: Customer access denied
- `category`: "vip" or other categories affect access level

### 3.3 Anonymous Session Authentication (Collaborative Editing)

**Location**: `/hooks/programacao/useImpressaoProgramacao.js`

**Usage**: Allows anonymous users to edit "Programação" (programming/scheduling) without login

**Session Management**:

```javascript
// Create anonymous user ID on first visit
const anonymousId = localStorage.getItem('anonymous_user_id') 
  || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem('anonymous_user_id', anonymousId);

// Register presence in Firestore
const presenceDocRef = doc(db, 'impressaoProgramacao', docId, 'editingPresence', user.uid);
await setDoc(presenceDocRef, {
  userId: user.uid,
  userName: user.displayName || user.email,
  sessionId: sessionId.current,
  timestamp: serverTimestamp(),
  isEditing: true
});
```

**Features**:
- Real-time presence tracking
- Conflict detection (multiple editors)
- Automatic save to Firebase (500ms debounced)
- Session cleanup on page exit

### 3.4 Firebase Authentication (Initialized but Not Used)

**Location**: `/lib/firebase.js`

**Configuration**:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAP_zieVJnXSLSNY8Iv1F7oYETA577r9YY",
  authDomain: "psabordefamilia-2167e.firebaseapp.com",
  projectId: "psabordefamilia-2167e",
  storageBucket: "psabordefamilia-2167e.firebasestorage.app",
  messagingSenderId: "372180651336",
  appId: "1:372180651336:web:f7a3a48d99e7db6974b77d"
};

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const storage = getStorage(app);
```

**Status**: Initialized but Firebase Auth methods (`signIn`, `signOut`, `createUser`) are **not currently implemented** in the application.

---

## 4. Protected Routes and Access Control

### 4.1 Internal Routes (Dashboard)

**Protection Level**: None (all routes are public)

**Available Routes**:
- `/dashboard` - Main dashboard
- `/receitas` - Recipe management
- `/ficha-tecnica` - Technical specification sheets
- `/cardapio` - Menu management
- `/programacao` - Scheduling/Programming
- `/pedidos` - Orders (if accessible)
- `/ingredientes` - Ingredient management
- `/clientes` - Customer management
- `/contas` - Bill/Account management
- `/fechamento` - Weekly closing

**Middleware Protection**: None - routes are not protected at the middleware level

**Note**: All internal routes use `mock-user-id` for user context. To add protection, implement middleware authentication checks.

### 4.2 Portal Routes (Client Access)

**Protection Level**: Customer ID validation

**Route Structure**:
```
/portal                          - Landing page (manual entry)
/portal/[customerId]             - Customer registration or orders
/portal/[customerId]/cadastro    - Registration form
/portal/[customerId]/orders      - Order management
```

**Protection Implementation**: `ClientAuthMiddleware` component

**Access Control Components**:

1. **PortalPageWrapper** (`/components/clientes/portal/PortalPageWrapper.jsx`)
   - Validates customer ID
   - Loads customer data from Firestore
   - Determines which component to render

2. **ClientAuthMiddleware** (`/components/clientes/portal/ClientAuthMiddleware.jsx`)
   - Validates customer status
   - Checks permissions (active, blocked, suspended)
   - Returns error or renders content

3. **ProtectedPortalRoute** (wrapper component in ClientAuthMiddleware)
   - Ensures valid customer ID format
   - Provides customer context to children

**Example Usage**:
```jsx
<ProtectedPortalRoute requiredAccess="full">
  {(customer, accessLevel) => (
    <MobileOrdersPage customer={customer} accessLevel={accessLevel} />
  )}
</ProtectedPortalRoute>
```

### 4.3 Access Control Utilities

**Location**: `/components/clientes/portal/ClientAuthMiddleware.jsx`

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

---

## 5. Session Management

### 5.1 Internal Portal Sessions

**Storage**: Firestore `User` collection + localStorage (preferences)

**User Configuration Storage**:
```javascript
// User recipe preferences
const userData = {
  id: 'mock-user-id',
  recipe_config: {
    selected_category_type: 'refeicoes',
    // ... other config
  },
  createdAt: timestamp,
  updatedAt: timestamp
};
```

**Preferences in localStorage**:
- `print-preview-font-sizes` - Font size preferences
- `print-preview-page-order` - Page ordering for print
- `consolidacao-kitchen-format` - Kitchen consolidation format
- `resolved-conflicts-*` - Print preview conflict resolutions

### 5.2 Client Portal Sessions

**Storage Mechanism**: Firestore `Customer` collection

**Session Tracking** (in `MobileOrdersPage.jsx`):
```javascript
const sessionKey = `portal_sessions_${customerId}`;
const activeSessions = JSON.parse(localStorage.getItem(sessionKey) || '[]');

// Track active sessions for this customer
activeSessions.push({
  customerId: customerId,
  timestamp: Date.now(),
  sessionId: uuidv4()
});

localStorage.setItem(sessionKey, JSON.stringify(activeSessions));
```

### 5.3 Anonymous Collaborative Sessions

**Storage**: Firestore `impressaoProgramacao` sub-collection `editingPresence`

**Session Data**:
```javascript
{
  userId: 'anon_1730842600000_a1b2c3d4e5f6g7h8',
  userName: 'Usuário Anônimo',
  sessionId: 'timestamp_random',
  timestamp: serverTimestamp(),
  isEditing: true
}
```

**Heartbeat**: Updates every 30 seconds via `updateDoc`

**Cleanup**: Automatic on page unload via `beforeunload` event listener

**Presence Timeout**: Sessions considered inactive after 60 seconds of no updates

---

## 6. User Roles and Permissions

### 6.1 Internal Portal Roles

**Current Implementation**: Single role (mock user)

**Available Role**: `mock-user-id` (Developer/Admin)

**Permissions**:
- Full access to all features
- Create/read/update recipes
- Manage menu and scheduling
- View reports and analytics
- Manage customers and accounts

**Future Production Roles** (TODO - not yet implemented):
- Admin
- Kitchen Manager
- Chef
- Manager
- Customer

### 6.2 Client Portal Roles

**Based on Customer Access Levels**:

| Level | Name | Permissions |
|-------|------|-------------|
| `temp` | Temporary | View-only portal access |
| `pending` | Pending | Registration, edit profile |
| `basic` | Basic | Limited features, no orders |
| `full` | Full | Make orders, view history, edit profile |
| `vip` | VIP | All full permissions + priority |

**Customer Categories**:
- `vip` - VIP customer (enhanced access)
- `regular` - Regular customer
- Other custom categories

**Permission Checks**:

```javascript
// Can make orders
customer.active && 
(accessLevel === "full" || accessLevel === "vip") && 
!customer.blocked

// Can edit profile
accessLevel === "pending" || accessLevel === "full" || accessLevel === "vip"

// Can view history
customer.active && 
(accessLevel === "full" || accessLevel === "vip")
```

### 6.3 Anonymous Collaborative Roles

**Roles**: None - all anonymous users have equal permissions

**Permissions**:
- Read shared documents
- Edit with conflict detection
- Real-time presence visibility
- Auto-save functionality

---

## 7. Firestore Security Rules

**Location**: `/firestore.rules`

**Current Rules** (Development):

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // impressaoProgramacao - Collaborative editing data
    match /impressaoProgramacao/{docId} {
      allow read: if true;                    // All can read
      allow create, update: if true;          // All can write (DEV ONLY)
      allow delete: if false;                 // No one can delete
      
      // Editing presence tracking
      match /editingPresence/{userId} {
        allow read: if true;
        allow write, delete: if true;         // DEV ONLY
      }
    }

    // pedidos - Orders collection
    match /pedidos/{docId} {
      allow read: if true;                    // All can read (DEV)
      allow write: if true;                   // All can write (DEV)
    }
  }
}
```

**TODO Comments in Code**:
```
// TODO: Em produção, adicionar validação de autenticação
// TODO: Em produção, validar que userId corresponde ao usuário
```

**Security Concerns**:
- All collections are open for development
- No authentication checks
- No user-specific access control
- Must be hardened before production

**Production Security Checklist**:
- [ ] Add `request.auth != null` checks
- [ ] Validate `request.auth.uid` matches data ownership
- [ ] Implement role-based access control
- [ ] Add resource limits and rate limiting
- [ ] Enable audit logging

---

## 8. API Authentication

### 8.1 User API Endpoints

**Location**: `/app/api/user/route.js`

**Endpoints**:

1. **GET /api/user**
   - Fetch current user data
   - Response: User object or empty object
   - No authentication required (development)

2. **PUT /api/user**
   - Update user data
   - Body: JSON user data
   - Merges with existing user record

3. **POST /api/user?type=recipe-config**
   - Save user configuration
   - Body: Recipe configuration object
   - Saves to `user.recipe_config`

**Implementation**:
```javascript
export async function GET(request) {
  const userData = await User.getMyUserData();
  return NextResponse.json(userData || {});
}

export async function PUT(request) {
  const userData = await request.json();
  const result = await User.updateMyUserData(userData);
  return NextResponse.json(result);
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  if (type === 'recipe-config') {
    const configData = await request.json();
    const result = await User.updateMyUserData({ recipe_config: configData });
    return NextResponse.json(result);
  }
  
  return NextResponse.json({ error: 'Invalid config type' }, { status: 400 });
}
```

**Security**: 
- No API key validation
- No authentication headers required
- All requests are accepted (development)

### 8.2 Authentication Headers (Middleware)

**Location**: `/middleware.js`

**Security Headers Set**:
```javascript
response.headers.set('X-DNS-Prefetch-Control', 'on')
response.headers.set('X-XSS-Protection', '1; mode=block')
response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
response.headers.set(
  'Feature-Policy',
  'camera \'none\'; microphone \'none\'; geolocation \'none\''
)
```

**Matcher**: All routes except static assets and API routes

---

## 9. Token Management

**Current Status**: No token-based authentication implemented

### 9.1 Firebase Auth Tokens (Not Implemented)

Firebase Auth would provide:
- ID Token (JWT) - User identity
- Refresh Token - Token renewal
- Access Token - API authentication

**Where They Would Be Used**:
```javascript
// Not currently used, but would look like:
const user = auth.currentUser;
const token = await user.getIdToken();

// Send with API requests:
fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 9.2 Session Tokens (Not Implemented)

Could be implemented for:
- Client portal session validation
- API request authentication
- CSRF protection

### 9.3 Anonymous Session Tokens

Not traditional tokens, but uses:
- `localStorage` key: `anonymous_user_id`
- Format: `anon_${timestamp}_${randomString}`
- Persisted across page reloads for collaborative editing

---

## 10. Security Considerations

### 10.1 Current Security Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Hardcoded Firebase API key | Medium | `lib/firebase.js` | Exposed API key in client code (standard for client-side SDK) |
| All Firestore rules allow read/write | High | `firestore.rules` | Anyone can read/write all data |
| No API authentication | High | `app/api/user/route.js` | Unauthenticated API access |
| Mock user hardcoded | Medium | `app/api/entities.js` | No real user context |
| Customer ID is predictable | Medium | Client portal | Easy to brute-force customer IDs |
| No CSRF protection | High | All routes | Vulnerable to cross-site attacks |
| No input validation | High | API routes | SQL/NoSQL injection risk (Firestore) |
| Credentials in localStorage | Medium | Multiple files | XSS could steal session data |

### 10.2 Recommended Production Security

#### Authentication
- [ ] Implement proper user registration/login with Firebase Auth
- [ ] Use Firebase ID tokens for API authentication
- [ ] Implement refresh token rotation
- [ ] Add email verification
- [ ] Implement password reset flow

#### Authorization
- [ ] Add role-based access control (RBAC)
- [ ] Implement custom claims in Firebase tokens
- [ ] Add Firestore rules for user-specific data access
- [ ] Validate all requests server-side

#### Data Protection
- [ ] Enable Firestore encryption at rest
- [ ] Implement field-level encryption for sensitive data
- [ ] Add audit logging for data access
- [ ] Implement data retention policies

#### API Security
- [ ] Add API key validation or authentication
- [ ] Implement rate limiting
- [ ] Add request signing/validation
- [ ] Use HTTPS only
- [ ] Add CORS restrictions

#### Session Management
- [ ] Implement secure session tokens
- [ ] Add session timeouts
- [ ] Implement session binding to IP/device
- [ ] Add logout functionality to clear tokens

#### Frontend Security
- [ ] Add CSRF tokens
- [ ] Implement Content Security Policy (CSP)
- [ ] Add input sanitization
- [ ] Implement output encoding
- [ ] Add security headers

---

## 11. Entry Points for Authentication

### 11.1 Application Entry Point

**File**: `/app/layout.jsx`

**Flow**:
1. Root layout renders
2. Checks if route starts with `/portal` (client portal)
3. If internal route: renders dashboard layout with sidebar
4. If portal route: renders clean mobile layout
5. No authentication check at this level

**Code**:
```javascript
const isPortalRoute = pathname.startsWith('/portal');

if (isPortalRoute) {
  // Portal layout (clean, no sidebar)
  return <PortalLayout>{children}</PortalLayout>;
}

// Dashboard layout (with sidebar)
return <DashboardLayout>{children}</DashboardLayout>;
```

### 11.2 Internal Portal Entry Point

**Route**: `/`

**File**: `/app/page.jsx`

**Component**: `Dashboard`

**Flow**:
1. Renders dashboard directly
2. Uses mock user context automatically
3. No login required

### 11.3 Client Portal Entry Points

**Route 1**: `/portal` (landing page)
- **File**: `/app/portal/page.jsx`
- **Component**: Manual ID entry form
- **Input**: Customer ID text input
- **Action**: Navigate to `/portal/[customerId]`

**Route 2**: `/portal/[customerId]`
- **File**: `/app/portal/[customerId]/page.jsx`
- **Component**: `PortalPageWrapper`
- **Flow**:
  1. Extract customer ID from URL params
  2. Validate customer exists in Firestore
  3. If pending registration: show registration form
  4. If active: show orders page

**Route 3**: `/portal/[customerId]/cadastro` (registration)
- **Component**: `CustomerRegistrationForm`
- **Flow**: Registration form for new customers

**Route 4**: `/portal/[customerId]/orders`
- **Component**: `MobileOrdersPage`
- **Flow**: Orders, receiving, waste, and history management

---

## 12. Main Authentication Flow Diagram

### 12.1 Internal Portal (Dashboard)

```
User visits app
        ↓
    / layout.jsx checks route
   /
  ├─→ NOT /portal
  │        ↓
  │    RootLayout renders
  │        ↓
  │    Dashboard loaded
  │        ↓
  │    Mock user (mock-user-id)
  │        ↓
  │    Fetch user data: GET /api/user
  │        ↓
  │    Load from Firestore User collection
  │        ↓
  │    Render app with user context
  │        ↓
  │    User can access all features
```

### 12.2 Client Portal (Orders)

```
User visits /portal
        ↓
    Portal landing page
        ↓
    User enters customer ID
        ↓
    Navigate to /portal/[customerId]
        ↓
    PortalPageWrapper component
        ↓
    Fetch Customer from Firestore
        ↓
    ┌─────────────────────────────┐
    │ ClientAuthMiddleware checks:│
    ├─────────────────────────────┤
    │ - Customer exists?          │
    │ - Customer active/blocked?  │
    │ - Status: pending, active?  │
    │ - Determine access level    │
    └─────────────────────────────┘
        ↓
    ├─→ Error → Show error message
    │
    └─→ Success
        ├─→ pending_registration → Show registration form
        │                             ↓
        │                         User fills form
        │                             ↓
        │                         Update Customer record
        │                             ↓
        │                         Reload check
        │
        └─→ Active → Show MobileOrdersPage
                         ↓
                     Load menu, orders, etc.
                         ↓
                     User can make orders
```

### 12.3 Collaborative Editing (Programação)

```
User opens /programacao page
        ↓
    useImpressaoProgramacao hook initializes
        ↓
    Check Firebase auth.currentUser
        ├─→ Authenticated user
        │   └─ Use user.uid, displayName
        │
        └─→ No auth (Anonymous)
            ├─ Check localStorage for anonymous_user_id
            ├─ If not found: Generate new anonymous ID
            └─ Save to localStorage
        ↓
    Create editing presence in Firebase
        ├─ Path: impressaoProgramacao/{docId}/editingPresence/{userId}
        └─ Register with sessionId and timestamp
        ↓
    Subscribe to real-time updates
        ├─ Monitor other users editing
        └─ Lock UI if another user is editing
        ↓
    User makes edits
        ├─ Track changes in editedItems
        └─ Debounce save to Firebase (500ms)
        ↓
    User leaves page
        └─ Cleanup: Delete presence record
```

---

## 13. Code Examples

### 13.1 Using Mock User in Components

```javascript
// hooks/ficha-tecnica/useRecipeCategories.js
const userId = APP_CONSTANTS.MOCK_USER_ID; // 'mock-user-id'

const userData = await UserEntity.getById(userId);
if (userData?.recipe_config?.selected_category_type) {
  const categoryType = userData.recipe_config.selected_category_type;
  // Use category type
}
```

### 13.2 Client Portal Access Validation

```javascript
// components/clientes/portal/ClientAuthMiddleware.jsx
const customerData = await Customer.getById(customerId);

if (!customerData) {
  return <ErrorMessage "Link inválido ou expirado" />;
}

const isBlocked = customerData.blocked || customerData.suspended;
const isActive = customerData.active;
const isPending = customerData.pending_registration;

if (isBlocked) {
  return <ErrorMessage "Acesso bloqueado" />;
}

let accessLevel = 'basic';
if (isPending) accessLevel = 'pending';
if (isActive) {
  accessLevel = 'full';
  if (customerData.category === 'vip') accessLevel = 'vip';
}
```

### 13.3 Anonymous Collaborative Session

```javascript
// hooks/programacao/useImpressaoProgramacao.js
// Create/restore anonymous user
const anonymousId = localStorage.getItem('anonymous_user_id') 
  || `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
localStorage.setItem('anonymous_user_id', anonymousId);

setUser({
  uid: anonymousId,
  displayName: 'Usuário Anônimo',
  email: 'anonymous@local'
});

// Register presence
const presenceDocRef = doc(
  db, 
  'impressaoProgramacao', 
  docId, 
  'editingPresence', 
  user.uid
);

await setDoc(presenceDocRef, {
  userId: user.uid,
  userName: user.displayName,
  sessionId: sessionId.current,
  timestamp: serverTimestamp(),
  isEditing: true
});

// Heartbeat - update every 30 seconds
setInterval(async () => {
  await updateDoc(presenceDocRef, {
    timestamp: serverTimestamp()
  });
}, 30000);

// Cleanup on unload
window.addEventListener('beforeunload', async () => {
  await deleteDoc(presenceDocRef);
});
```

---

## 14. TODOs and Production Checklist

### Critical TODOs in Code

**Firestore Rules** (`/firestore.rules`):
```
// TODO: Em produção, adicionar validação de autenticação
// TODO: Em produção, validar que userId corresponde ao usuário
```

**User Entity** (`/app/api/entities.js`):
```javascript
// Em produção, pegar do usuário autenticado
const userId = 'mock-user-id';
```

### Production Implementation Checklist

- [ ] Implement Firebase Auth sign-up/login
- [ ] Replace mock user system with real user authentication
- [ ] Add password requirements and validation
- [ ] Implement email verification
- [ ] Add password reset functionality
- [ ] Implement multi-factor authentication (MFA) option
- [ ] Add user profile management
- [ ] Implement proper role-based access control
- [ ] Add granular permission checks
- [ ] Harden Firestore security rules
- [ ] Add API key authentication
- [ ] Implement rate limiting
- [ ] Add request logging and auditing
- [ ] Implement session timeout
- [ ] Add logout functionality
- [ ] Add account deletion/deactivation
- [ ] Implement data encryption for sensitive fields
- [ ] Add CSRF protection
- [ ] Add Content Security Policy (CSP)
- [ ] Implement secure password hashing
- [ ] Add authentication error handling
- [ ] Implement retry logic for auth failures
- [ ] Add monitoring and alerting for auth issues
- [ ] Document authentication flow for team

---

## 15. Summary Table

| Aspect | Implementation | Status | Notes |
|--------|---|---|---|
| **User Authentication** | Firebase Auth initialized, mock user in use | Development | TODO: Implement real auth |
| **User Authorization** | Role-based (admin/customer levels) | Partial | Portal has levels, internal all-access |
| **Session Management** | localStorage + Firestore | Basic | Good for dev, needs hardening |
| **API Security** | None | Not implemented | TODO: Add API authentication |
| **Data Security** | Firestore open rules | Not protected | TODO: Implement Firestore rules |
| **HTTPS/TLS** | Expected (deployed to Vercel) | Production-ready | Vercel handles HTTPS |
| **CSRF Protection** | None | Not implemented | TODO: Add CSRF tokens |
| **Input Validation** | Minimal | Partial | Some validation in components |
| **Error Handling** | Basic try/catch | Partial | Could improve error messages |
| **Logging/Auditing** | Console logs present | Basic | TODO: Add structured logging |
| **Token Management** | None | Not implemented | Would use Firebase ID tokens |

---

## 16. Conclusion

The Cozinha Afeto application currently uses a **development-mode hybrid authentication system**:

1. **Internal Portal**: Simple mock user without real authentication
2. **Client Portal**: Customer ID-based access (no password protection)
3. **Collaborative Editing**: Anonymous sessions with presence tracking
4. **Firebase**: Initialized but underutilized, ready for production expansion

**Key Strengths**:
- Firebase integration foundation is in place
- Firestore real-time synchronization works well
- Portal access control structure is sound
- Collaborative editing with conflict detection

**Key Weaknesses**:
- No real user authentication (mock user only)
- Client portal has no password protection
- No API authentication
- Firestore rules are completely open
- No role-based access control in internal portal
- Missing CSRF protection and security headers

**Production Readiness**: **Not Ready** - significant authentication and security enhancements needed before production deployment.

For production deployment, prioritize:
1. Implementing proper Firebase Auth login/logout
2. Replacing mock user system with authenticated users
3. Hardening Firestore security rules
4. Adding API authentication
5. Implementing comprehensive security headers and CSRF protection

