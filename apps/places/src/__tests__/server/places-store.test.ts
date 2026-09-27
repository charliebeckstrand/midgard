import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PlaceDraft } from '../../types'

/**
 * The store resolves its file from the working directory at import, so the
 * directory is moved before the module is loaded and every case here writes
 * inside a temporary one. Vitest isolates a file per fork, so the move reaches
 * nothing else.
 */
let store: typeof import('../../server/places-store')

let directory: string

const USER = '0192f3a4-5b6c-7d8e-9f01-23456789abcd'

const FILE = join('.data', 'users', USER, 'places.json')

const DRAFT: PlaceDraft = {
	name: 'Clearwater',
	category: 'food',
	address: '325 SW Bay Blvd, Newport, Oregon',
	latitude: 44.63,
	longitude: -124.05,
	rating: 4,
	visitedAt: '2026-08-15',
}

/** A stored place, as a write leaves it. */
const HELD = { ...DRAFT, id: 'a1', createdAt: '2026-08-15T18:00:00.000Z' }

/** A stored record that the schema cannot read, such as one a later schema refuses. */
const UNREAD = { id: 'b2', name: 'No position' }

beforeAll(async () => {
	// A temporary directory can sit behind a link, and macOS points /tmp at
	// /private/tmp. The working directory always reports the resolved path, so
	// the path is resolved here to let the two agree.
	directory = await realpath(await mkdtemp(join(tmpdir(), 'places-store-')))

	process.chdir(directory)

	expect(process.cwd()).toBe(directory)

	store = await import('../../server/places-store')
})

beforeEach(async () => {
	await rm(join(directory, '.data'), { recursive: true, force: true })
})

/** Writes the stored document, in whatever shape a case is about. */
async function stored(document: unknown): Promise<void> {
	await mkdir(join(directory, '.data', 'users', USER), { recursive: true })

	await writeFile(join(directory, FILE), JSON.stringify(document), 'utf8')
}

/** Reads the stored document back, as the store left it. */
async function document(): Promise<unknown[]> {
	return JSON.parse(await readFile(join(directory, FILE), 'utf8'))
}

describe('listPlaces', () => {
	it('answers with an empty list where no file exists', async () => {
		expect(await store.listPlaces(USER)).toEqual([])
	})

	it('drops what does not read as a place, newest visit first', async () => {
		await stored([HELD, UNREAD, { ...HELD, id: 'c3', visitedAt: '2026-09-01' }])

		expect((await store.listPlaces(USER)).map((place) => place.id)).toEqual(['c3', 'a1'])
	})
})

describe('addPlace', () => {
	it('gives the place an id and a written-at stamp', async () => {
		const place = await store.addPlace(USER, DRAFT)

		expect(place).toMatchObject(DRAFT)

		expect(await store.listPlaces(USER)).toEqual([place])
	})

	it('refuses a place once the user keeps the most', async () => {
		await stored(Array.from({ length: store.MAX_PLACES }, (_, i) => ({ ...HELD, id: `p${i}` })))

		expect(await store.addPlace(USER, DRAFT)).toBeNull()
	})

	// A record that the schema cannot read still takes room in the document.
	it('counts the records it cannot read toward the most', async () => {
		await stored([
			...Array.from({ length: store.MAX_PLACES - 1 }, (_, i) => ({ ...HELD, id: `p${i}` })),
			UNREAD,
		])

		expect(await store.addPlace(USER, DRAFT)).toBeNull()
	})
})

describe('updatePlace', () => {
	it('keeps the id and the written-at stamp of the record', async () => {
		await stored([HELD])

		const updated = await store.updatePlace(USER, 'a1', { ...DRAFT, name: 'Local Ocean' })

		expect(updated).toEqual({ ...HELD, name: 'Local Ocean' })

		expect(await store.listPlaces(USER)).toEqual([updated])
	})

	it('answers `null` where no place carries the id', async () => {
		await stored([HELD])

		expect(await store.updatePlace(USER, 'missing', DRAFT)).toBeNull()

		expect(await document()).toEqual([HELD])
	})
})

describe('removePlace', () => {
	it('removes the place', async () => {
		await stored([HELD])

		expect(await store.removePlace(USER, 'a1')).toBe(true)

		expect(await store.listPlaces(USER)).toEqual([])
	})

	it('answers `false` where no place carries the id', async () => {
		await stored([HELD])

		expect(await store.removePlace(USER, 'missing')).toBe(false)
	})
})

// A schema change can make a stored record unreadable. The list hides it, but a
// write must not delete it, so a later fix to the schema can read it again.
describe('records the schema cannot read', () => {
	it('keeps them on an add', async () => {
		await stored([HELD, UNREAD])

		await store.addPlace(USER, DRAFT)

		expect(await document()).toContainEqual(UNREAD)
	})

	it('keeps them on an update', async () => {
		await stored([HELD, UNREAD])

		await store.updatePlace(USER, 'a1', DRAFT)

		expect(await document()).toContainEqual(UNREAD)
	})

	it('keeps them on a remove', async () => {
		await stored([HELD, UNREAD])

		await store.removePlace(USER, 'a1')

		expect(await document()).toEqual([UNREAD])
	})
})
