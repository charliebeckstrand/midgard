import { type HighlightRequest, highlight } from './shiki-highlighter'

/** A request from `shiki.ts`. The `id` pairs it with its reply. */
export type WorkerRequest = HighlightRequest & { id: number; code: string }

/** The reply to a {@link WorkerRequest}: the markup, or the message of the error. */
export type WorkerReply = { id: number; html: string } | { id: number; error: string }

// Each request runs on this thread, so the tokenizer never blocks the page.
self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
	const { id, code, lang, theme } = data

	highlight(code, { lang, theme }).then(
		(html) => self.postMessage({ id, html } satisfies WorkerReply),
		(error: unknown) => self.postMessage({ id, error: String(error) } satisfies WorkerReply),
	)
}
