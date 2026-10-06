import type { BundledLanguage, BundledTheme } from 'shiki'
import type { ShikiHighlight, ShikiReply, ShikiRequest } from './code-shiki-highlighter'
import { openShikiWorker } from './code-shiki-port'

// The main-thread side of the Shiki worker. Its one runtime import is the
// small module that starts the worker. A test that must empty the state of this
// module resets its module registry and imports this file again, and a small
// import keeps the cost of that step out of the time limit of the test.

/** The grammar of a `CodeBlock` that gives no `lang`. */
export const DEFAULT_LANG = 'tsx' satisfies BundledLanguage

/** The theme of a `CodeBlock` that gives no `theme`. */
export const DEFAULT_THEME = 'github-dark-default' satisfies BundledTheme

type Pending = {
	resolve: (highlight: ShikiHighlight | undefined) => void
	reject: (reason: unknown) => void
}

// The longest time that one request waits for its reply, in milliseconds. The
// worker sets no time limit on a tokenization, so a rule that backtracks can
// hold the worker with no end. The worker then answers no request. After this
// time the client stops the worker, and the next request starts a new one. The
// time is long, because it also includes the start of the worker, the load of
// a grammar and a theme on a slow network, and the wait behind earlier requests.
const REPLY_TIMEOUT = 30_000

let worker: Worker | null = null

let nextId = 0

const pending = new Map<number, Pending>()

/**
 * Rejects each request in flight and drops the worker, so the next request
 * starts a new one.
 */
function fail(reason: unknown) {
	for (const request of pending.values()) request.reject(reason)

	pending.clear()

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
		else request.resolve(data.highlight)
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

/**
 * Sends one request to the worker, and resolves with the highlight of the reply.
 * When no reply comes in {@link REPLY_TIMEOUT} ms, each request in flight
 * fails, and the next request starts a new worker.
 */
function send(request: Omit<ShikiRequest, 'id'>): Promise<ShikiHighlight | undefined> {
	return new Promise((resolve, reject) => {
		const target = getWorker()

		const id = nextId++

		const timer = setTimeout(
			() => fail(new Error(`ui: the Shiki worker sent no reply in ${REPLY_TIMEOUT} ms`)),
			REPLY_TIMEOUT,
		)

		// A reply or a failure stops the timer, so a settled request keeps no timer.
		pending.set(id, {
			resolve: (highlight) => {
				clearTimeout(timer)

				resolve(highlight)
			},
			reject: (reason) => {
				clearTimeout(timer)

				reject(reason)
			},
		})

		target.postMessage({ ...request, id } satisfies ShikiRequest)
	})
}

/**
 * Highlights `code` in the Shiki worker.
 *
 * @returns The markup, the output of Shiki's `codeToHtml` with the options of
 *   `highlightShiki`, and the background color and the type of the theme.
 * @internal
 */
export async function highlightCode(
	code: string,
	lang: string,
	theme: string,
): Promise<ShikiHighlight> {
	const highlight = await send({ code, lang, theme })

	if (highlight === undefined) throw new Error('ui: the Shiki worker sent no markup')

	return highlight
}

/**
 * Starts the Shiki worker and loads a grammar and a theme in it, ahead of the
 * first `CodeBlock` that uses them.
 *
 * @param lang - The grammar to load. The default is the default of `CodeBlock`.
 * @param theme - The theme to load. The default is the default of `CodeBlock`.
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
 * The worker loads each grammar and each theme one time. A call for a pair that
 * it holds settles at once, and a call after a failure loads again.
 *
 * A request that gets no reply in 30 seconds fails, and so does each other
 * request in flight. The client then stops the worker, and the next request
 * starts a new one. This bounds a tokenization that does not stop.
 */
export function loadShiki(
	lang: BundledLanguage = DEFAULT_LANG,
	theme: BundledTheme = DEFAULT_THEME,
): Promise<void> {
	return send({ lang, theme }).then(() => {})
}
