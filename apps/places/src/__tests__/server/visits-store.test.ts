import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { Visits } from '../../types'

/**
 * The store resolves its file from the working directory at import, so the
 * directory is moved before the module is loaded and every case here writes
 * inside a temporary one. Vitest isolates a file per fork, so the move reaches
 * nothing else.
 */
let store: typeof import('../../server/visits-store')

let directory: string

const FILE = join('.data', 'visits.json')

beforeAll(async () => {
	// A temporary directory can sit behind a link, and macOS points /tmp at
	// /private/tmp. The working directory always reports the resolved path, so
	// the path is resolved here to let the two agree.
	directory = await realpath(await mkdtemp(join(tmpdir(), 'places-visits-')))

	process.chdir(directory)

	expect(process.cwd()).toBe(directory)

	store = await import('../../server/visits-store')
})

beforeEach(async () => {
	await rm(join(directory, '.data'), { recursive: true, force: true })
})

/** Writes the stored document, in whatever shape a case is about. */
async function stored(document: unknown): Promise<void> {
	await mkdir(join(directory, '.data'), { recursive: true })

	await writeFile(join(directory, FILE), JSON.stringify(document), 'utf8')
}

/** A seed, in the shape the route composes from the places. */
function seed(visits: Partial<Visits>): () => Promise<Visits> {
	return async () => ({ states: [], countries: [], ...visits })
}

describe('listVisits', () => {
	it('answers with both scopes empty where no file exists and nothing seeds it', async () => {
		expect(await store.listVisits()).toEqual({ states: [], countries: [] })
	})

	it('answers with the seed where no file exists yet', async () => {
		expect(await store.listVisits(seed({ states: ['Oregon'] }))).toEqual({
			states: ['Oregon'],
			countries: [],
		})
	})

	it('reads the file rather than the seed once one exists', async () => {
		await stored({ states: ['Nevada'], countries: ['France'] })

		expect(await store.listVisits(seed({ states: ['Oregon'] }))).toEqual({
			states: ['Nevada'],
			countries: ['France'],
		})
	})

	// A bare list is what this store wrote before it drew anything outside the
	// United States. The reader keeps the designations they had.
	it('reads a bare list as the states it was', async () => {
		await stored(['Oregon', 'Nevada'])

		expect(await store.listVisits()).toEqual({ states: ['Nevada', 'Oregon'], countries: [] })
	})

	it('sorts each scope and drops what is not a name', async () => {
		await stored({ states: ['Oregon', 42, '  ', 'Nevada', 'Oregon'], countries: null })

		expect(await store.listVisits()).toEqual({ states: ['Nevada', 'Oregon'], countries: [] })
	})

	it('answers with both scopes empty for a document that is neither shape', async () => {
		await stored('everywhere')

		expect(await store.listVisits()).toEqual({ states: [], countries: [] })
	})
})

describe('setVisit', () => {
	it('marks a region and answers with both scopes', async () => {
		expect(await store.setVisit('states', 'Oregon', true)).toEqual({
			states: ['Oregon'],
			countries: [],
		})
	})

	it('unmarks a region', async () => {
		await stored({ states: ['Nevada', 'Oregon'], countries: [] })

		expect(await store.setVisit('states', 'Oregon', false)).toEqual({
			states: ['Nevada'],
			countries: [],
		})
	})

	// Sent twice it leaves the same set, which is what a toggle pressed through a
	// dropped response needs.
	it('states the designation rather than changing it', async () => {
		await store.setVisit('countries', 'France', true)

		expect(await store.setVisit('countries', 'France', true)).toEqual({
			states: [],
			countries: ['France'],
		})
	})

	// The reason the two scopes are kept apart at all: Georgia is a state of the
	// United States and Georgia is a country, and one list cannot say which of
	// them a reader marked.
	it('keeps a name marked in one scope out of the other', async () => {
		const visits = await store.setVisit('states', 'Georgia', true)

		expect(visits).toEqual({ states: ['Georgia'], countries: [] })

		expect(await store.setVisit('countries', 'Georgia', false)).toEqual({
			states: ['Georgia'],
			countries: [],
		})
	})

	// The first write of a seeded file must not drop what the reader already had.
	it('persists the seed with the change applied, on the first write', async () => {
		expect(await store.setVisit('countries', 'France', true, seed({ states: ['Oregon'] }))).toEqual(
			{ states: ['Oregon'], countries: ['France'] },
		)

		// The file is the whole answer from here, so the seed is never asked again.
		expect(await store.listVisits()).toEqual({ states: ['Oregon'], countries: ['France'] })
	})

	it('leaves the other scope untouched', async () => {
		await stored({ states: ['Oregon'], countries: ['France'] })

		expect(await store.setVisit('countries', 'Japan', true)).toEqual({
			states: ['Oregon'],
			countries: ['France', 'Japan'],
		})
	})
})
