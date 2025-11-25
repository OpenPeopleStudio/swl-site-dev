# User Management Guide

## How to Add/Change Users with Gate Access

### Method 1: Add Seed Users (Code-Based)

Edit the `SEEDED_USERS` array in **two files**:

1. `/src/app/api/owner/gate/route.ts` (lines 52-71)
2. `/src/app/api/auth/check-user/route.ts` (lines 4-23)

Add a new user entry:

```typescript
{
  email: "newuser@example.com",
  passwordEnv: "GATE_NEWUSER_PASSWORD",  // Optional: env var name
  fallbackPassword: "defaultpassword",    // Used if env var not set
  metadata: { role: "staff" },            // "owner" | "staff" | "customer"
}
```

Then add the environment variable to `.env.local` (optional):
```
GATE_NEWUSER_PASSWORD=securepassword123
```

**Note:** Seed users are automatically synced every time someone tries to authenticate at `/gate`.

### Method 2: Via Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create New User**
4. Enter:
   - Email address
   - Password
   - User Metadata (JSON):
     ```json
     {
       "role": "staff",
       "full_name": "User Name"
     }
     ```
5. Set **Email Confirmed** to `true`

### Method 3: Via Registration Endpoint (Self-Service)

Users can register themselves at `/gate` with `intent: "register"`. They'll automatically get `role: "customer"`.

### Method 4: Via Supabase SQL (Direct Database)

```sql
-- Create user directly in auth.users
-- Note: This requires Supabase Admin API or direct database access

-- You can't directly insert into auth.users via SQL
-- Use Supabase Admin API instead (see Method 2 or code)
```

### Changing User Roles

**Via Code:**
- Update the `metadata.role` in `SEEDED_USERS` array
- The role will sync on next authentication

**Via Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Click on the user
3. Edit **User Metadata**:
   ```json
   {
     "role": "owner"  // Change to: "owner" | "staff" | "customer"
   }
   ```

**Via SQL (if you have direct access):**
```sql
-- Update user metadata
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"owner"'
)
WHERE email = 'user@example.com';
```

### Changing Passwords

**Via Code:**
- Update `passwordEnv` or `fallbackPassword` in `SEEDED_USERS`
- Password syncs on next authentication

**Via Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Click on the user
3. Click **Reset Password** or **Update Password**

**Via Environment Variable:**
- Set the password in `.env.local`:
  ```
  GATE_USERNAME_PASSWORD=newpassword
  ```
- The seed user sync will pick it up automatically

### Removing Users

**Via Supabase Dashboard:**
1. Go to **Authentication** → **Users**
2. Find the user
3. Click **Delete User**

**Via Code:**
- Remove the user from `SEEDED_USERS` array
- User will still exist in Supabase but won't auto-sync passwords

### Current Seed Users

Based on the code, these users are configured:

1. `tom@openpeople.ai` - Role: `owner`
2. `tom@snowwhitelaundry.com` - Role: `staff`
3. `toml_ne@icloud.com` - Role: `customer`

### Important Notes

- **Seed users sync automatically** - Every time someone authenticates, seed users are synced
- **Roles matter** - The role determines what parts of the app users can access
- **Passwords** - Use environment variables for production, fallback passwords for development
- **Email confirmation** - Seed users are auto-confirmed (`email_confirm: true`)
