// The only reader of `DATABASE_URL` and `DATABASE_CA_CERT` in the repository
// (CONVENTIONS.md §11.1). The server of places gets these values through it.

/** Where the places database is, and the CA that TLS verifies it with. */
type DatabaseEnv = { url: string; ca: string | undefined }

/**
 * The settings of the places database, or `null` where `DATABASE_URL` is not
 * set.
 *
 * @remarks
 * Read at each call and not at module load, so `next build` needs no database.
 * In production, an unset value throws. App Platform replaces the container at
 * each deploy, so a file on its disk does not outlive the deploy, and a silent
 * fallback to files would lose data.
 */
export function databaseEnv(): DatabaseEnv | null {
	const url = process.env.DATABASE_URL

	if (url) return { url, ca: process.env.DATABASE_CA_CERT || undefined }

	if (process.env.NODE_ENV === 'production') {
		throw new Error('Set DATABASE_URL: a production server must not keep data on its disk.')
	}

	return null
}
