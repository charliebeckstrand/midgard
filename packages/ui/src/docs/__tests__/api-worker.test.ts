// @vitest-environment node
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createApiExtractor, createApiWorker } from '../plugin/api.ts'

// The docs plugin reads the API data in a worker thread (`createApiWorker`).
// The thread must give the same data as the extractor on the main thread.

const UI_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')

const BARRELS = ['components/button', 'components/select', 'components/tabs']

const extractor = createApiExtractor(UI_ROOT)

const worker = createApiWorker(UI_ROOT)

afterAll(() => {
	extractor.close()

	worker.close()
})

describe('API worker', { timeout: 60_000 }, () => {
	it('gives the data of the extractor for requests that wait side by side', async () => {
		const threaded = await Promise.all(BARRELS.map((barrel) => worker.extract(barrel)))

		for (const [index, barrel] of BARRELS.entries()) {
			expect(threaded[index]).toEqual(await extractor.extract(barrel))
		}
	})

	it('rejects with the error of the thread', async () => {
		await expect(worker.extract('components/no-such-barrel')).rejects.toThrow(/no-such-barrel/)
	})
})
