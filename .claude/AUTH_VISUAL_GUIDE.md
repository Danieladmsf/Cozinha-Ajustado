# Authentication System - Visual Guide

## Current State vs. Production State

### CURRENT STATE (Development - Insecure)

```
┌──────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │ Any request to any route
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                  NEXT.JS APPLICATION                             │
│                                                                  │
│   middleware.js                                                  │
│   └─ Security headers only (NO AUTH CHECK)                       │
│                                                                  │
│   app/layout.jsx                                                 │
│   └─ No AuthProvider                                             │
│   └─ All routes rendered without checking user                   │
│                                                                  │
│   Components                                                     │
│   └─ useAuth() ❌ (doesn't exist)                                │
│   └─ ProtectedRoute ❌ (doesn't exist)                           │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │ All requests use hardcoded ID
                       │ const userId = 'mock-user-id'
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                 FIREBASE SERVICES                                │
│                                                                  │
│  Auth.currentUser ❌ (never checked)                             │
│                                                                  │
│  Firestore                                                       │
│  └─ All collections readable by anyone                           │
│  └─ All collections writable by anyone                           │
│  └─ Rule: allow read/write: if true                              │
│                                                                  │
│  Specific User Data (always same user)                           │
│  └─ User/mock-user-id (shared by ALL visitors)                  │
│  └─ Customer data (all accessible)                               │
│  └─ Recipe data (all accessible)                                 │
│  └─ All 26+ collections (publicly readable)                      │
└──────────────────────────────────────────────────────────────────┘

RISK LEVEL: 🔴🔴🔴 CRITICAL
```

---

### PRODUCTION STATE (Secure)

```
┌──────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                            │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │
                       ▼
                ┌──────────────────┐
                │  /login Page     │
                │  Email/Password  │
                └────────┬─────────┘
                         │
                         │ signInWithEmailAndPassword()
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│              FIREBASE AUTHENTICATION                             │
│                                                                  │
│  ✓ Verify credentials                                            │
│  ✓ Generate ID Token                                             │
│  ✓ Set session cookie (httpOnly)                                 │
│  ✓ Return user.uid                                               │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │ Authenticated request with
                       │ Authorization: Bearer <idToken>
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                  NEXT.JS APPLICATION                             │
│                                                                  │
│  middleware.js                                                   │
│  ✓ Extract token from Authorization header                       │
│  ✓ Verify token with Firebase Admin SDK                          │
│  ✓ Extract uid from decoded token                                │
│  ✓ Redirect to /login if invalid                                 │
│                                                                  │
│  app/layout.jsx                                                  │
│  ✓ AuthProvider wraps all routes                                 │
│  ✓ useAuth() hook checks auth state                              │
│  ✓ Redirects unauthenticated to /login                           │
│                                                                  │
│  Components                                                      │
│  ✓ useAuth() returns { user, uid, logout }                       │
│  ✓ ProtectedRoute checks auth before rendering                   │
│  ✓ All routes verify user is authenticated                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       │ Request includes verified uid
                       │ const userId = user.uid
                       │ (unique per user)
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                 FIREBASE SERVICES                                │
│                                                                  │
│  Auth.currentUser ✓ (always checked)                             │
│                                                                  │
│  Firestore                                                       │
│  ✓ Rules check request.auth.uid                                  │
│  ✓ Only user's own data accessible                               │
│  ✓ Collections restricted by role                                │
│                                                                  │
│  Specific User Data (per user)                                   │
│  └─ User/{uid} (only that user can read/write)                   │
│  └─ Customer/{customerId} (only owner can access)                │
│  └─ Recipe/{recipeId} (based on permissions)                     │
│  └─ 26+ collections (access controlled by rules)                 │
└──────────────────────────────────────────────────────────────────┘

RISK LEVEL: 🟢 LOW (controlled access)
```

---

## Route Access Flow

### Current (No Protection)

```
User Request
    │
    ├─ /dashboard ✓ ← Anyone can access
    │
    ├─ /receitas ✓ ← Anyone can access
    │
    ├─ /ficha-tecnica ✓ ← Anyone can access
    │
    ├─ /api/user ✓ ← Anyone can call
    │  └─ Gets mock-user-id data
    │
    ├─ /portal ✓ ← Anyone can access
    │  ├─ /portal/any-id ✓ ← Can guess IDs
    │  └─ /portal/[customerId]/orders ✓
    │
    └─ All 20+ routes ✓ ← All PUBLIC
```

### Production (With Auth)

```
User Request
    │
    ├─ /login ✓ ← Public (no auth needed)
    │
    ├─ /dashboard
    │  ├─ Has token? 
    │  │  ├─ YES ✓ → Render dashboard
    │  │  └─ NO ✗ → Redirect to /login
    │
    ├─ /receitas
    │  ├─ Has token?
    │  │  ├─ YES ✓ → Check Firestore rules
    │  │  │  └─ Is admin? ✓ → Show recipes
    │  │  └─ NO ✗ → Redirect to /login
    │
    ├─ /api/user
    │  ├─ Has valid token?
    │  │  ├─ YES ✓ → Get user's own data
    │  │  └─ NO ✗ → Return 401 Unauthorized
    │
    ├─ /portal
    │  ├─ Public ✓ → Show login form
    │
    ├─ /portal/[customerId]
    │  ├─ Has password?
    │  │  ├─ YES ✓ → Show customer data
    │  │  └─ NO ✗ → Show password form
    │
    └─ All 20+ routes ← Protected by auth
```

---

## Data Access Flow

### Current (Shared User)

```
Visitor 1              Visitor 2              Visitor 3
    │                      │                      │
    └──────────┬───────────┴──────────┬───────────┘
               │                      │
               ▼                      ▼
        ┌─────────────────────────────────────┐
        │  All use: 'mock-user-id'            │
        │  (Same user for everyone!)          │
        └────────────────┬────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────┐
        │  User/mock-user-id Document      │
        │  ✓ All visitors can read         │
        │  ✓ All visitors can modify       │
        │  ✓ Shared configuration          │
        │  ✓ Shared preferences            │
        └──────────────────────────────────┘

PROBLEM: Everyone's data is mixed together!
```

### Production (Isolated Users)

```
User 1 (uid: xyz)      User 2 (uid: abc)      User 3 (uid: def)
    │                       │                       │
    └──────┬────────────────┼────────────┬──────────┘
           │                │            │
           ▼                ▼            ▼
    ┌────────────┐   ┌────────────┐  ┌────────────┐
    │User/xyz    │   │User/abc    │  │User/def    │
    │(encrypted) │   │(encrypted) │  │(encrypted) │
    └────────────┘   └────────────┘  └────────────┘
    
    ✓ User xyz can only see User/xyz
    ✓ User abc can only see User/abc
    ✓ User def can only see User/def
    ✗ Users cannot access other users' data

BENEFIT: Each user's data is isolated!
```

---

## Authentication State Machine

### Current State (Development)

```
┌─────────────┐
│   Unknown   │
│  (No User)  │
└──────┬──────┘
       │
       │ Any Route
       ▼
┌──────────────────┐
│  Full Access     │
│  mock-user-id    │
└──────────────────┘

Only 1 state: Everyone is "logged in" as mock-user-id
```

### Production State (Auth Implemented)

```
┌─────────────┐
│ Unauthent.  │
│ /login only │
└──────┬──────┘
       │ 
       │ signInWithEmailAndPassword()
       │ ✓ Email verified
       │ ✓ Password correct
       │
       ▼
┌──────────────────────┐
│  Authenticating      │
│ (Loading auth state) │
└──────┬───────────────┘
       │
       │ onAuthStateChanged() fires
       │ ✓ User object available
       │ ✓ ID token generated
       │
       ▼
┌──────────────────────┐
│   Authenticated      │
│ (Full Access)        │
│ uid: {user.uid}      │
└──────┬───────────────┘
       │
       │ signOut()
       │ ✓ Session cleared
       │
       ▼
┌──────────────────────┐
│ SignedOut            │
│ (Return to login)    │
└──────────────────────┘

4 states: Unauthenticated → Authenticating → Authenticated → SignedOut
```

---

## User Data Structure

### Current (All Visitors)

```
Firestore Database
│
└─ User/
    └─ mock-user-id (SAME FOR ALL USERS!)
       ├─ id: 'mock-user-id'
       ├─ email: 'dev@cozinhaafeto.com'
       ├─ displayName: 'Usuário de Desenvolvimento'
       ├─ photoURL: null
       ├─ recipe_config: { ... }
       ├─ createdAt: Date
       └─ updatedAt: Date

Every visitor sees this data.
Every visitor can modify this data.
Only one user worth of data in the system.
```

### Production (Per User)

```
Firestore Database
│
├─ User/
│   ├─ user-uid-123-xyz (John's data)
│   │  ├─ id: 'user-uid-123-xyz'
│   │  ├─ email: 'john@example.com'
│   │  ├─ displayName: 'John Doe'
│   │  ├─ photoURL: 'http://...'
│   │  ├─ recipe_config: { ... }
│   │  ├─ createdAt: Date
│   │  └─ updatedAt: Date
│   │
│   ├─ user-uid-456-abc (Jane's data)
│   │  ├─ id: 'user-uid-456-abc'
│   │  ├─ email: 'jane@example.com'
│   │  ├─ displayName: 'Jane Smith'
│   │  ├─ recipe_config: { ... }
│   │  └─ ...
│   │
│   └─ user-uid-789-def (Bob's data)
│      └─ ...
│
├─ Recipe/
│  ├─ recipe-001
│  │  ├─ name: 'Lasagna'
│  │  ├─ owner: 'user-uid-123-xyz' (Only John can edit)
│  │  └─ ...
│  │
│  └─ recipe-002
│     └─ ...
│
└─ Customer/
   ├─ customer-001
   │  ├─ name: 'Restaurant A'
   │  ├─ owner_id: 'user-uid-123-xyz' (Only John can edit)
   │  └─ ...
   │
   └─ customer-002
      └─ ...

Each user only sees their own data.
Firestore rules enforce access.
```

---

## API Request Flow

### Current (No Security)

```
Browser                          Server
  │                               │
  │  GET /api/user                │
  │  (No auth header)             │
  ├──────────────────────────────►│
  │                               │
  │                          app/api/user/route.js
  │                          ✗ No token check
  │                          ✗ No user ID check
  │                          const userId = 'mock-user-id'
  │                          getMyUserData()
  │                               │
  │                          Firestore
  │                          get User/mock-user-id
  │                               │
  │  { id: 'mock-user-id', ...}   │
  │◄──────────────────────────────┤
  │                               │

PROBLEM: Anyone can call this and get the data!
```

### Production (Secure)

```
Browser                          Server
  │                               │
  │  GET /api/user                │
  │  Authorization: Bearer <token>│
  ├──────────────────────────────►│
  │                               │
  │                          middleware.js
  │                          ✓ Extract token
  │                          ✓ Verify with Firebase
  │                          ✓ Extract uid
  │                          ✓ Attach to request
  │                               │
  │                          app/api/user/route.js
  │                          ✓ Check token in header
  │                          const userId = request.headers.get('x-user-id')
  │                          getMyUserData(userId)
  │                               │
  │                          Firestore Rules
  │                          ✓ Check request.auth.uid == userId
  │                          get User/{userId}
  │                               │
  │  { id: '{userId}', ...}       │
  │◄──────────────────────────────┤
  │                               │

BENEFIT: Only valid users can call this!
```

---

## Portal Access Flow

### Current (No Password)

```
Customer Browser
     │
     ▼
/portal page
│
├─ Enter ID: "customer-123"
│
└─ Click "Access Portal"
     │
     ▼
router.push('/portal/customer-123')
     │
     ▼
PortalPageWrapper.jsx
│
├─ Load customer data
│  └─ Customer.get('customer-123')
│
├─ Check if exists
│  └─ if (customerData) ✓ → Show portal
│     if (!customerData) ✗ → Show error
│
└─ Display customer portal
   └─ Can place orders
   └─ Can see history
   └─ Can update profile

PROBLEM: No password! Can guess IDs!
```

### Production (With Password)

```
Customer Browser
     │
     ▼
/portal/login page
│
├─ Enter email: "customer@example.com"
├─ Enter password: "•••••••"
│
└─ Click "Login"
     │
     ▼
signInWithEmailAndPassword(email, password)
     │
     ├─ Check in Firebase Auth
     │  └─ Email exists? ✓
     │  └─ Password correct? ✓
     │
     ├─ Generate ID token
     │  └─ Unique to this customer
     │  └─ Expires in 1 hour
     │
     ▼
Store token in secure cookie
     │
     ▼
router.push('/portal/dashboard')
     │
     ▼
PortalDashboard.jsx
│
├─ Check token in cookie ✓
├─ Verify with Firebase ✓
├─ Load customer data
│  └─ Customer.get(uid)
│
└─ Display customer portal
   └─ Can place orders
   └─ Can see history
   └─ Can update profile

BENEFIT: Only valid customers can access!
```

---

## File Dependency Tree

### Current State

```
app/layout.jsx
├─ NO AuthProvider
├─ All children rendered without auth check
│
├─ middleware.js
│  └─ Only security headers (no auth)
│
└─ app/dashboard/page.jsx
   └─ No useAuth() hook
   └─ Renders directly
   └─ Uses hardcoded user ID
```

### Production State

```
app/layout.jsx
├─ AuthProvider wrapper
│  └─ onAuthStateChanged listener
│  └─ useAuth() hook available
│
├─ middleware.js
│  ├─ Verify token in header
│  ├─ Check Firebase Admin SDK
│  ├─ Redirect if no token
│  └─ Attach user to request
│
├─ app/login/page.jsx
│  └─ signInWithEmailAndPassword
│  └─ Redirect on success
│
├─ app/dashboard/page.jsx
│  ├─ useAuth() hook
│  ├─ Check user exists
│  │  └─ if (!user) redirect('/login')
│  ├─ Uses auth.currentUser.uid
│  └─ Renders protected content
│
└─ hooks/useAuth.js
   ├─ createContext(AuthContext)
   ├─ useContext(AuthContext)
   ├─ useState(user, loading, error)
   ├─ useEffect(onAuthStateChanged)
   └─ export useAuth()
```

---

## Firestore Rules Comparison

### Current (Permissive - Dangerous)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

Result:
✓ Anyone can read anything
✓ Anyone can write anything
✗ No authentication checks
✗ No authorization checks
✗ NO SECURITY AT ALL
```

### Production (Restricted - Secure)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only access their own document
    match /User/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Customers can only access assigned customers
    match /Customer/{customerId} {
      allow read: if resource.data.users_allowed.contains(request.auth.uid);
      allow write: if resource.data.owner_id == request.auth.uid;
    }

    // Recipes - only authenticated users, write only if owner
    match /Recipe/{recipeId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.owner_id;
    }

    // Admin-only collections
    match /Admin/{document=**} {
      allow read, write: if isAdmin();
    }

    // Helper function
    function isAdmin() {
      return get(/databases/$(database)/documents/User/$(request.auth.uid)).data.role == 'admin';
    }
  }
}

Result:
✓ Only authenticated users access data
✓ Users isolated by UID
✓ Document ownership enforced
✓ Role-based access control
✓ Audit trail possible
```

---

## Implementation Timeline

### Week 1: Auth Infrastructure
```
Mon: Create AuthProvider
     └─ hooks/useAuth.js
     └─ useEffect + onAuthStateChanged
     └─ useState(user, loading)

Tue: Wrap app with AuthProvider
     └─ Update app/layout.jsx
     └─ Test useAuth() hook

Wed: Create Login Page
     └─ app/login/page.jsx
     └─ Email/password form
     └─ signInWithEmailAndPassword

Thu: Create ProtectedRoute Component
     └─ Check useAuth().user
     └─ Redirect if not authenticated

Fri: Test authentication flow
     └─ Sign up new account
     └─ Sign in
     └─ Access protected route
```

### Week 2-3: Protect Routes & APIs
```
Mon-Tue: Update middleware.js
         └─ Verify tokens
         └─ Attach user to request

Wed-Thu: Update API endpoints
         └─ Check auth headers
         └─ Verify tokens
         └─ Attach user context

Fri:     Test all protected routes
```

### Week 4: Firestore Rules
```
Mon-Tue: Write new Firestore rules
         └─ Authentication checks
         └─ Authorization rules
         └─ Ownership validation

Wed:     Test rules in test environment
         └─ Verify access control
         └─ Check error handling

Thu-Fri: Deploy rules gradually
         └─ Monitor for issues
```

### Week 5: Portal Migration
```
Mon-Tue: Update portal auth
         └─ Add password requirement
         └─ Create customer login

Wed-Thu: Test customer flows
         └─ Sign up
         └─ Login
         └─ Place orders

Fri:     Production release plan
```

---

## Key Metrics

### Current Metrics (Insecure)
```
Authentication Enforcement: 0%
Protected Routes: 0/20
Secured API Endpoints: 0/10
User Isolation: 0%
Firestore Rules Coverage: 0%
Sessions with Auth Token: 0%
```

### Target Metrics (Secure)
```
Authentication Enforcement: 100%
Protected Routes: 20/20
Secured API Endpoints: 10/10
User Isolation: 100%
Firestore Rules Coverage: 100%
Sessions with Auth Token: 100%
```

---

**Visual Guide Created**: November 6, 2025  
**For**: Understanding authentication flows and current gaps  
**Next**: Read `AUTHENTICATION_COMPREHENSIVE_OVERVIEW.md` for details
