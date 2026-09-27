-- The schema of the places database. Before each deploy, the `migrate` job of
-- `.do/app.yaml` runs this file as the admin user through `migrate.sh`, so each
-- statement must be safe to run again. The service connects as `places`, which
-- can only read and write rows, so a flaw in the service cannot change the
-- schema.

-- One JSON document for each user and each name: `places` holds the list of
-- places, and `visits` holds the visited regions. The stores parse each
-- document when they read it, so the shape of a document is not a column.
CREATE TABLE IF NOT EXISTS documents (
	user_id uuid NOT NULL,
	name text NOT NULL,
	value jsonb NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT now(),
	PRIMARY KEY (user_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO places;
