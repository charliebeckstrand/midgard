import type { BundledLanguage, BundledTheme } from 'shiki'
import type { ShikiReply, ShikiRequest } from './code-shiki-highlighter'
import { openShikiWorker } from './code-shiki-port'

// The main-thread side of the Shiki worker. Its one runtime import is the
// small module that starts the worker. A test that must empty the memo cells
// resets its module registry and imports this file again, and a small import
// keeps the cost of that step out of the time limit of the test.

type Pending = { resolve: (html: string | undefined) => void; reject: (reason: unknown) => void }

let worker: Worker | null = null

let nextId = 0

const pending = new Map<number, Pending>()

/** The pending or settled warm-up of each language and theme. */
const warmups = new Map<string, Promise<void>>()

/**
 * Rejects each request in flight and drops the worker, so the next request
 * starts a new one. The new worker holds no grammar, so the warm-ups go too.
 */
function fail(reason: unknown) {
	for (const request of pending.values()) request.reject(reason)

	pending.clear()

	warmups.clear()

	worker?.terminate()

	worker = null
}

function getWorker(): Worker {
	if (worker) return worker

	const next = openShikiWorker()

	if (!next) throw new Error('ui: CodeBlock highlights in a Worker, and this environment has none')

	next.onmessage = ({ data }: MessageEvent<ShikiReply>) => {
		const request = pending.get(data.id)

		if (!request) return

		pending.delete(data.id)

		if ('error' in data) request.reject(new Error(data.error))
		else request.resolve(data.html)
	}

	// A worker chunk that does not load, such as after a deploy, gives an error
	// event and no reply. Each request in flight then fails, and CodeBlock shows
	// its plain block.
	next.onerror = (event) => {
		event.preventDefault()

		fail(new Error(`ui: the Shiki worker failed: ${event.message}`))
	}

	worker = next

	return next
}

/** Sends one request to the worker, and resolves with the markup of the reply. */
function send(request: Omit<ShikiRequest, 'id'>): Promise<string | undefined> {
	return new Promise((resolve, reject) => {
		const target = getWorker()

		const id = nextId++

		pending.set(id, { resolve, reject })

		target.postMessage({ ...request, id } satisfies ShikiRequest)
	})
}

/**
 * Highlights `code` in the Shiki worker.
 *
 * @returns The markup, the output of Shiki's `codeToHtml` with the options of
 *   `highlightShiki`.
 * @internal
 */
export async function highlightCode(code: string, lang: string, theme: string): Promise<string> {
	const html = await send({ code, lang, theme })

	if (html === undefined) throw new Error('ui: the Shiki worker sent no markup')

	return html
}

/**
 * Starts the Shiki worker and loads a grammar and a theme in it, ahead of the
 * first `CodeBlock` that uses them.
 *
 * @param lang - The grammar to load. The default is `'tsx'`, the default of `CodeBlock`.
 * @param theme - The theme to load. The default is `'github-dark-default'`.
 * @returns A promise that settles when the worker holds the grammar and the
 *   theme. A failure rejects it.
 * @remarks
 * The worker loads Shiki, then each grammar and each theme as a lazy chunk.
 * Nothing loads on the main thread. Call this at idle time to remove the load
 * from the wait of the first block. For `tsx` and `ts`, the worker then
 * tokenizes a few short samples, so the first block finds the RegExps of the
 * frequent rules ready. For another grammar, the first block builds them. That
 * work runs in the worker and does not block the page.
 *
 * The promise of each pair of `lang` and `theme` is memoized. A rejection
 * clears it and reaches the caller, so the next call loads again. That beats
 * replaying one transient chunk failure for the rest of the session. A failure
 * of the worker clears each promise, because the next worker holds no grammar.
 */
export function loadShiki(
	lang: BundledLanguage = 'tsx',
	theme: BundledTheme = 'github-dark-default',
): Promise<void> {
	const key = `${lang}\u0000${theme}`

	let warmup = warmups.get(key)

	if (!warmup) {
		warmup = send({ lang, theme }).then(
			() => {},
			(error: unknown) => {
				// Drop the memo before the rejection leaves. A cell left holding it
				// answers every later call with the same failure.
				warmups.delete(key)

				throw error
			},
		)

		warmups.set(key, warmup)
	}

	return warmup
}
