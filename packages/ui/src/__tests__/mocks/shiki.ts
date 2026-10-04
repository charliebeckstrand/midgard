/**
 * Double of `components/code/code-shiki-port`, applied globally via
 * `setup/module-mocks.ts`.
 *
 * jsdom has no `Worker`, so the real port gives `null` and a block keeps its
 * plain fallback. The double gives a fake Shiki worker instead. The fake runs
 * no grammar: its markup is the minimum that the consumers assert. CodeBlock
 * needs a `pre.shiki` wrapper, and Markdown asserts the resolved grammar via
 * `data-lang`. The real worker runs in the browser suite, and the node suite
 * of `code-shiki-highlighter` reads the real markup.
 *
 * Global rather than per-file on purpose: markdown.test.tsx and
 * code-block.test.tsx previously each declared a divergent local
 * `vi.mock('shiki')` (see setup/module-mocks.ts). Whichever file loaded first
 * won the shared module registry, so Markdown's `data-lang` assertion
 * intermittently saw CodeBlock's attribute-less markup and timed out. One
 * global factory both agree on removes the order dependence.
 *
 * boundary/code-block-load-shiki.test.ts registers a port of its own with
 * `vi.doMock`. That file runs on forks, where a per-file mock reaches no
 * sibling, so the rule above does not bind it.
 */

import { vi } from 'vitest'
import type { ShikiReply, ShikiRequest } from '../../components/code/code-shiki-highlighter'

/** Escape `code` as Shiki does, so the text of the markup is the code itself. */
const escapeHtml = (code: string) =>
	code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

/**
 * The tokenization of the fake worker. A suite reads its calls, or holds one
 * pass with `mockImplementationOnce`.
 */
export const highlight = vi.fn(
	async (code: string, lang: string, _theme: string) =>
		`<pre class="shiki" data-lang="${lang}" tabindex="-1"><code>${escapeHtml(code)}</code></pre>`,
)

/** The load of a grammar and a theme in the fake worker, for a request with no code. */
export const load = vi.fn(async (_lang: string, _theme: string) => {})

/** A fake of the Shiki worker. It answers each request as the real worker does. */
export class FakeShikiWorker {
	onmessage: ((event: MessageEvent<ShikiReply>) => void) | null = null

	onerror: ((event: ErrorEvent) => void) | null = null

	terminated = false

	postMessage({ id, code, lang, theme }: ShikiRequest) {
		const work =
			code === undefined
				? load(lang, theme).then((): ShikiReply => ({ id }))
				: highlight(code, lang, theme).then((html): ShikiReply => ({ id, html }))

		work.then(
			(reply) => this.reply(reply),
			(error: unknown) => this.reply({ id, error: String(error) }),
		)
	}

	terminate() {
		this.terminated = true
	}

	/**
	 * Fails as a worker whose chunk does not load: an error event, and no reply.
	 *
	 * @returns The event, so a case can read whether the handler canceled it.
	 */
	crash(message: string): ErrorEvent {
		const event = new ErrorEvent('error', { message, cancelable: true })

		this.onerror?.(event)

		return event
	}

	/**
	 * Delivers a reply as a message event. A real worker delivers it in a task of
	 * its own. The fake delivers it in a microtask, so one tick of a case runs
	 * each reply and the main-thread work behind it.
	 */
	private reply(data: ShikiReply) {
		if (!this.terminated) this.onmessage?.(new MessageEvent('message', { data }))
	}
}

/** The worker port, which opens a fake worker where the real port opens the module worker. */
export default {
	openShikiWorker: (): Worker | null => new FakeShikiWorker() as unknown as Worker,
}
