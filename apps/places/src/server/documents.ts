import { database } from './database'
import { readJsonFile, userFile, writeJsonFile } from './json-file'

/**
 * The one place where the stores read and write the documents of a user.
 *
 * Each user has one JSON document for each name. With a database, a document is
 * a row of the `documents` table (`db/schema.sql`). Without one, it is a file
 * under `.data`, which is for `next dev` and the tests only.
 *
 * A production server without a database refuses the request. A file there
 * disappears on the next deploy, so a silent fallback would lose data again.
 */

/** A minimal query interface, which a `pg` pool and a test database both satisfy. */
type Queryable = {
	query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>
}

/** The names of the documents that a user has. */
type DocumentName = 'places' | 'visits'

/** Reads one document, or `undefined` where it does not exist yet. */
export async function readDocument(userId: string, name: DocumentName): Promise<unknown> {
	const db = database()

	if (db === null) return readJsonFile(userFile(userId, `${name}.json`))

	return selectDocument(db, userId, name)
}

/** Writes one document in full, and replaces the document that was there. */
export async function writeDocument(
	userId: string,
	name: DocumentName,
	value: unknown,
): Promise<void> {
	const db = database()

	if (db === null) return writeJsonFile(userFile(userId, `${name}.json`), value)

	return upsertDocument(db, userId, name, value)
}

/** Reads one row of `documents`. Exported so the tests can run it on a database of their own. */
export async function selectDocument(
	db: Queryable,
	userId: string,
	name: DocumentName,
): Promise<unknown> {
	const { rows } = await db.query('SELECT value FROM documents WHERE user_id = $1 AND name = $2', [
		userId,
		name,
	])

	return (rows[0] as { value: unknown } | undefined)?.value
}

/**
 * Writes one row of `documents`. The value goes as JSON text, because `pg`
 * sends a JavaScript array as a Postgres array and not as JSON.
 */
export async function upsertDocument(
	db: Queryable,
	userId: string,
	name: DocumentName,
	value: unknown,
): Promise<void> {
	await db.query(
		`INSERT INTO documents (user_id, name, value) VALUES ($1, $2, $3::jsonb)
		ON CONFLICT (user_id, name) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
		[userId, name, JSON.stringify(value)],
	)
}
