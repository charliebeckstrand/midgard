import { workerData } from 'piscina'
import { type ApiTask, type BarrelApi, createApiExtractor } from './api.ts'

// The thread of `createApiWorker` (`api.ts`). Node runs this file with the
// types removed, so the file and each file that it imports must use only the
// TypeScript syntax that Node can remove.

const extractor = createApiExtractor(workerData as string)

// The extracts that run. The pool sends tasks ahead, so a `close` can come
// before an `extract` before it ends.
const running = new Set<Promise<BarrelApi>>()

/** Runs a task of `createApiWorker`. Only `extract` gives a result. */
export async function run(task: ApiTask): Promise<BarrelApi | undefined> {
	if (task.type === 'extract') {
		const extract = extractor.extract(task.barrel)

		running.add(extract)

		try {
			return await extract
		} finally {
			running.delete(extract)
		}
	}

	if (task.type === 'refresh') {
		extractor.refresh(task.change)

		return undefined
	}

	await Promise.allSettled(running)

	extractor.close()

	return undefined
}
