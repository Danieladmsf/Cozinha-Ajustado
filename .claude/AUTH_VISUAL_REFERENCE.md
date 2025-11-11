# Cozinha Afeto - Authentication System Visual Reference

Quick visual guide to the authentication architecture and implementation.

---

## System Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                         COZINHA AFETO APP                            │
│                         (Next.js 14)                                 │
└─────────────────────────────────────────────────────────────────────┘

                              ↓

            ┌──────────────────┬──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │ Internal Portal │ │ Client Portal│ │ Collaborative UI │
    │   (Dashboard)   │ │  (Orders)    │ │  (Programação)   │
    ├─────────────────┤ ├──────────────┤ ├──────────────────┤
    │ Auth: Mock User │ │ Auth: Cust.  │ │ Auth: Anonymous  │
    │ ID: hardcoded   │ │ ID via URL   │ │ Session: localStorage
    │ Routes: public  │ │ Protection:  │ │ Presence: Firestore
    │ Access: FULL    │ │ Partial      │ │ Access: Full     │
    └────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
             │                 │                  │
             └─────────────────┼──────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Firestore Database  │
                    │   (ALL PUBLIC)       │
                    │  26+ Collections     │
                    │  Open read/write     │
                    └──────────────────────┘

Legend: ✓ Working  ⚠️ Partial  ✗ Missing  🔴 Critical
```

---

## Three Authentication Patterns

### Pattern 1: Mock User (Internal Portal)

```
┌─────────────────────────┐
│   Dashboard Routes      │
│   - /                   │
│   - /receitas           │
│   - /cardapio           │
│   - /programacao        │
│   - ... (13 more)       │
└────────────┬────────────┘
             │
             ▼
    ┌─────────────────────┐
    │ NO AUTH CHECK       │
    │ (routes public)     │
    └────────────┬────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ Use hardcoded user          │
    │ const userId = 'mock-user-id'
    │                             │
    │ Source: lib/constants.js    │
    └────────────┬────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ Fetch User from Firestore   │
    │ GET /api/user               │
    │ PUT /api/user               │
    │ POST /api/user?type=recipe  │
    └────────────┬────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ Load data, store in state    │
    │ All features accessible      │
    │                             │
    │ Status: ✗ NOT SECURE        │
    └─────────────────────────────┘
```

### Pattern 2: Customer ID Access (Client Portal)

```
┌──────────────────────────┐
│   /portal                │
│   User enters            │
│   Customer ID manually   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────────┐
│   /portal/[customerId]       │
│   Dynamic route              │
│   PortalPageWrapper loads    │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│   Fetch Customer from Firestore  │
│   Customer.getById(customerId)   │
└────────────┬─────────────────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  ClientAuthMiddleware checks:    │
    ├─────────────────────────────────┤
    │ ✓ Customer exists?              │
    │ ✓ Customer.active?              │
    │ ✓ Customer.blocked?             │
    │ ✓ Customer.suspended?           │
    │ ✓ pending_registration?         │
    │ ✓ customer.category == "vip"?   │
    └─────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
    
    ERROR           SUCCESS
    ├─ Not found    ├─ pending_registration
    ├─ Blocked      │  └─ Show registration
    ├─ Suspended    │
    └─ Invalid      ├─ active
                    │  └─ Show orders page
                    │
                    └─ temp/basic
                       └─ Show limited view
    
    Status: ⚠️ PARTIAL (No password)
```

### Pattern 3: Anonymous Session (Collaborative)

```
┌─────────────────────────┐
│   /programacao          │
│   Open scheduling page  │
└────────────┬────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ useImpressaoProgramacao hook     │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Check Firebase auth.currentUser  │
├──────────────────────────────────┤
│ if auth.currentUser {            │
│   use auth.currentUser.uid       │
│ } else {                         │
│   generate anonymous ID          │
│ }                                │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Register presence in Firestore   │
│ Path:                            │
│ impressaoProgramacao/{docId}/    │
│ editingPresence/{userId}         │
│                                  │
│ Data:                            │
│ {                                │
│   userId: anon_123_abc,          │
│   userName: 'Usuário Anônimo',   │
│   timestamp: now(),              │
│   isEditing: true                │
│ }                                │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ Listen to real-time updates      │
│ Show who else is editing         │
│ Lock UI if another user present  │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ User edits items                 │
│ Track changes locally            │
│ Auto-save to Firestore (500ms)   │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│ User leaves page                 │
│ Cleanup: Delete presence record  │
│                                  │
│ Status: ⚠️ WORKS (No auth)       │
└──────────────────────────────────┘
```

---

## Authentication Flow Decision Tree

```
                          User Opens App
                                │
                                ▼
                    ┌──────────────────────┐
                    │  Check route path    │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
            
        /portal?      /programacao?    Other routes?
            │              │                │
            ▼              ▼                ▼
        
    ┌──────────┐  ┌──────────────┐  ┌──────────────┐
    │ Portal   │  │ Collaborative│  │   Internal   │
    │ Routes   │  │   Editing    │  │   Dashboard  │
    └────┬─────┘  └──────┬───────┘  └──────┬───────┘
         │                │                 │
         ▼                ▼                 ▼
    
    Extract            Check           Use Mock User
    Customer ID        localStorage    ID
         │             for anon ID     │
         │                │            │
         ▼                ▼            ▼
    
    Validate       Generate if        Fetch from
    customer       missing            Firestore
    in Firestore        │             User collection
         │              ▼             │
         │          Register in       ▼
         │          Firestore         App State
         ▼          presence          │
                                      ▼
    Determine    Track real-time  Full Access
    access level edits           to Dashboard
         │            │
         ▼            ▼
    
    Render       Auto-save
    appropriate  changes
    component
```

---

## Data Storage Locations

```
┌─────────────────────────────────────────────────────────────┐
│                   DATA STORAGE DIAGRAM                       │
└─────────────────────────────────────────────────────────────┘

FIRESTORE (Primary Database)
├── User collection
│   ├── Document: 'mock-user-id'
│   │   ├── id: 'mock-user-id'
│   │   ├── email: 'dev@cozinhaafeto.com'
│   │   ├── displayName: 'Usuário de Desenvolvimento'
│   │   ├── recipe_config: { ... }
│   │   ├── createdAt: timestamp
│   │   └── updatedAt: timestamp
│   └── Document: [userId] (future auth users)
│
├── Customer collection (Portal)
│   ├── Document: [customerId-1]
│   │   ├── id: [customerId-1]
│   │   ├── name: 'Customer Name'
│   │   ├── active: true
│   │   ├── pending_registration: false
│   │   ├── category: 'vip'
│   │   ├── blocked: false
│   │   ├── suspended: false
│   │   └── ...
│   └── Document: [customerId-2]
│
├── impressaoProgramacao collection
│   ├── Document: [docId-1]
│   │   ├── data: { ... }
│   │   └── editingPresence (sub-collection)
│   │       ├── Document: 'anon_123_abc'
│   │       │   ├── userId: 'anon_123_abc'
│   │       │   ├── userName: 'Usuário Anônimo'
│   │       │   ├── sessionId: 'session_123'
│   │       │   ├── timestamp: now()
│   │       │   └── isEditing: true
│   │       └── Document: [userId-2]
│   │           └── ...
│   └── Document: [docId-2]
│
├── Recipe collection
│   └── 26+ other collections
│   (all with allow read: true, allow write: true)
│
└── ...

LOCALSTORAGE (Client-side)
├── anonymous_user_id: 'anon_1730842600000_abc123def456'
├── print-preview-font-sizes: { ... }
├── print-preview-page-order: [ ... ]
├── consolidacao-kitchen-format: 'kitchen'
├── resolved-conflicts-*: { ... }
└── portal_sessions_[customerId]: [ ... ]

API ENDPOINTS (Next.js Routes)
├── GET /api/user
│   └── Returns: User data from Firestore.User.[userId]
│
├── PUT /api/user
│   └── Updates: Firestore.User.[userId]
│
├── POST /api/user?type=recipe-config
│   └── Updates: Firestore.User.[userId].recipe_config
│
└── ... (other API endpoints)
```

---

## Security Status Matrix

```
┌─────────────────────────────────────────────────────────────┐
│           SECURITY FEATURE IMPLEMENTATION STATUS             │
└─────────────────────────────────────────────────────────────┘

Feature                    Current Status    Production Status
───────────────────────────────────────────────────────────────
User Registration          ✗ Missing         ⚠️ Planned
User Login                 ✗ Missing         ⚠️ Planned
Password Management        ✗ Missing         ⚠️ Planned
Email Verification         ✗ Missing         ⚠️ Planned
Session Management         ⚠️ Basic          ✓ Needed
Route Protection           ✗ None            ✓ Critical
API Authentication         ✗ None            ✓ Critical
Firestore Rules            ⚠️ Public         ✓ Critical
Rate Limiting              ✗ None            ✓ Needed
CSRF Protection            ✗ None            ✓ Needed
Input Validation           ⚠️ Minimal        ✓ Needed
Error Handling             ⚠️ Basic          ✓ Needed
Audit Logging              ✗ None            ✓ Needed
Data Encryption            ✗ None            ✓ Needed
Token Management           ✗ None            ✓ Critical
Role-Based Access          ⚠️ Partial        ✓ Needed

OVERALL SECURITY:
✗ Critical Issues: 9+
⚠️ Partial Issues: 5+
✓ Working Features: 3+

PRODUCTION READINESS: ❌ NOT READY
Risk Level: 🔴 CRITICAL
```

---

## File Dependency Map

```
Authentication Flow Dependencies:

lib/firebase.js (Firebase Config)
    ↓
app/api/entities.js (User Entity + Mock System)
    ├─→ User.getMyUserData()
    ├─→ User.updateMyUserData()
    └─→ User.me()
    ↓
app/api/user/route.js (User API)
    ├─→ GET /api/user
    ├─→ PUT /api/user
    └─→ POST /api/user?type=recipe-config
    ↓
Components (Use User Data)
    ├─→ /components/*
    ├─→ hooks/*
    └─→ /app/*/page.jsx

lib/constants.js (MOCK_USER_ID)
    ├─→ Used in: hooks/ficha-tecnica/useRecipeCategories.js
    ├─→ Used in: hooks/cardapio/*
    └─→ Used in: components/*

Firestore Database
    ├─→ User collection
    ├─→ Customer collection (Portal)
    ├─→ impressaoProgramacao (Collaborative)
    └─→ 23+ other collections

firestore.rules (Security)
    └─→ Applied to all collections

Portal Routes:
app/portal/page.jsx (Entry)
    ↓
app/portal/[customerId]/page.jsx (Dynamic)
    ↓
components/clientes/portal/PortalPageWrapper.jsx (Wrapper)
    ├─→ Fetch Customer from Firestore
    └─→ Wrap with ClientAuthMiddleware
        ├─→ Validate customer
        ├─→ Determine access level
        ├─→ Show registration or orders
        └─→ Render components based on status

Collaborative Editing:
/programacao route
    ↓
hooks/programacao/useImpressaoProgramacao.js (Hook)
    ├─→ Create/restore anonymous ID (localStorage)
    ├─→ Register presence (Firestore)
    ├─→ Listen to changes (Firestore)
    ├─→ Auto-save (Firestore)
    └─→ Cleanup on unload
```

---

## Production Roadmap Timeline

```
WEEK 1 (Phase 1: Foundation)
┌──────────────────────────────────────┐
│ ✓ Create login page                  │
│ ✓ Implement Firebase Auth sign-in    │
│ ✓ Add sign-out functionality         │
│ ✓ Create auth context/hook           │
│ ✓ Add loading states                 │
│                                      │
│ Files to create:                     │
│ - app/auth/login/page.jsx            │
│ - app/auth/signup/page.jsx           │
│ - hooks/useAuth.js                   │
│ - context/AuthContext.jsx (optional) │
└──────────────────────────────────────┘

WEEK 2 (Phase 2: Protected Routes)
┌──────────────────────────────────────┐
│ ✓ Add middleware auth checks         │
│ ✓ Protect dashboard routes           │
│ ✓ Redirect unauthenticated users     │
│ ✓ Implement auth state persistence   │
│                                      │
│ Files to modify:                     │
│ - middleware.js                      │
│ - app/layout.jsx                     │
│ - All dashboard routes               │
└──────────────────────────────────────┘

WEEK 3 (Phase 3: API Security)
┌──────────────────────────────────────┐
│ ✓ Add API token verification         │
│ ✓ Check user permissions             │
│ ✓ Add rate limiting                  │
│ ✓ Implement error handling           │
│                                      │
│ Files to create:                     │
│ - lib/authMiddleware.js              │
│ - lib/rateLimiter.js                 │
│                                      │
│ Files to modify:                     │
│ - app/api/user/route.js              │
│ - All other API routes               │
└──────────────────────────────────────┘

WEEKS 4-5 (Phase 4: Firestore Security)
┌──────────────────────────────────────┐
│ ✓ Rewrite Firestore rules            │
│ ✓ Add auth checks                    │
│ ✓ Implement user ownership           │
│ ✓ Add role-based access control      │
│                                      │
│ Files to modify:                     │
│ - firestore.rules (CRITICAL)         │
└──────────────────────────────────────┘

WEEKS 6-7 (Phase 5: Portal Security)
┌──────────────────────────────────────┐
│ ✓ Add portal password                │
│ ✓ Implement email verification       │
│ ✓ Add password reset                 │
│ ✓ Implement 2FA (optional)           │
│                                      │
│ Files to create:                     │
│ - app/portal/auth/*                  │
│ - Email service integration          │
└──────────────────────────────────────┘

WEEKS 8-9 (Phase 6-7: Hardening)
┌──────────────────────────────────────┐
│ ✓ Add CSRF tokens                    │
│ ✓ Implement CSP headers              │
│ ✓ Add input validation               │
│ ✓ Implement audit logging            │
│ ✓ Add encryption for sensitive data  │
│                                      │
│ Timeline: 4-6 weeks total            │
│ Resources: 1-2 developers            │
│ Priority: HIGH                       │
│ Risk: CRITICAL if not done           │
└──────────────────────────────────────┘
```

---

## Quick Lookup: What Needs to Change

```
FROM (Current - INSECURE):
─────────────────────────────────────
const userId = 'mock-user-id';
const userData = await User.getMyUserData();
// Everyone uses same hardcoded user

TO (Production - SECURE):
─────────────────────────────────────
const currentUser = auth.currentUser;
if (!currentUser) throw new Error('Not authenticated');
const userId = currentUser.uid;
const userData = await User.getMyUserData();
// Each user has their own ID from Firebase Auth

CHANGES REQUIRED:
─────────────────────────────────────
1. Replace all 'mock-user-id' with auth.currentUser.uid
2. Add auth checks to all protected routes
3. Add token verification to all APIs
4. Rewrite firestore.rules with auth checks
5. Implement login/logout pages
6. Add password reset functionality
7. Implement email verification
8. Add session management
9. Add audit logging
10. Add security headers
```

---

## Current Routes & Protection Status

```
INTERNAL DASHBOARD ROUTES (All Public)
─────────────────────────────────────
/ ......................... ✗ No auth
/dashboard ................. ✗ No auth
/receitas .................. ✗ No auth
/ficha-tecnica ............. ✗ No auth
/analise-de-receitas ....... ✗ No auth
/cardapio .................. ✗ No auth
/programacao ............... ✗ No auth (but collaborative)
/pedidos ................... ✗ No auth
/ingredientes .............. ✗ No auth
/categorias ................ ✗ No auth
/fornecedores-e-servicos ... ✗ No auth
/clientes .................. ✗ No auth
/contas .................... ✗ No auth
/fechamento ................ ✗ No auth
/tabela-nutricional ........ ✗ No auth

PORTAL ROUTES (Partial Protection)
─────────────────────────────────────
/portal .................... ⚠️ Input validation only
/portal/[customerId] ....... ⚠️ Basic validation
/portal/[customerId]/orders  ⚠️ Access level check

API ROUTES
─────────────────────────────────────
GET /api/user .............. ✗ No auth
PUT /api/user .............. ✗ No auth
POST /api/user?type=recipe . ✗ No auth
/api/recipes/upload ........ ✗ No auth
/api/* ..................... ✗ No auth

FIRESTORE COLLECTIONS
─────────────────────────────────────
impressaoProgramacao ....... ✗ Public
pedidos .................... ✗ Public
[23+ other collections] .... ⚠️ Firestore defaults (deny)
```

---

## Next Steps (Action Items)

```
IMMEDIATE (This Week):
┌─────────────────────────────────────┐
│ □ Read authentication documentation │
│ □ Review firestore.rules            │
│ □ Create implementation plan        │
│ □ Assign team members               │
└─────────────────────────────────────┘

SHORT TERM (Next 2 Weeks):
┌─────────────────────────────────────┐
│ □ Create login page                 │
│ □ Set up Firebase Auth              │
│ □ Create auth hook                  │
│ □ Test authentication flow          │
└─────────────────────────────────────┘

MEDIUM TERM (Weeks 3-5):
┌─────────────────────────────────────┐
│ □ Protect routes                    │
│ □ Secure APIs                       │
│ □ Update Firestore rules            │
│ □ Implement portal password         │
└─────────────────────────────────────┘

LONG TERM (Weeks 6+):
┌─────────────────────────────────────┐
│ □ Add email verification            │
│ □ Add password reset                │
│ □ Implement 2FA                     │
│ □ Security audit                    │
│ □ Production deployment             │
└─────────────────────────────────────┘
```

---

**This visual reference complements the detailed analysis documents.**  
**For implementation details, see: AUTHENTICATION_COMPLETE_SUMMARY.md**
