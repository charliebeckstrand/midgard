import type { CodeToHastOptions } from 'shiki/core'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import shellscript from 'shiki/langs/shellscript.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import typescript from 'shiki/langs/typescript.mjs'
import githubDarkDefault from 'shiki/themes/github-dark-default.mjs'

// Curated Shiki build for the docs site, aliased over the bare `shiki`
// specifier by the docs engine (see engine/vite/index.ts). The public
// CodeBlock highlights only tsx, typescript, and the lone `lang="bash"` demo
// with github-dark-default, so we register those three grammars and one theme
// against `shiki/core` instead of pulling `shiki/bundle/web` — that bundle ships
// ~50 grammars (cpp, php, blade, julia, vue-vine…), ~30 themes, and a 622 kB
// oniguruma-wasm chunk, none of which the docs reach.

// The JS regex engine tokenizes in-process, so no oniguruma-wasm chunk is
// emitted or prebundled. `forgiving` skips the handful of Oniguruma-only
// patterns in the shell grammar rather than throwing on them.
const engine = createJavaScriptRegexEngine({ forgiving: true })

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

/**
 * Tokenize `code` to a highlighted `<pre>` string, matching the signature of
 * Shiki's bundled `codeToHtml` shorthand that {@link CodeBlock} consumes.
 *
 * @param code - Source to highlight.
 * @param options - Shiki options; `lang` must be one of the curated grammars
 *   (`tsx`, `typescript`, `bash`) and `theme` `github-dark-default`.
 * @returns The highlighted markup.
 */
export async function codeToHtml(code: string, options: CodeToHastOptions): Promise<string> {
	const hl = await getHighlighter()

	return hl.codeToHtml(code, options)
}
