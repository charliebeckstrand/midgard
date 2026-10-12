import {
	highlightShiki,
	type ShikiHighlight,
	type ShikiRequest,
} from '../../components/code/code-shiki-highlighter.ts'

// The thread of the highlighter of the docs plugin (`index.ts`). Shiki
// highlights each example in this thread, so the main thread of Vite
// transforms the other modules in that time.

/** A task of the thread: the code to highlight, with its language and theme. */
export type HighlightTask = Required<Pick<ShikiRequest, 'code' | 'lang' | 'theme'>>

/** Highlights the code of `task`. */
export function run({ code, lang, theme }: HighlightTask): Promise<ShikiHighlight> {
	return highlightShiki(code, lang, theme)
}
