# Supabase Integration Setup Guide

This project has been configured to work with Supabase for authentication. Follow these steps to complete the setup:

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization and fill in project details:
   - **Name**: BoilerRides (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be ready (this may take a few minutes)

## 2. Configure Environment Variables

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public key**
3. Update the `.env` file in your project root:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the placeholder values with your actual Supabase project URL and anon key.

## 3. Set Up Email Authentication (Optional)

By default, Supabase requires email confirmation for new users. You can:

### Option A: Disable email confirmation (for development)
1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Scroll down to **Email confirmation**
3. Turn OFF "Enable email confirmations"

### Option B: Configure email templates (for production)
1. In your Supabase dashboard, go to **Authentication** → **Email Templates**
2. Customize the email templates as needed
3. Configure your email provider (SMTP) in **Settings** → **Auth**

## 4. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/signup` and create a test account with a `@purdue.edu` email
3. Navigate to `/signin` and test logging in with the created account
4. Check your Supabase dashboard under **Authentication** → **Users** to see registered users

## 5. Additional Configuration (Optional)

### Row Level Security (RLS)
If you plan to add database tables, consider enabling Row Level Security:

1. In your Supabase dashboard, go to **Database** → **Tables**
2. For each table, you can enable RLS and create policies

### User Profiles Table
You might want to create a user profiles table to store additional user information:

```sql
-- Create a profiles table
create table profiles (
  id uuid references auth.users on delete cascade,
  first_name text,
  last_name text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policy for users to see their own profile
create policy "Users can view own profile" 
  on profiles for select 
  using ( auth.uid() = id );

-- Create policy for users to update their own profile
create policy "Users can update own profile" 
  on profiles for update 
  using ( auth.uid() = id );
```

## 6. Environment Files

- `.env` - Your local environment variables (not committed to git)
- `.env.example` - Template file showing required variables (committed to git)

Make sure to add `.env` to your `.gitignore` file to avoid committing sensitive information.

## Project Structure

The Supabase integration includes:

- `src/lib/supabase.ts` - Supabase client configuration and auth helpers
- `src/hooks/use-auth.tsx` - React context and hook for authentication state
- `src/pages/SignIn.tsx` - Updated sign in page with Supabase auth
- `src/pages/SignUp.tsx` - Updated sign up page with Supabase auth
- `src/App.tsx` - Wrapped with AuthProvider for global auth state

## Troubleshooting

### Common Issues:

1. **Environment variables not loading**: Make sure your `.env` file is in the project root and variable names start with `VITE_`

2. **CORS errors**: Ensure your Supabase project URL is correct in the environment variables

3. **Email confirmation**: If users can't sign in immediately after signup, check if email confirmation is enabled in your Supabase auth settings

4. **Purdue email validation**: The app validates that users sign up with `@purdue.edu` emails. You can modify this validation in the sign-up form if needed.

For more information, check the [Supabase documentation](https://supabase.com/docs).