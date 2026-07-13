import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/**
 * Curated Shiki surface for the docs build. `defineDocsConfig` aliases `shiki`
 * to this module, so the public CodeBlock's `import('shiki')` resolves here
 * instead of pulling `shiki/bundle/web` (every web grammar + theme and the
 * ~600 kB Oniguruma wasm). It carries only what the docs render — `tsx` for
 * derived snippets and prop examples, `typescript` for markdown ` ```ts `
 * fences, `bash` for install commands, `json` — under the one theme in use,
 * `github-dark-default`, tokenized by the JavaScript regex engine (no wasm).
 *
 * A language outside this set makes `codeToHtml` reject; CodeBlock catches that
 * and keeps its plain `<pre>` fallback, so narrowing the set degrades unbundled
 * languages to unhighlighted text rather than breaking them.
 */
let highlighter: Promise<HighlighterCore> | null = null

function getHighlighter(): Promise<HighlighterCore> {
	// `forgiving` skips the few TextMate patterns the JS engine can't compile
	// rather than throwing mid-tokenize, so a grammar edge case never strands a
	// snippet on the fallback.
	highlighter ??= createHighlighterCore({
		engine: createJavaScriptRegexEngine({ forgiving: true }),
		langs: [
			import('@shikijs/langs/tsx'),
			import('@shikijs/langs/typescript'),
			import('@shikijs/langs/bash'),
			import('@shikijs/langs/json'),
		],
		themes: [import('@shikijs/themes/github-dark-default')],
	})

	return highlighter
}

/**
 * Tokenize `code` to themed HTML, matching the `codeToHtml` export CodeBlock
 * destructures from `shiki`. Loads the shared core highlighter on first call.
 */
export async function codeToHtml(
	code: string,
	options: Parameters<HighlighterCore['codeToHtml']>[1],
): Promise<string> {
	const hl = await getHighlighter()

	return hl.codeToHtml(code, options)
}
