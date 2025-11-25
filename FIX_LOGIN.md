# Fix Login Issue - User Exists But No Password

## Problem
User exists in Supabase Auth (`auth.users`) but login fails because password isn't set.

## Solution 1: Use Set Password API (Quickest)

Make a POST request to set the password:

```bash
curl -X POST http://localhost:3000/api/admin/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "yournewpassword"
  }'
```

Or use your browser's console:
```javascript
fetch('/api/admin/set-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'yournewpassword'
  })
}).then(r => r.json()).then(console.log)
```

## Solution 2: Add to Seed Users (Permanent)

Edit `/src/app/api/owner/gate/route.ts` and `/src/app/api/auth/check-user/route.ts`:

Add your user to the `SEEDED_USERS` array:

```typescript
const SEEDED_USERS = [
  // ... existing users ...
  {
    email: "your-email@example.com",
    passwordEnv: "GATE_YOURUSER_PASSWORD",  // Optional
    fallbackPassword: "yourpassword",       // Used if env var not set
    metadata: { role: "staff" },             // or "owner" | "customer"
  },
] as const;
```

Then optionally add to `.env.local`:
```
GATE_YOURUSER_PASSWORD=yourpassword
```

The seed user sync will automatically set the password on next login attempt.

## Solution 3: Via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Find your user
3. Click on the user
4. Click **Reset Password** or **Update Password**
5. Set a new password

## Solution 4: Force Password Sync (If user is in SEEDED_USERS)

If your user is already in `SEEDED_USERS` but password isn't syncing:

1. Check your `.env.local` file has the correct password env var
2. Try logging in again - the sync happens on every auth attempt
3. Check server logs for sync errors

## Debugging

Check the `gate_auth_log` table to see what error occurred:

```sql
SELECT * FROM gate_auth_log 
WHERE email = 'your-email@example.com' 
ORDER BY created_at DESC 
LIMIT 10;
```

This will show you the exact error message from the login attempt.

## Common Issues

1. **Password not set**: User was created manually without password → Use Solution 1 or 3
2. **Password env var missing**: User in SEEDED_USERS but env var not set → Add to `.env.local`
3. **User not in SEEDED_USERS**: User exists but not synced → Use Solution 2
4. **Password too short**: Supabase requires min 6 chars → Use longer password
