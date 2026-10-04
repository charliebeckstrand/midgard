import {
	highlightShiki,
	loadShikiPair,
	type ShikiReply,
	type ShikiRequest,
} from './code-shiki-highlighter'

// The entry of the Shiki worker, which `code-shiki-port.ts` starts. Each
// request runs on this thread, so a tokenization never blocks the page.
self.onmessage = ({ data }: MessageEvent<ShikiRequest>) => {
	const { id, code, lang, theme } = data

	const work =
		code === undefined
			? loadShikiPair(lang, theme).then((): ShikiReply => ({ id }))
			: highlightShiki(code, lang, theme).then((html): ShikiReply => ({ id, html }))

	work.then(
		(reply) => self.postMessage(reply),
		(error: unknown) => self.postMessage({ id, error: String(error) } satisfies ShikiReply),
	)
}
