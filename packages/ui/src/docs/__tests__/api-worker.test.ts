// @vitest-environment node
import { afterAll, describe, expect } from 'vitest'
import { uiRoot } from '../../__tests__/helpers/walk-source.ts'
import { createApiWorker } from '../plugin/api.ts'
import { it } from './extractor.ts'

// The docs plugin reads the API data in a worker thread (`createApiWorker`).
// The thread must give the same data as the extractor on the main thread.

const BARRELS = ['components/button', 'components/select', 'components/tabs']

const worker = createApiWorker(uiRoot)

afterAll(() => worker.close())

describe('API worker', { timeout: 60_000 }, () => {
	it('gives the data of the extractor for requests that wait side by side', async ({
		extractor,
	}) => {
		const threaded = await Promise.all(BARRELS.map((barrel) => worker.extract(barrel)))

		for (const [index, barrel] of BARRELS.entries()) {
			expect(threaded[index]).toEqual(await extractor.extract(barrel))
		}
	})

	it('rejects with the error of the thread', async () => {
		await expect(worker.extract('components/no-such-barrel')).rejects.toThrow(/no-such-barrel/)
	})
})
