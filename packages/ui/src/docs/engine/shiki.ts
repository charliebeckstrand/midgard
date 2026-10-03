import type { CodeToHastOptions } from 'shiki/core'
import type { WorkerReply, WorkerRequest } from './shiki-worker'

// The `shiki` module of the docs site. The docs engine aliases it over the bare
// `shiki` specifier (see engine/vite/index.ts), so `CodeBlock` calls this
// `codeToHtml` through its lazy `import('shiki')`.
//
// The highlighter runs in a worker. A first tokenization of a grammar compiles
// its RegExps, and on a phone at 4x CPU that took up to 1.2 s on the main
// thread. In the worker, the warm-up and each block cost the page only a
// message.

type Pending = { resolve: (html: string) => void; reject: (reason: unknown) => void }

let worker: Worker | null = null

let nextId = 0

const pending = new Map<number, Pending>()

/** Reject each request in flight, and drop the worker, so that the next request starts a new one. */
function fail(reason: unknown) {
	for (const request of pending.values()) request.reject(reason)

	pending.clear()

	worker?.terminate()

	worker = null
}

function getWorker(): Worker {
	if (worker) return worker

	const next = new Worker(new URL('./shiki-worker.ts', import.meta.url), { type: 'module' })

	next.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
		const request = pending.get(data.id)

		if (!request) return

		pending.delete(data.id)

		if ('error' in data) request.reject(new Error(data.error))
		else request.resolve(data.html)
	}

	// A worker chunk that does not load, such as after a deploy, gives an error
	// event and no reply. Each request in flight then fails, and `CodeBlock`
	// shows its plain fallback.
	next.onerror = (event) => {
		event.preventDefault()

		fail(new Error(`docs: the Shiki worker failed: ${event.message}`))
	}

	worker = next

	return next
}

/**
 * Tokenize `code` to a highlighted `<pre>` string, with the signature of
 * Shiki's bundled `codeToHtml` shorthand that {@link CodeBlock} calls.
 *
 * @param code - Source to highlight.
 * @param options - `lang` must be one of the curated grammars (`tsx`,
 *   `typescript`, `bash`), and `theme` must be `github-dark-default`. The
 *   `transformers` of `CodeBlock` do not go to the worker, which applies the
 *   same change (see `highlight` in `shiki-highlighter.ts`). Other options give
 *   an error.
 * @returns The highlighted markup.
 */
export function codeToHtml(code: string, options: CodeToHastOptions): Promise<string> {
	const unsupported = new Error('docs: the Shiki worker takes only a `lang` and a `theme` by name')

	// A `themes` pair, the other form of the options, is not supported.
	if (!('theme' in options)) return Promise.reject(unsupported)

	const { lang, theme, transformers: _transformers, ...rest } = options

	if (Object.keys(rest).length > 0 || typeof lang !== 'string' || typeof theme !== 'string') {
		return Promise.reject(unsupported)
	}

	// Each browser at the floor of `.browserslistrc` runs module workers. The
	// unit tests replace `shiki` with a double and never reach this module.
	if (typeof Worker === 'undefined') {
		return Promise.reject(new Error('docs: the Shiki worker needs Worker support'))
	}

	const id = nextId++

	return new Promise((resolve, reject) => {
		pending.set(id, { resolve, reject })

		getWorker().postMessage({ id, code, lang, theme } satisfies WorkerRequest)
	})
}
