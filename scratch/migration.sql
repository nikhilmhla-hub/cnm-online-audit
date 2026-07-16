-- SQL migration script to add source column to leads table in Supabase
-- Run this script inside the Supabase Dashboard SQL Editor for your project

ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Social Media';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Social Media';
