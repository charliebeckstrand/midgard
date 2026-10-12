import { workerData } from 'node:worker_threads'
import { type ApiMessage, type BarrelApi, createApiExtractor } from './api.ts'
import { serveThread } from './thread.ts'

// The thread of `createApiWorker` (`api.ts`). Node runs this file with the
// types removed, so the file and each file that it imports must use only the
// TypeScript syntax that Node can remove.

const extractor = createApiExtractor(workerData as string)

// A `refresh` gets no reply, so its result is nothing.
serveThread<ApiMessage, BarrelApi | undefined>(
	async (message) => {
		if (message.type === 'extract') return extractor.extract(message.barrel)

		extractor.refresh(message.change)

		return undefined
	},
	() => extractor.close(),
)
