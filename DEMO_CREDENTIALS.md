# Demo Credentials Setup

## Overview
This document explains how to set up demo/test credentials for the BoilerRides application to enable easy testing and development.

## Demo Account Details
- **Email:** demo@purdue.edu
- **Password:** demo123

## Setting Up Demo Account

### Option 1: Create via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"**
4. Fill in the details:
   - Email: `demo@purdue.edu`
   - Password: `demo123`
   - Email Confirm: Check ✅ (so the account is immediately active)
5. Click **"Create user"**

### Option 2: Create via SQL (Supabase SQL Editor)
Run the following SQL in your Supabase SQL Editor:

```sql
-- Create demo user account
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  'demo-user-uuid-12345678901234567890',
  'authenticated',
  'authenticated',
  'demo@purdue.edu',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  ''
);

-- Create demo profile (optional - will be created automatically via trigger)
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  bio,
  is_complete
) VALUES (
  'demo-user-uuid-12345678901234567890',
  'demo@purdue.edu',
  'Demo',
  'User',
  'This is a demo account for testing the BoilerRides application.',
  true
) ON CONFLICT (id) DO NOTHING;
```

### Option 3: Sign Up Through the App
1. Go to `/signup` in your application
2. Fill in the form:
   - First Name: Demo
   - Last Name: User  
   - Email: demo@purdue.edu
   - Password: demo123
   - Confirm Password: demo123
3. Complete the signup process
4. Verify the email if required (or mark as verified in Supabase dashboard)

## Using Demo Credentials

### For Developers
1. Go to the Sign In page (`/signin`)
2. You'll see a "Demo Credentials" section
3. Either:
   - Click "Fill Demo Credentials" button to auto-fill the form
   - Or manually type: `demo@purdue.edu` / `demo123`
4. Click "Sign In"

### For Testing
The demo account allows you to test:
- ✅ Authentication flow
- ✅ Profile management
- ✅ Protected routes
- ✅ Dashboard functionality
- ✅ Navigation between pages

## Additional Demo Data (Optional)

You can also create additional demo accounts for testing different scenarios:

```sql
-- Student demo account
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'student@purdue.edu', 
  crypt('student123', gen_salt('bf')),
  NOW(), NOW(), NOW()
);

-- Driver demo account  
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'driver@purdue.edu',
  crypt('driver123', gen_salt('bf')), 
  NOW(), NOW(), NOW()
);
```

## Security Notes

⚠️ **Important:** Demo credentials should only be used in development/testing environments.

For production:
1. Remove or disable demo accounts
2. Remove the demo credentials section from the SignIn page
3. Ensure all test data is cleared

## Troubleshooting

### Demo account won't sign in:
1. Check that the account exists in Supabase Authentication dashboard
2. Verify the email is confirmed (`email_confirmed_at` is not null)
3. Check Supabase logs for authentication errors
4. Ensure the password was set correctly

### Profile not loading:
1. Check if profile was created automatically via trigger
2. Manually create profile record if needed
3. Verify Row Level Security policies allow the user to read their profile

---

This setup provides a quick and easy way to test the BoilerRides application without needing to create new accounts each time during development.