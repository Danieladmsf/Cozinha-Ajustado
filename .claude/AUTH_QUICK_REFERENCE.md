# Authentication System - Quick Reference

## Current State: DEVELOPMENT MODE
The app uses Firebase but authentication is NOT enforced. All routes are publicly accessible.

---

## Key Files at a Glance

### Firebase Initialization
- **File**: `lib/firebase.js`
- **Exports**: `auth`, `db`, `storage`
- **Status**: Initialized but not used for auth enforcement

### User Management
- **File**: `app/api/entities.js` (lines 354-447)
- **Method**: `User.me()` - Returns hardcoded mock user
- **Mock ID**: `'mock-user-id'`
- **Production TODO**: All user IDs should come from `auth.currentUser.uid`

### API Endpoints
- **File**: `app/api/user/route.js`
- **Methods**: GET, PUT, POST
- **Auth Check**: NONE ⚠️

### Middleware
- **File**: `middleware.js`
- **Purpose**: Security headers only
- **Auth Check**: NONE ⚠️

### Portal Access
- **Entry**: `/portal` page
- **Mechanism**: Customer ID based (no password)
- **Code**: `components/clientes/portal/PortalPageWrapper.jsx`

---

## Route Access Matrix

| Route | Authentication | Accessible | Notes |
|-------|---|---|---|
| `/dashboard` | Required | ✓ PUBLIC | Should require login |
| `/receitas` | Required | ✓ PUBLIC | Should require login |
| `/portal` | None | ✓ PUBLIC | Customer ID access |
| `/portal/[id]` | ID only | ✓ PUBLIC | Can guess IDs |
| `/api/*` | Required | ✓ PUBLIC | No token check |

**Legend**: ✓ = Currently accessible despite requirements

---

## Authentication Flow (Current vs Expected)

### CURRENT (Development)
```
User visits /dashboard
    ↓
No auth check
    ↓
User data loaded with 'mock-user-id'
    ↓
Full access granted
```

### EXPECTED (Production)
```
User visits /dashboard
    ↓
Middleware checks auth token
    ↓
If no token → Redirect to /login
    ↓
User logs in via Firebase Auth
    ↓
User UID stored in token
    ↓
User data loaded with actual UID
    ↓
Access granted based on permissions
```

---

## User State Management

### Current Implementation
- **Location**: Firestore `User` collection
- **Key**: Hardcoded as `'mock-user-id'`
- **Storage**: Firestore document + localStorage

### Session Data
- **Sidebar state**: localStorage (via cookies)
- **Session info**: localStorage (portal sessions)
- **Expanded states**: sessionStorage

### Missing
- No auth context provider
- No `onAuthStateChanged` listener
- No token storage
- No session expiration

---

## Firestore Security Rules

**File**: `firestore.rules`

### Current Rules
```
✓ allow read: if true;      // Anyone can read
✓ allow write: if true;     // Anyone can write
✗ allow delete: if false;   // Delete blocked
```

### Issues
- Development-only rules
- No authentication check
- No authorization check
- Contains "TODO: Em produção" comments

### Needs
- Rules based on `request.auth.uid`
- Document ownership validation
- Role-based access

---

## Portal Access Pattern

### Entry
`/portal` → Shows ID input field

### Access
1. User enters customer ID
2. Navigates to `/portal/[customerId]`
3. Loads customer from Firestore using ID
4. No password required ⚠️

### Components
- `app/portal/page.jsx` - Entry form
- `components/clientes/portal/PortalPageWrapper.jsx` - Validator
- `components/clientes/portal/MobileOrdersPage.jsx` - Orders UI

---

## Required Changes for Production

### Immediate (Must Do)
1. [ ] Create AuthProvider component
2. [ ] Implement useAuth hook
3. [ ] Add onAuthStateChanged listener
4. [ ] Create protected route wrapper
5. [ ] Add login page
6. [ ] Update Firestore rules

### Short Term (Should Do)
1. [ ] Add API authentication
2. [ ] Implement user roles
3. [ ] Add logout functionality
4. [ ] Session management with tokens
5. [ ] Auth state persistence

### Medium Term (Nice to Have)
1. [ ] Email verification
2. [ ] Password reset
3. [ ] Multi-factor authentication
4. [ ] Audit logging
5. [ ] Rate limiting

---

## Code Snippets for Reference

### Getting Current User (Current - WRONG)
```javascript
const userId = 'mock-user-id'; // Hardcoded!
```

### Getting Current User (Production - CORRECT)
```javascript
import { auth } from '@/lib/firebase';

const currentUser = auth.currentUser;
if (currentUser) {
  const userId = currentUser.uid;
  // Use userId for data access
}
```

### API Authentication Check (Needed)
```javascript
import { auth } from '@/lib/firebase';

export async function middleware(req) {
  const token = req.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.userId = decodedToken.uid;
  } catch (err) {
    return new Response('Invalid token', { status: 403 });
  }
}
```

### Protected Route Wrapper (Needed)
```javascript
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    router.push('/login');
    return null;
  }

  return children;
}
```

---

## Environment Variables Needed

```env
# Firebase Config (already set)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=

# Server-side (for Firebase Admin)
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json

# Session/Auth (to add)
NEXT_PUBLIC_AUTH_REDIRECT_URL=
AUTH_SESSION_TIMEOUT=3600
```

---

## Testing Checklist

### Current State (Development)
- [ ] Can access `/dashboard` without login
- [ ] Can access `/portal` with any ID
- [ ] API endpoints accept all requests
- [ ] User data uses hardcoded ID

### After Auth Implementation
- [ ] Cannot access `/dashboard` without login
- [ ] Cannot access `/portal` without password
- [ ] API rejects requests without token
- [ ] User data uses actual UID
- [ ] Session expires after timeout
- [ ] Logout clears auth state

---

## Helpful Commands

### Check Firebase Admin Status
```bash
grep -r "firebase-admin" app/api/
```

### Find All User ID References
```bash
grep -r "mock-user-id" --include="*.js" --include="*.jsx"
```

### Find Firestore Rules Issues
```bash
grep -r "TODO" firestore.rules
```

### Check for Auth Listeners
```bash
grep -r "onAuthStateChanged" --include="*.js" --include="*.jsx"
```

---

## Firebase Project Details

- **Project**: cozinha-e-afeto
- **Config File**: `.firebaserc`
- **Rules File**: `firestore.rules`
- **Indexes**: `firestore.indexes.json`
- **API Key**: In `lib/firebase.js`

---

## Next Steps

1. **Read**: Full analysis in `AUTHENTICATION_SYSTEM_ANALYSIS.md`
2. **Review**: `firestore.rules` for current security posture
3. **Plan**: Create auth implementation roadmap
4. **Implement**: Start with AuthProvider component
5. **Test**: Verify all routes require authentication
6. **Deploy**: Update Firestore rules before production

---

**Last Updated**: November 4, 2025
**Status**: Development Mode - Not Production Ready
**Urgency**: High - Implement before deploying to production
