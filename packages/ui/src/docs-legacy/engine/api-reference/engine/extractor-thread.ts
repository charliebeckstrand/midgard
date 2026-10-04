import { parentPort, workerData } from 'node:worker_threads'
import type { ComponentApi } from '../types'
import { createApiExtractor } from './api-extractor'

/** A message from the dev server to the extractor worker. */
export type ExtractorRequest = { type: 'changed'; file: string } | { type: 'getAll'; id: number }

/** The answer of the worker to one `getAll` request. */
export type ExtractorResponse =
	| { id: number; record: Record<string, ComponentApi[]> }
	| { id: number; error: string }

/** The data that the worker starts with. */
export type ExtractorWorkerData = { srcDir: string }

const port = parentPort

if (!port) throw new Error('extractor-thread: run this module in a worker thread')

const { srcDir } = workerData as ExtractorWorkerData

// The worker holds the one extractor of the dev session. The extractor keeps
// its disk cache, its incremental state, and its canonical pass order.
const extractor = createApiExtractor(srcDir)

// Each message runs to completion before the next. A `changed` report that
// arrives during a pass thus applies to the next `getAll`, in the order that
// the dev server sent them.
port.on('message', (message: ExtractorRequest) => {
	if (message.type === 'changed') {
		extractor.notifyChanged(message.file)

		return
	}

	let response: ExtractorResponse

	try {
		response = { id: message.id, record: extractor.getAll() }
	} catch (error) {
		response = {
			id: message.id,
			error: error instanceof Error ? (error.stack ?? error.message) : String(error),
		}
	}

	port.postMessage(response)
})
