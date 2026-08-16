import { mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createQueue, readJsonFile, writeJsonFile } from '../../server/json-file'

async function directory(): Promise<string> {
	return mkdtemp(join(tmpdir(), 'recipes-'))
}

describe('readJsonFile', () => {
	it('answers with nothing where the file does not exist yet', async () => {
		expect(await readJsonFile(join(await directory(), 'recipes.json'))).toBeUndefined()
	})

	it('reads a document back', async () => {
		const file = join(await directory(), 'recipes.json')

		await writeJsonFile(file, [{ id: 'r1' }])

		expect(await readJsonFile(file)).toEqual([{ id: 'r1' }])
	})

	// A missing file is the first run and not a fault; anything else is. A parse
	// failure answered as an empty store would hide a broken file behind a store
	// that had simply stopped holding anything.
	it('throws on a file that is not JSON', async () => {
		const file = join(await directory(), 'recipes.json')

		await writeFile(file, '{ not json', 'utf8')

		await expect(readJsonFile(file)).rejects.toThrow()
	})
})

describe('writeJsonFile', () => {
	it('makes the directory it writes into', async () => {
		const file = join(await directory(), 'nested', 'deeper', 'recipes.json')

		await writeJsonFile(file, ['a'])

		expect(await readJsonFile(file)).toEqual(['a'])
	})

	it('leaves no temporary file behind', async () => {
		const path = await directory()

		await writeJsonFile(join(path, 'recipes.json'), ['a'])

		expect(await readdir(path)).toEqual(['recipes.json'])
	})
})

describe('createQueue', () => {
	// Two requests landing together would otherwise each read the same document,
	// apply one change, and write back — and the second would drop the first.
	it('runs work one at a time', async () => {
		const serialize = createQueue()

		const order: string[] = []

		const slow = serialize(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10))

			order.push('first')
		})

		const quick = serialize(async () => {
			order.push('second')
		})

		await Promise.all([slow, quick])

		expect(order).toEqual(['first', 'second'])
	})

	// One error must not deadlock every write after it.
	it('keeps running after a failure', async () => {
		const serialize = createQueue()

		await expect(serialize(() => Promise.reject(new Error('disk full')))).rejects.toThrow(
			'disk full',
		)

		await expect(serialize(async () => 'written')).resolves.toBe('written')
	})

	it('hands back what the work returned', async () => {
		expect(await createQueue()(async () => 42)).toBe(42)
	})
})
