import { type ClientConfig, Pool } from 'pg'
import { databaseEnv } from './env'

/**
 * The connection pool of the places database, or `null` where `DATABASE_URL` is
 * not set and the server is not in production ({@link databaseEnv}).
 *
 * @remarks
 * App Platform builds a new container for each deploy, so a file on its disk
 * does not outlive the deploy. The deployed service binds the managed cluster,
 * which sets `DATABASE_URL`. Without it, `next dev` keeps the documents in
 * `.data` (see `documents.ts`).
 *
 * The pool opens on the first call, so the variables are read then, not when
 * the module loads. `next dev` reloads modules, so the pool lives on `globalThis`,
 * and a reload does not open a second one.
 */
export function database(): Pool | null {
	const env = databaseEnv()

	if (env === null) return null

	const holder = globalThis as { placesPool?: Pool }

	if (holder.placesPool === undefined) {
		const pool = new Pool({
			...connection(env.url, env.ca),
			max: 5,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 5_000,
			statement_timeout: 30_000,
		})

		// An idle connection can drop when the network or the database restarts.
		// Without a listener, `pg` raises that as an uncaught exception.
		pool.on('error', (error) => {
			console.error('[places] idle database client error:', error.message)
		})

		holder.placesPool = pool
	}

	return holder.placesPool
}

/**
 * The settings for `pg`, taken apart from the URL, so that its `sslmode` cannot
 * override the TLS settings here. The same rule as `connectionConfig` of Asgard.
 *
 * With `ca`, TLS verifies the server. Without it, TLS encrypts but trusts any
 * certificate, like the `require` mode of libpq.
 */
function connection(url: string, ca: string | undefined): ClientConfig {
	const parsed = new URL(url)

	const sslmode = parsed.searchParams.get('sslmode')

	const tls = sslmode !== null && sslmode !== 'disable'

	return {
		host: parsed.hostname,
		port: Number.parseInt(parsed.port, 10) || 5432,
		database: parsed.pathname.slice(1),
		user: decodeURIComponent(parsed.username),
		password: decodeURIComponent(parsed.password),
		ssl: tls ? (ca ? { ca } : { rejectUnauthorized: false }) : false,
	}
}
