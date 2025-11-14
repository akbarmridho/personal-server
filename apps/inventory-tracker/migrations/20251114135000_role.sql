-- migrate:up

-- 1. Create the new role for anonymous access.
-- NOLOGIN means this role cannot be used to log in directly, only for permissions.
CREATE ROLE anon_user NOLOGIN;

-- 2. Grant this new role to your 'authenticator' role.
-- Your authenticator is 'postgres' (from your PGRST_DB_URI).
-- This allows the 'postgres' user to switch to the 'anon_user' role.
GRANT anon_user TO postgres;

-- 3. Grant usage on the schema.
GRANT USAGE ON SCHEMA public TO anon_user;

-- 4. Grant ALL CRUD permissions on ALL existing tables in the schema.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon_user;

-- 5. Grant ALL permissions on ALL existing functions in the schema.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon_user;

-- 6. [Important] Grant permissions for ANY FUTURE tables/functions.
-- This ensures new tables you create are also accessible.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT EXECUTE ON FUNCTIONS TO anon_user;

-- migrate:down

-- 1. Revoke the default privileges for any FUTURE tables/functions
-- This MUST be run before dropping the role.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM anon_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
   REVOKE EXECUTE ON FUNCTIONS FROM anon_user;


-- 2. Drop the anonymous role
-- This will automatically revoke all existing object permissions
-- (on tables, functions, schema) and group memberships.
DROP ROLE anon_user;