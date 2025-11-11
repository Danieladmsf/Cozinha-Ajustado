# Authentication Architecture - Visual Flow Diagrams

## 1. Current Application Flow (Development)

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ENTRY POINTS                           │
└────────┬────────────────────────────────┬──────────────────────┘
         │                                │
         v                                v
    ┌──────────┐                    ┌──────────┐
    │ Dashboard│                    │  Portal  │
    │ /        │                    │ /portal  │
    │ /receitas│                    │          │
    │ /cards   │                    └────┬─────┘
    └────┬─────┘                         │
         │                                │
         │ [NO AUTH CHECK]               │ Customer ID Input
         │                                │
         v                                v
    ┌──────────────────────────────────────────────┐
    │   MIDDLEWARE (middleware.js)                 │
    │   - Sets security headers                    │
    │   - NO authentication check                  │
    │   - NO authorization check                   │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │   ROUTE ACCESS                               │
    │   - GRANTED (all routes public)              │
    │   - No token verification                    │
    │   - No user context check                    │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │   DATA LOADING                               │
    │   - User ID: 'mock-user-id' (hardcoded)      │
    │   - Customer ID: from URL param              │
    │   - Load from Firestore via entities.js      │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │   FIRESTORE RULES CHECK                      │
    │   - allow read: if true                      │
    │   - allow write: if true                     │
    │   - OPEN TO EVERYONE                         │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │   DATA RETRIEVED                             │
    │   - Full database access                     │
    │   - No security boundaries                   │
    │   - No audit trail                           │
    └──────────────┬───────────────────────────────┘
                   │
                   v
    ┌──────────────────────────────────────────────┐
    │   UI RENDERED                                │
    │   - All features accessible                  │
    │   - No permission checks                     │
    │   - Full data visible                        │
    └──────────────────────────────────────────────┘
```

## 2. Proposed Production Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER ENTRY POINTS                           │
└────────┬────────────────────────────────┬──────────────────────┘
         │                                │
         v                                v
    ┌──────────┐                    ┌──────────┐
    │ Dashboard│                    │  Portal  │
    │ /        │                    │ /portal  │
    │ /receitas│                    │          │
    └────┬─────┘                    └────┬─────┘
         │                                │
         │                                │
         v                                v
    ┌──────────────────────────────────────────────┐
    │   MIDDLEWARE (middleware.js - UPDATED)       │
    │   + Check for auth token                     │
    │   + Validate Firebase ID token               │
    │   + Extract user UID                         │
    └──────────────┬───────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         v                   v
    ┌────────────┐      ┌──────────────────┐
    │ Token OK?  │      │   Token Missing  │
    │ YES        │      │   or Invalid     │
    └────┬───────┘      │                  │
         │              └────────┬─────────┘
         │                       │
         │                       v
         │              ┌────────────────────┐
         │              │  Redirect to /login│
         │              │  (or /portal)      │
         │              └────────────────────┘
         │
         v
    ┌──────────────────────────────────────────────┐
    │   AUTH CONTEXT (useAuth hook)                │
    │   - user: current user object                │
    │   - uid: user.uid                            │
    │   - loading: boolean                         │
    │   - logout: function                         │
    └──────────────┬───────────────────────────────┘
         │
         v
    ┌──────────────────────────────────────────────┐
    │   DATA LOADING                               │
    │   - User ID: auth.currentUser.uid (real)     │
    │   - Load user config from Firestore          │
    │   - Load accessible resources                │
    └──────────────┬───────────────────────────────┘
         │
         v
    ┌──────────────────────────────────────────────┐
    │   FIRESTORE RULES CHECK (UPDATED)            │
    │   - match /User/{userId} {                   │
    │       allow read: if request.auth.uid        │
    │                      == userId               │
    │   - match /Recipe {                          │
    │       allow read: if isOwner()                │
    │   - RESTRICTED BY USER UID                   │
    └──────────────┬───────────────────────────────┘
         │
         v
    ┌──────────────────────────────────────────────┐
    │   DATA RETRIEVED (Filtered)                  │
    │   - Only user's own data                     │
    │   - Based on permissions                     │
    │   - Audit trail available                    │
    └──────────────┬───────────────────────────────┘
         │
         v
    ┌──────────────────────────────────────────────┐
    │   UI RENDERED (Controlled)                   │
    │   - Features based on role                   │
    │   - Data based on permissions                │
    │   - Logout button visible                    │
    └──────────────────────────────────────────────┘
```

## 3. Component Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│               Root Layout (app/layout.jsx)              │
│  - Sets up main navigation                             │
│  - Renders sidebar                                      │
│  - NO AUTH PROVIDER CURRENTLY                          │
└────────────────────┬──────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        v                         v
┌──────────────────┐    ┌──────────────────┐
│  Dashboard Group │    │  Portal Group    │
│  (Protected)     │    │  (Public)        │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ├─ /dashboard           ├─ /portal
         ├─ /receitas            └─ /portal/[id]
         ├─ /ficha-tecnica          │
         ├─ /cardapio               v
         ├─ /programacao      ┌──────────────┐
         ├─ /ingredientes     │ PortalWrapper│
         └─ /clientes         │  - Load      │
                              │    customer  │
                              │  - Show form │
                              │    or portal │
                              └──────────────┘

MISSING: <AuthProvider> wrapping these components
MISSING: useAuth() context for auth state
MISSING: <ProtectedRoute> wrapper for dashboard
```

## 4. Authentication State Flow

```
┌─────────────────────────────────────────────────────────┐
│                  Firebase Auth                          │
│         (getAuth from lib/firebase.js)                 │
└────────────────────┬──────────────────────────────────┘
                     │
                     │ auth.currentUser
                     │ (NULL in development)
                     │
                     v
        ┌─────────────────────────┐
        │   Auth State Listener   │ (NOT IMPLEMENTED)
        │ onAuthStateChanged()    │
        │                         │
        │ Needed to detect:       │
        │ - Login                 │
        │ - Logout                │
        │ - Token refresh         │
        └────────┬────────────────┘
                 │
                 v
        ┌─────────────────────────┐
        │   Auth Context Provider │ (NOT IMPLEMENTED)
        │ (React Context)         │
        │                         │
        │ Provides:               │
        │ - user object           │
        │ - loading state         │
        │ - logout method         │
        └────────┬────────────────┘
                 │
                 v
        ┌─────────────────────────┐
        │   useAuth() Hook        │ (NOT IMPLEMENTED)
        │ (Custom Hook)           │
        │                         │
        │ Used in components to:  │
        │ - Get current user      │
        │ - Check auth state      │
        │ - Call logout           │
        └────────┬────────────────┘
                 │
                 v
        ┌─────────────────────────┐
        │   Components            │
        │ - Dashboard             │
        │ - Protected Routes      │
        │ - User Menu             │
        │ - Portal                │
        └─────────────────────────┘
```

## 5. API Authentication Flow

```
┌──────────────────────────────────┐
│   Client (React Component)        │
│                                  │
│  const response =                │
│    fetch('/api/user', {          │
│      headers: {                  │
│        Authorization:            │
│          `Bearer ${token}`       │
│      }                           │
│    })                            │
└────────────┬─────────────────────┘
             │
             │ HTTP Request
             │
             v
┌──────────────────────────────────┐
│   API Route (/app/api/user)      │
│   (Currently NO auth check)      │
│                                  │
│   Needs:                         │
│   - Extract token from header    │
│   - Verify with Firebase Admin   │
│   - Get user UID from token      │
│   - Return 401 if invalid        │
└────────────┬─────────────────────┘
             │
             v
┌──────────────────────────────────┐
│   Firebase Admin SDK             │
│   auth.verifyIdToken(token)      │
│                                  │
│   Returns:                       │
│   - decodedToken.uid             │
│   - decodedToken.email           │
│   - Or throws error              │
└────────────┬─────────────────────┘
             │
             v
┌──────────────────────────────────┐
│   User Entity Operations         │
│   User.getMyUserData(userId)     │
│                                  │
│   Uses verified UID              │
│   Loads user-specific data       │
└────────────┬─────────────────────┘
             │
             v
┌──────────────────────────────────┐
│   Firestore Rules Check          │
│                                  │
│   if request.auth.uid == userId: │
│     allow read                   │
└────────────┬─────────────────────┘
             │
             v
┌──────────────────────────────────┐
│   Return Data to Client          │
│   (or 403 Forbidden if denied)   │
└──────────────────────────────────┘
```

## 6. User Data Storage Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Firebase Auth                          │
│  (Cloud Authentication Service)                          │
│                                                          │
│  Users Table:                                            │
│  ├─ uid: string (auto-generated)                        │
│  ├─ email: string                                       │
│  ├─ password: hashed                                    │
│  ├─ displayName: string                                │
│  └─ Custom claims: object (for roles)                  │
└──────────────────────────────────────────────────────────┘
                      │
                      │ User UID
                      │
                      v
┌──────────────────────────────────────────────────────────┐
│                   Firestore Database                     │
│  (Data Storage)                                          │
│                                                          │
│  /User/{uid}                          (User Config)     │
│  ├─ id: uid                                             │
│  ├─ email: from auth                                    │
│  ├─ displayName: from auth                              │
│  ├─ recipe_config: {}                                   │
│  ├─ settings: {}                                         │
│  ├─ createdAt: timestamp                                 │
│  └─ updatedAt: timestamp                                │
│                                                          │
│  /Recipe/{recipeId}                                     │
│  ├─ name: string                                        │
│  ├─ userId: uid (owner)                                │
│  ├─ data: {}                                            │
│  └─ ...                                                  │
│                                                          │
│  /Customer/{customerId}                                 │
│  ├─ name: string                                        │
│  ├─ contact: {}                                         │
│  ├─ orders: []                                          │
│  └─ ...                                                  │
└──────────────────────────────────────────────────────────┘
                      │
                      │ Document References
                      │
                      v
┌──────────────────────────────────────────────────────────┐
│                   Firebase Storage                       │
│  (File Storage)                                          │
│                                                          │
│  /users/{uid}/                                          │
│  ├─ profile-image.jpg                                   │
│  ├─ documents/                                          │
│  └─ ...                                                  │
└──────────────────────────────────────────────────────────┘
```

## 7. Portal Access Comparison

### Current Portal Access
```
User → /portal → Enter any ID → /portal/[anyId]
       ↓
Firestore: Get Customer where id == anyId
       ↓
Customer exists? → Show data (no auth)
Customer missing? → Show error
```

### Proposed Portal Access (Secure)
```
User → /portal → Login form
       ↓
Enter email + password → Firebase Auth signIn()
       ↓
Auth success? → Get ID token
       ↓
Redirect to /portal/dashboard
       ↓
Firestore Rules: Only own customer data
```

## 8. File Organization After Auth Implementation

```
app/
├─ auth/                        (NEW)
│  ├─ login/
│  │  └─ page.jsx              (NEW - Login form)
│  ├─ register/
│  │  └─ page.jsx              (NEW - Registration)
│  ├─ reset-password/
│  │  └─ page.jsx              (NEW - Password reset)
│  └─ callback/
│     └─ page.jsx              (NEW - Auth callback)
│
├─ api/
│  ├─ auth/                     (NEW)
│  │  ├─ login/
│  │  │  └─ route.js           (NEW - Handle login)
│  │  ├─ logout/
│  │  │  └─ route.js           (NEW - Handle logout)
│  │  ├─ register/
│  │  │  └─ route.js           (NEW - Handle registration)
│  │  └─ verify/
│  │     └─ route.js           (NEW - Verify token)
│  │
│  └─ user/
│     └─ route.js              (UPDATED - Add auth check)
│
└─ middleware.js               (UPDATED - Add auth middleware)

components/
├─ auth/                        (NEW)
│  ├─ AuthProvider.jsx         (NEW - Context provider)
│  ├─ LoginForm.jsx            (NEW - Login UI)
│  ├─ RegisterForm.jsx         (NEW - Registration UI)
│  ├─ ProtectedRoute.jsx       (NEW - Route wrapper)
│  └─ useAuth.js               (NEW - Auth hook)
│
└─ ...

hooks/
├─ useAuth.js                  (NEW - Auth state hook)
├─ useAuthToken.js             (NEW - Token management)
└─ ...

lib/
├─ firebase.js                 (EXISTS - already init)
├─ auth-utils.js               (NEW - Auth helper functions)
└─ ...
```

## 9. Security Rules Evolution

### Current (Development - OPEN)
```javascript
match /{document=**} {
  allow read, write: if true;  // DANGEROUS!
}
```

### Phase 1 (Basic Auth)
```javascript
match /User/{userId} {
  allow read, write: if request.auth.uid == userId;
}

match /Recipe/{recipeId} {
  allow read, write: if request.auth != null;
}
```

### Phase 2 (Role-Based)
```javascript
match /User/{userId} {
  allow read, write: if request.auth.uid == userId;
  allow read: if hasRole('admin');
}

match /Recipe/{recipeId} {
  allow read: if isOwner(userId) || hasRole('admin');
  allow write: if isOwner(userId);
}
```

### Phase 3 (Full RBAC)
```javascript
function isOwner(userId) {
  return request.auth.uid == userId;
}

function hasRole(role) {
  return request.auth.token.role == role;
}

match /Recipe/{recipeId} {
  allow read: if isOwner(resource.data.userId) || 
                hasRole('admin') ||
                hasRole('viewer');
  allow write: if isOwner(resource.data.userId) ||
                 hasRole('admin');
  allow delete: if hasRole('admin');
}
```

## 10. Implementation Checklist

```
Phase 1: Auth Infrastructure
☐ Create AuthProvider component
☐ Create useAuth hook
☐ Create ProtectedRoute component
☐ Update middleware with token verification
☐ Create login page and form
☐ Create logout functionality
☐ Setup auth API endpoints

Phase 2: UI Integration
☐ Add login to root layout
☐ Add logout button to navbar
☐ Add user menu with account options
☐ Add loading states
☐ Add error handling

Phase 3: Security
☐ Update Firestore rules
☐ Add token verification to API routes
☐ Implement session timeout
☐ Add password requirements
☐ Setup email verification

Phase 4: Portal Migration
☐ Add authentication to portal
☐ Replace ID-based access with auth
☐ Add password reset for portal users
☐ Migrate existing customers

Phase 5: Testing & Deploy
☐ Test all protected routes
☐ Test permission boundaries
☐ Load testing
☐ Security audit
☐ Production deployment
```

---

**Last Updated**: November 4, 2025
**Key Takeaway**: Application currently has ZERO authentication enforcement despite having Firebase fully configured. Implementation needed urgently for production.
