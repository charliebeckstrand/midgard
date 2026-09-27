#!/bin/sh
# Applies `schema.sql` to the database at `DATABASE_URL` in one transaction. The
# migrate job of `.do/app.yaml` runs this script before each deploy. If it
# fails, the deploy stops and the running version keeps serving.
set -eu

cd "$(dirname "$0")"

# With a root certificate, libpq treats `sslmode=require` as `verify-ca`, so
# the job also checks the server that it connects to.
if [ -n "${DATABASE_CA_CERT:-}" ]; then
	printf '%s\n' "$DATABASE_CA_CERT" > /tmp/database-ca.crt

	export PGSSLROOTCERT=/tmp/database-ca.crt
fi

psql "$DATABASE_URL" --no-psqlrc --set ON_ERROR_STOP=1 --single-transaction --file schema.sql

echo '[migrate] The places schema is current.'
