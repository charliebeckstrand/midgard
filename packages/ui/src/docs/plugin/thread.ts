import { parentPort, Worker } from 'node:worker_threads'

// A worker thread that does the slow work of the docs plugin, so that the
// main thread of Vite can transform the other modules in that time. The
// thread handles its messages one at a time, in the order that they come.

/** A message from {@link createThread} to its thread. A message with an `id` waits for a reply. */
type Envelope<Message> = { id?: number; message: Message } | { close: true }

/** The reply of the thread to a message with an `id`: the result, or the stack of the error. */
type Reply<Result> = { id: number; result: Result } | { id: number; error: string }

/** The main side of a thread of {@link createThread}. */
export type Thread<Message, Result> = {
	/** Sends `message`, and gives the result of the thread for it. The thread starts on the first request. */
	request(message: Message): Promise<Result>
	/** Sends `message` with no reply. A thread that does not run drops it. */
	post(message: Message): void
	/** Stops the thread after the messages before. A later request starts it again. */
	close(): void
}

/** One running thread, with the requests that wait for its reply, by id. */
type Running<Result> = {
	worker: Worker
	pending: Map<number, { resolve: (result: Result) => void; reject: (error: Error) => void }>
}

/**
 * Creates the main side of a thread that runs the module at `url` with
 * `workerData`. The module answers with {@link serveThread}. When the thread
 * fails or stops, each request that waits on it fails.
 */
export function createThread<Message, Result>(
	url: URL,
	workerData?: unknown,
): Thread<Message, Result> {
	let running: Running<Result> | undefined

	let next = 0

	const start = (): Running<Result> => {
		const worker = new Worker(url, { workerData })

		const pending: Running<Result>['pending'] = new Map()

		const fail = (error: Error) => {
			for (const request of pending.values()) request.reject(error)

			pending.clear()
		}

		worker.on('message', (reply: Reply<Result>) => {
			const request = pending.get(reply.id)

			pending.delete(reply.id)

			if ('error' in reply) request?.reject(new Error(reply.error))
			else request?.resolve(reply.result)
		})

		worker.on('error', fail)

		worker.on('exit', (code) =>
			fail(new Error(`docs: a thread of the plugin stopped with the code ${code}`)),
		)

		return { worker, pending }
	}

	return {
		request(message) {
			running ??= start()

			const id = next++

			const { worker, pending } = running

			return new Promise((resolve, reject) => {
				pending.set(id, { resolve, reject })

				worker.postMessage({ id, message } satisfies Envelope<Message>)
			})
		},
		post(message) {
			running?.worker.postMessage({ message } satisfies Envelope<Message>)
		},
		close() {
			running?.worker.postMessage({ close: true } satisfies Envelope<Message>)

			// A thread that does not stop does not keep the process open.
			running?.worker.unref()

			running = undefined
		},
	}
}

/**
 * Answers the messages of {@link createThread} in the thread, one at a time,
 * with `handle`. On `close`, it calls `onClose` and stops the thread.
 */
export function serveThread<Message, Result>(
	handle: (message: Message) => Result | Promise<Result>,
	onClose?: () => void,
): void {
	let queue = Promise.resolve()

	const answer = async (envelope: Envelope<Message>) => {
		if ('close' in envelope) {
			onClose?.()

			parentPort?.close()

			return
		}

		const { id, message } = envelope

		if (id === undefined) {
			await handle(message)

			return
		}

		let reply: Reply<Result>

		try {
			reply = { id, result: await handle(message) }
		} catch (error) {
			reply = { id, error: error instanceof Error ? (error.stack ?? error.message) : String(error) }
		}

		parentPort?.postMessage(reply)
	}

	parentPort?.on('message', (envelope: Envelope<Message>) => {
		queue = queue.then(() => answer(envelope))
	})
}
