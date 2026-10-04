import { Worker } from 'node:worker_threads'
import type { ComponentApi } from '../types'
import type { ApiExtractor } from './api-extractor'
import type { ExtractorRequest, ExtractorResponse, ExtractorWorkerData } from './extractor-thread'

/**
 * The dev server's handle on an {@link ApiExtractor} that runs in a worker
 * thread. Extraction opens a ts-morph project and a type checker, and it holds
 * the thread for seconds. In the worker, that work runs next to the dev server
 * and does not stop it.
 *
 * The worker starts its first pass when the handle is created. The first
 * {@link ApiExtractorWorker.getAll} returns that pass, so a dev server that
 * creates the handle at start gets the record early.
 */
export type ApiExtractorWorker = {
	/** The full API-reference record, after each change reported before the call. */
	getAll: () => Promise<Record<string, ComponentApi[]>>
	/** Report a changed, added, or removed file to the extractor. */
	notifyChanged: (file: string) => void
	/** Stop the worker. A pending `getAll` rejects. */
	close: () => Promise<void>
}

type Pending = {
	resolve: (record: Record<string, ComponentApi[]>) => void
	reject: (error: Error) => void
}

/** Start an extractor worker for the package whose source root is `srcDir`. */
export function startApiExtractorWorker(srcDir: string): ApiExtractorWorker {
	const workerData: ExtractorWorkerData = { srcDir }

	const worker = new Worker(new URL('./extractor-thread.mjs', import.meta.url), { workerData })

	const pending = new Map<number, Pending>()

	let nextId = 0

	// Set when the worker fails or exits. Each later request rejects with it.
	let failure: Error | null = null

	// The worker keeps the process alive only while a request waits on it.
	worker.unref()

	function settle(id: number): Pending | undefined {
		const entry = pending.get(id)

		pending.delete(id)

		if (pending.size === 0) worker.unref()

		return entry
	}

	function fail(error: Error): void {
		failure ??= error

		for (const id of [...pending.keys()]) settle(id)?.reject(failure)
	}

	worker.on('message', (response: ExtractorResponse) => {
		const entry = settle(response.id)

		if (!entry) return

		if ('record' in response) entry.resolve(response.record)
		else entry.reject(new Error(response.error))
	})

	worker.on('error', fail)

	worker.on('exit', (code) => fail(new Error(`api-reference extractor exited with code ${code}`)))

	function send(message: ExtractorRequest): void {
		worker.postMessage(message)
	}

	function request(): Promise<Record<string, ComponentApi[]>> {
		if (failure) return Promise.reject(failure)

		const id = nextId++

		const result = new Promise<Record<string, ComponentApi[]>>((resolve, reject) => {
			pending.set(id, { resolve, reject })
		})

		worker.ref()

		send({ type: 'getAll', id })

		return result
	}

	// The first pass starts now. A change report makes it stale, and the next
	// `getAll` then asks for a new record.
	let initial: Promise<Record<string, ComponentApi[]>> | null = request()

	// A caller that reads `initial` later handles its rejection. This handler
	// stops Node from reporting it as unhandled first.
	initial.catch(() => {})

	return {
		getAll() {
			const result = initial ?? request()

			initial = null

			return result
		},

		notifyChanged(file) {
			initial = null

			if (!failure) send({ type: 'changed', file })
		},

		async close() {
			await worker.terminate()
		},
	}
}
