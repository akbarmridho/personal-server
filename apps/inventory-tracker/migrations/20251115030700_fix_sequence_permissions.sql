-- migrate:up

-- Fix sequence permissions for PostgREST
-- When using SERIAL columns, PostgreSQL creates sequences that need separate permissions
-- PostgREST needs USAGE and SELECT permissions on these sequences to insert records

-- Grant permissions on all existing sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon_user;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT USAGE, SELECT ON SEQUENCES TO anon_user;

-- migrate:down

-- Revoke permissions on all existing sequences
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public FROM anon_user;

-- Remove default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   REVOKE USAGE, SELECT ON SEQUENCES FROM anon_user;