import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createQueue, readJsonFile, writeJsonFile } from '../../server/json-file'

/** The temporary directories a case made, swept after it. */
const made: string[] = []

async function directory(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), 'places-'))

	made.push(path)

	return path
}

afterEach(() => {
	made.length = 0
})

describe('readJsonFile', () => {
	it('answers with nothing where the file does not exist yet', async () => {
		expect(await readJsonFile(join(await directory(), 'places.json'))).toBeUndefined()
	})

	it('reads a document back', async () => {
		const file = join(await directory(), 'places.json')

		await writeJsonFile(file, [{ id: 'a1' }])

		expect(await readJsonFile(file)).toEqual([{ id: 'a1' }])
	})

	// A missing file is the first run and not a fault; anything else is. A parse
	// failure answered as an empty store would hide a broken file behind a store
	// that had simply stopped holding anything.
	it('throws on a file that is not JSON', async () => {
		const file = join(await directory(), 'places.json')

		await writeFile(file, '{ not json', 'utf8')

		await expect(readJsonFile(file)).rejects.toThrow()
	})
})

describe('writeJsonFile', () => {
	it('makes the directory it writes into', async () => {
		const file = join(await directory(), 'nested', 'deeper', 'places.json')

		await writeJsonFile(file, ['a'])

		expect(await readJsonFile(file)).toEqual(['a'])
	})

	it('leaves no temporary file behind', async () => {
		const path = await directory()

		await writeJsonFile(join(path, 'places.json'), ['a'])

		expect(await readdir(path)).toEqual(['places.json'])
	})

	it('writes tab-indented JSON, ending in one newline', async () => {
		const file = join(await directory(), 'places.json')

		await writeJsonFile(file, { id: 'a1' })

		expect(await readFile(file, 'utf8')).toBe('{\n\t"id": "a1"\n}\n')
	})
})

describe('createQueue', () => {
	// Two requests landing together must not each read the same document and write
	// back over one another. The chain puts the second read after the first write.
	it('runs work one at a time, in the order it was given', async () => {
		const serialize = createQueue()

		const order: string[] = []

		function work(name: string, delay: number) {
			return serialize(async () => {
				await new Promise((resolve) => setTimeout(resolve, delay))

				order.push(name)

				return name
			})
		}

		// The first is the slowest, so an unqueued run would finish them backwards.
		const results = await Promise.all([work('a', 20), work('b', 10), work('c', 0)])

		expect(order).toEqual(['a', 'b', 'c'])

		expect(results).toEqual(['a', 'b', 'c'])
	})

	it('hands each caller its own answer', async () => {
		const serialize = createQueue()

		expect(await serialize(async () => 1)).toBe(1)

		expect(await serialize(async () => 'two')).toBe('two')
	})

	// One error must not deadlock every write after it.
	it('survives work that throws', async () => {
		const serialize = createQueue()

		const failed = serialize(async () => {
			throw new Error('write failed')
		})

		await expect(failed).rejects.toThrow('write failed')

		expect(await serialize(async () => 'after')).toBe('after')
	})

	it('keeps a read after a failed write in order', async () => {
		const serialize = createQueue()

		const order: string[] = []

		const failed = serialize(async () => {
			order.push('first')

			throw new Error('write failed')
		})

		const next = serialize(async () => {
			order.push('second')
		})

		await expect(failed).rejects.toThrow()

		await next

		expect(order).toEqual(['first', 'second'])
	})
})
