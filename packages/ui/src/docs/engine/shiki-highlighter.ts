import shellscript from '@shikijs/langs-precompiled/shellscript'
import tsx from '@shikijs/langs-precompiled/tsx'
import typescript from '@shikijs/langs-precompiled/typescript'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRawEngine } from 'shiki/engine/javascript'
import githubDarkDefault from 'shiki/themes/github-dark-default.mjs'

// Curated Shiki build for the docs site. It runs in the worker of `shiki.ts`,
// which the docs engine aliases over the bare `shiki` specifier (see
// engine/vite/index.ts). The public CodeBlock highlights only tsx, typescript,
// and the lone `lang="bash"` demo with github-dark-default, so we register
// those three grammars and one theme against `shiki/core` instead of pulling `shiki/bundle/web` — that bundle ships
// ~50 grammars (cpp, php, blade, julia, vue-vine…), ~30 themes, and a 622 kB
// oniguruma-wasm chunk, none of which the docs reach.

// The grammars come precompiled: their Oniguruma patterns are already JS
// RegExp source, so the raw engine does not translate each rule on its first
// use. That translation was about 40% of the first highlight on a demo page. The
// engine tokenizes in-process, so no oniguruma-wasm chunk is emitted or
// prebundled.
const engine = createJavaScriptRawEngine()

// Memoize the in-flight promise so the highlighter (and its grammars) is built
// at most once, mirroring the lazy `import('shiki')` boundary in CodeBlock.
let highlighter: ReturnType<typeof createHighlighterCore> | null = null

function getHighlighter() {
	if (!highlighter) {
		highlighter = createHighlighterCore({
			langs: [tsx, typescript, shellscript],
			themes: [githubDarkDefault],
			engine,
		})
	}

	return highlighter
}

/** What a caller asks the highlighter for. Each field crosses the worker boundary as data. */
export type HighlightRequest = {
	/** One of the curated grammars: `tsx`, `typescript` (or `ts`), or `bash`. */
	lang: string
	/** The curated theme, `github-dark-default`. */
	theme: string
}

/**
 * Tokenize `code` to a highlighted `<pre>` string.
 *
 * The `<pre>` gets `tabindex="-1"`, as the transformer of {@link CodeBlock}
 * sets it. A transformer is a function, and a function cannot go to a worker,
 * so the highlighter applies the same change here.
 *
 * @param code - Source to highlight.
 * @param request - The grammar and the theme.
 * @returns The highlighted markup.
 */
export async function highlight(code: string, { lang, theme }: HighlightRequest): Promise<string> {
	const hl = await getHighlighter()

	return hl.codeToHtml(code, {
		lang,
		theme,
		transformers: [
			{
				pre(node) {
					node.properties.tabindex = '-1'
				},
			},
		],
	})
}
