-- migrate:up

ALTER TABLE collections ADD COLUMN embedding text NOT NULL DEFAULT 'voyage-context-3';

-- migrate:down

ALTER TABLE collections DROP COLUMN embedding;

