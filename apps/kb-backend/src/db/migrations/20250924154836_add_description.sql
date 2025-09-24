-- migrate:up
ALTER TABLE collections
ADD COLUMN description text NOT NULL;

-- migrate:down

