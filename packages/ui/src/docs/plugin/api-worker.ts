import { parentPort, workerData } from 'node:worker_threads'
import { type ApiMessage, type ApiReply, createApiExtractor } from './api.ts'

// The thread of `createApiWorker` (`api.ts`). Node runs this file with the
// types removed, so the file and each file that it imports must use only the
// TypeScript syntax that Node can remove.

const extractor = createApiExtractor(workerData as string)

// The messages run one at a time, in the order that they come.
let queue = Promise.resolve()

parentPort?.on('message', (message: ApiMessage) => {
	queue = queue.then(() => handle(message))
})

async function handle(message: ApiMessage): Promise<void> {
	if (message.type === 'refresh') {
		extractor.refresh(message.change)

		return
	}

	if (message.type === 'close') {
		extractor.close()

		parentPort?.close()

		return
	}

	let reply: ApiReply

	try {
		reply = { id: message.id, api: await extractor.extract(message.barrel) }
	} catch (error) {
		reply = {
			id: message.id,
			error: error instanceof Error ? (error.stack ?? error.message) : String(error),
		}
	}

	parentPort?.postMessage(reply)
}
