import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { changeRow, readDocument, selectDocument, upsertDocument } from '../../server/documents'

/**
 * The database half of the documents, on PGlite: Postgres compiled to run in
 * the process, so the test runs the real schema and the real SQL without a
 * server. The file half is the mechanism that `json-file.test.ts` covers.
 */
let db: PGlite

const USER = '0192f3a4-5b6c-7d8e-9f01-23456789abcd'

const OTHER = '0192f3a4-5b6c-7d8e-9f01-23456789abce'

// PGlite compiles its WebAssembly on start, which takes longer than the default
// hook timeout when the gate runs each workspace at the same time.
beforeAll(async () => {
	db = new PGlite()

	// The schema grants rows to `places`, which the cluster holds before the
	// `migrate` job runs.
	await db.exec('CREATE ROLE places')

	await db.exec(await readFile(new URL('../../../db/schema.sql', import.meta.url), 'utf8'))
}, 60_000)

beforeEach(async () => {
	await db.exec('TRUNCATE documents')
})

afterAll(async () => {
	await db.close()
})

describe('the documents table', () => {
	it('answers undefined for a document that does not exist yet', async () => {
		expect(await selectDocument(db, USER, 'places')).toBeUndefined()
	})

	it('reads back a list as the list it wrote', async () => {
		const places = [{ id: 'a', name: 'Voodoo Doughnut' }, { id: 'b' }]

		await upsertDocument(db, USER, 'places', places)

		expect(await selectDocument(db, USER, 'places')).toEqual(places)
	})

	it('replaces the document that was there', async () => {
		await upsertDocument(db, USER, 'visits', { states: ['Oregon'], countries: [] })

		await upsertDocument(db, USER, 'visits', { states: [], countries: ['Japan'] })

		expect(await selectDocument(db, USER, 'visits')).toEqual({ states: [], countries: ['Japan'] })

		expect((await db.query('SELECT 1 FROM documents')).rows).toHaveLength(1)
	})

	it('keeps each user and each name apart', async () => {
		await upsertDocument(db, USER, 'places', [{ id: 'mine' }])

		await upsertDocument(db, OTHER, 'places', [{ id: 'theirs' }])

		await upsertDocument(db, USER, 'visits', { states: ['Ohio'], countries: [] })

		expect(await selectDocument(db, USER, 'places')).toEqual([{ id: 'mine' }])

		expect(await selectDocument(db, OTHER, 'places')).toEqual([{ id: 'theirs' }])

		expect(await selectDocument(db, OTHER, 'visits')).toBeUndefined()
	})

	it('refuses a user id that is not a UUID', async () => {
		await expect(upsertDocument(db, '../../etc', 'places', [])).rejects.toThrow()
	})

	it('applies the schema again without a change', async () => {
		await upsertDocument(db, USER, 'places', [{ id: 'kept' }])

		await db.exec(await readFile(new URL('../../../db/schema.sql', import.meta.url), 'utf8'))

		expect(await selectDocument(db, USER, 'places')).toEqual([{ id: 'kept' }])
	})
})

/**
 * PGlite has one connection, so each `connect` lends that connection. The lock
 * between two instances is Postgres behaviour and needs a server. These cases
 * cover the transaction around it.
 */
function pool() {
	return { connect: async () => ({ query: db.query.bind(db), release: () => undefined }) }
}

describe('changeRow', () => {
	it('writes the value of the change, and answers its result', async () => {
		const result = await changeRow(pool(), USER, 'places', async (document) => {
			expect(document).toBeUndefined()

			return { result: 'added', value: [{ id: 'a' }] }
		})

		expect(result).toBe('added')

		expect(await selectDocument(db, USER, 'places')).toEqual([{ id: 'a' }])
	})

	it('gives the change the stored document', async () => {
		await upsertDocument(db, USER, 'places', [{ id: 'a' }])

		await changeRow(pool(), USER, 'places', async (document) => ({
			result: undefined,
			value: [...(document as unknown[]), { id: 'b' }],
		}))

		expect(await selectDocument(db, USER, 'places')).toEqual([{ id: 'a' }, { id: 'b' }])
	})

	it('writes nothing for a change without a value', async () => {
		expect(await changeRow(pool(), USER, 'places', async () => ({ result: null }))).toBeNull()

		expect(await selectDocument(db, USER, 'places')).toBeUndefined()
	})

	it('rolls back and throws where the change throws', async () => {
		await expect(
			changeRow(pool(), USER, 'places', async () => {
				await upsertDocument(db, USER, 'visits', { states: ['Ohio'], countries: [] })

				throw new Error('change failed')
			}),
		).rejects.toThrow('change failed')

		expect(await selectDocument(db, USER, 'visits')).toBeUndefined()
	})
})

describe('readDocument', () => {
	it('refuses to keep data on the disk of a production server', async () => {
		vi.stubEnv('NODE_ENV', 'production')

		vi.stubEnv('DATABASE_URL', '')

		await expect(readDocument(USER, 'places')).rejects.toThrow('DATABASE_URL')
	})
})
