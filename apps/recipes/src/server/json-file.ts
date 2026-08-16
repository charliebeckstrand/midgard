import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { ParseResult } from '../schemas/recipe'

/**
 * The one atomic-JSON-file mechanism, shared by the three stores that keep their
 * records in one.
 *
 * It exists because the invariant is worth stating once: a write that dies
 * halfway must leave the last good file rather than half of a new one, and two
 * requests landing together must not each read the same document and write back
 * over one another. Copied per store, a later fix — an fsync, a temp file swept
 * up after a failure, a permission — lands on one of them and silently misses
 * the rest.
 */

/**
 * A fresh write queue, so the caller's writes run one at a time.
 *
 * Per store rather than shared: a route handler serves each request on its own,
 * so two writes to the same file would each read the same document, apply one
 * change, and write back — and the second would drop the first. Chaining them
 * puts the second read after the first write. One queue across every store
 * would be correct too, and would make an unrelated file's write wait.
 */
export function createQueue(): <T>(work: () => Promise<T>) => Promise<T> {
	let queue: Promise<unknown> = Promise.resolve()

	return <T>(work: () => Promise<T>): Promise<T> => {
		// The chain must survive a failed write, or one error would deadlock every
		// write after it.
		const run = queue.then(work, work)

		queue = run.catch(() => undefined)

		return run
	}
}

/**
 * Every record a file holds that still reads as one, unsorted.
 *
 * Shared by the three stores because the rule is theirs in common: a file that
 * was hand-edited, or written by an older shape of the app, must not reach a
 * surface as a record with nothing in it. Written per store, a later change —
 * a cap, a line logged for what was dropped, a repair pass — lands on one of
 * them and silently misses the rest.
 */
export async function readRecords<T>(
	file: string,
	parse: (input: unknown) => ParseResult<T>,
): Promise<T[]> {
	const stored = await readJsonFile(file)

	if (!Array.isArray(stored)) return []

	const records: T[] = []

	for (const record of stored) {
		const parsed = parse(record)

		if (parsed.ok) records.push(parsed.value)
	}

	return records
}

/** Reads a JSON file, or `undefined` where it does not exist yet. */
export async function readJsonFile(file: string): Promise<unknown> {
	try {
		return JSON.parse(await readFile(file, 'utf8'))
	} catch (error) {
		// A missing file is the first run and not a fault. Anything else is, and
		// answering as though the file were empty would hide it behind a store that
		// had simply stopped holding anything.
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined

		throw error
	}
}

/**
 * Writes JSON through a temporary file and renames it into place. The rename is
 * the atomic step: a process that dies before it leaves the last good file
 * untouched, and one that dies after has written the whole of the new one.
 */
export async function writeJsonFile(file: string, value: unknown): Promise<void> {
	await mkdir(dirname(file), { recursive: true })

	const temporary = `${file}.${randomUUID()}.tmp`

	await writeFile(temporary, `${JSON.stringify(value, null, '\t')}\n`, 'utf8')

	await rename(temporary, file)
}
