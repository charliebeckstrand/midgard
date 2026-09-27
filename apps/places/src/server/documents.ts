import { database } from './database'
import { createQueue, readJsonFile, userFile, writeJsonFile } from './json-file'

/**
 * The one place where the stores read and write the documents of a user.
 *
 * Each user has one JSON document for each name. With a database, a document is
 * a row of the `documents` table (`db/schema.sql`). Without one, it is a file
 * under `.data`, which is for `next dev` and the tests only.
 *
 * A production server without a database refuses the request. A file there
 * disappears on the next deploy, so a silent fallback would lose data again.
 *
 * Each write reads the document, changes it, and writes it back through
 * {@link changeDocument}, which holds a lock on the document for that time. Two
 * requests that land together cannot then each read the same document and
 * write back over one another. The database lock also holds across instances,
 * and App Platform runs two instances for the time of a deploy.
 */

/** A minimal query interface, which a `pg` pool and a test database both satisfy. */
type Queryable = {
	query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>
}

/** A pool that lends one connection, which a transaction needs. A `pg` pool satisfies it. */
type Connectable = {
	connect(): Promise<Queryable & { release(): void }>
}

/** The names of the documents that a user has. */
type DocumentName = 'places' | 'visits'

/**
 * What a change gives back: the result for the caller, and the new document.
 * Without `value`, the change writes nothing.
 */
export type Change<T> = { result: T; value?: unknown }

/** Puts the writes to the files in order. The files are for one process only. */
const serializeFiles = createQueue()

/** Reads one document, or `undefined` where it does not exist yet. */
export async function readDocument(userId: string, name: DocumentName): Promise<unknown> {
	const db = database()

	if (db === null) return readJsonFile(userFile(userId, `${name}.json`))

	return selectDocument(db, userId, name)
}

/**
 * Reads one document, gives it to `change`, and writes the value that `change`
 * gives back. No other change to the same document runs between the read and
 * the write. The document is `undefined` where it does not exist yet.
 */
export async function changeDocument<T>(
	userId: string,
	name: DocumentName,
	change: (document: unknown) => Promise<Change<T>>,
): Promise<T> {
	const db = database()

	if (db !== null) return changeRow(db, userId, name, change)

	const file = userFile(userId, `${name}.json`)

	return serializeFiles(async () => {
		const { result, value } = await change(await readJsonFile(file))

		if (value !== undefined) await writeJsonFile(file, value)

		return result
	})
}

/**
 * The database half of {@link changeDocument}, in one transaction. Exported so
 * the tests can run it on a database of their own.
 *
 * An advisory lock holds the document, not a row lock, because the first write
 * of a document has no row to lock. The transaction releases the lock when it
 * ends.
 */
export async function changeRow<T>(
	db: Connectable,
	userId: string,
	name: DocumentName,
	change: (document: unknown) => Promise<Change<T>>,
): Promise<T> {
	const client = await db.connect()

	try {
		await client.query('BEGIN')

		await client.query(
			"SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text, 0))",
			[userId, name],
		)

		const { result, value } = await change(await selectDocument(client, userId, name))

		if (value !== undefined) await upsertDocument(client, userId, name, value)

		await client.query('COMMIT')

		return result
	} catch (error) {
		// A failed rollback must not hide the error that caused it.
		await client.query('ROLLBACK').catch(() => undefined)

		throw error
	} finally {
		client.release()
	}
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
