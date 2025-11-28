-- ======================================================================================
-- Supabase Database Schema for Profiles
-- Run these commands in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_complete BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Create storage policy for avatars
CREATE POLICY "Avatar images are publicly accessible" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
    ON storage.objects FOR DELETE 
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ======================================================================================
-- Supabase Database Schema for Rides
-- Create rides table
CREATE TABLE rides (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    ride_date DATE NOT NULL,
    ride_time TIME NOT NULL,
    duration INTERVAL,
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating NUMERIC(2,1),
    price NUMERIC(10,2) NOT NULL,
    seats_available INT NOT NULL,
    total_seats INT NOT NULL,
    car_type TEXT,
    special_moment TEXT,
    car_notes TEXT
);

-- Enable Row Level Security
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- Policies: Drivers manage their own rides
CREATE POLICY "Drivers can insert their own rides"
    ON rides FOR INSERT
    WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their own rides"
    ON rides FOR UPDATE
    USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete their own rides"
    ON rides FOR DELETE
    USING (auth.uid() = driver_id);

-- Policy: Anyone can view rides
CREATE POLICY "Anyone can view rides"
    ON rides FOR SELECT
    USING (true);

-- Optional metadata: special moment (e.g., concerts, games)
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS special_moment TEXT;

-- Ride bookings: track riders who signed up for seats
CREATE TABLE IF NOT EXISTS ride_bookings (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    ride_id BIGINT REFERENCES rides(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    seats INT NOT NULL DEFAULT 1,
    UNIQUE (ride_id, rider_id)
);

ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;

-- Riders can insert their own bookings
CREATE POLICY "Riders can insert own bookings"
    ON ride_bookings FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = rider_id);

-- Riders can view bookings for rides (for now allow all authenticated users)
CREATE POLICY "Authenticated can view bookings"
    ON ride_bookings FOR SELECT
    USING ((auth.jwt() ->> 'role') = 'authenticated');

CREATE POLICY "Riders manage own bookings"
    ON ride_bookings FOR UPDATE
    USING ((SELECT auth.uid()) = rider_id)
    WITH CHECK ((SELECT auth.uid()) = rider_id);

CREATE POLICY "Riders delete own bookings"
    ON ride_bookings FOR DELETE
    USING ((SELECT auth.uid()) = rider_id);

-- Migration: add payment fields to ride_bookings (mock payments)
-- Run this in Supabase SQL editor or via psql against your database.
ALTER TABLE IF EXISTS public.ride_bookings
  ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Optional: grant select/update privileges to authenticated role if using RLS policies
-- NOTE: Ensure RLS policies allow the authenticated user to update their own bookings if required.

-- ======================================================================================
-- Supabase Database Schema for Ride Join Requests
-- Tracks riders who have requested to join a ride prior to driver approval

CREATE TABLE IF NOT EXISTS join_requests (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ride_id BIGINT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seats INT NOT NULL DEFAULT 1 CHECK (seats > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    message TEXT,
    UNIQUE (ride_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_join_requests_ride_id ON join_requests (ride_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_rider_id ON join_requests (rider_id);

CREATE OR REPLACE FUNCTION public.set_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_join_requests_updated_at ON join_requests;
CREATE TRIGGER set_join_requests_updated_at
BEFORE UPDATE ON join_requests
FOR EACH ROW
EXECUTE PROCEDURE public.set_join_requests_updated_at();

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders manage their join requests"
    ON join_requests FOR ALL
    USING (auth.uid() = rider_id)
    WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Drivers can view requests for their rides"
    ON join_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM rides
            WHERE rides.id = join_requests.ride_id
              AND rides.driver_id = auth.uid()
        )
    );

-- === Proximity columns (origin latitude/longitude for rides and ride requests) ===
-- Add coordinates to support proximity matching (e.g., within 2 miles for similar rides/requests)
ALTER TABLE IF EXISTS rides
  ADD COLUMN IF NOT EXISTS origin_lat double precision,
  ADD COLUMN IF NOT EXISTS origin_lng double precision,
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lng double precision;

ALTER TABLE IF EXISTS ride_requests
  ADD COLUMN IF NOT EXISTS origin_lat double precision,
  ADD COLUMN IF NOT EXISTS origin_lng double precision,
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lng double precision,
  ADD COLUMN IF NOT EXISTS interested_rider_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;

-- Optional indexes for faster geo-ish lookups (bounding box filters)
CREATE INDEX IF NOT EXISTS idx_rides_origin_lat_lng ON rides(origin_lat, origin_lng);
CREATE INDEX IF NOT EXISTS idx_rides_destination_lat_lng ON rides(destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_ride_requests_origin_lat_lng ON ride_requests(origin_lat, origin_lng);
CREATE INDEX IF NOT EXISTS idx_ride_requests_destination_lat_lng ON ride_requests(destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_ride_requests_interested_ids_gin ON ride_requests USING gin (interested_rider_ids);

-- === Ride invites (driver-created invites to riders for a specific ride) ===
CREATE TABLE IF NOT EXISTS ride_invites (
    id bigserial primary key,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    ride_id bigint not null references rides(id) on delete cascade,
    ride_request_id bigint references ride_requests(id) on delete set null,
    rider_id uuid not null references profiles(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending','accepted','declined')),
    unique (ride_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_invites_ride_id ON ride_invites(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_invites_rider_id ON ride_invites(rider_id);
CREATE INDEX IF NOT EXISTS idx_ride_invites_request_id ON ride_invites(ride_request_id);

CREATE OR REPLACE FUNCTION public.set_ride_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ride_invites_updated_at ON ride_invites;
CREATE TRIGGER set_ride_invites_updated_at
BEFORE UPDATE ON ride_invites
FOR EACH ROW
EXECUTE PROCEDURE public.set_ride_invites_updated_at();
