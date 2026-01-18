-- Add hasSeenOnboarding column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasSeenOnboarding" BOOLEAN NOT NULL DEFAULT FALSE;