import type { HighlighterCore } from 'shiki'
import { createHighlighterCore, isSpecialLang, isSpecialTheme } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { bundledLanguages } from 'shiki/langs'
import { bundledThemes } from 'shiki/themes'

// The highlighter of the Shiki worker (`code-shiki-worker.ts`). Only the worker
// imports this module, so the main thread never loads a grammar or a regex
// engine.
//
// The engine is the JavaScript regex engine, not the Oniguruma WASM engine,
// which is a 622 kB chunk. The grammars are the plain bundled grammars, not
// the precompiled ones. A precompiled grammar writes each pattern as a RegExp
// literal with the `v` flag, which Chrome 111 and Safari 16.4 cannot parse.
// Both browsers are in the floor of `.browserslistrc`. The precompiled form
// halves the first tokenization, but that cost is in the worker, not on the
// page, so the smaller and wider form wins.

/** A request to the worker. A request with no `code` only loads the grammar and the theme. */
export type ShikiRequest = {
	/** Pairs the request with its reply. */
	id: number
	/** A Shiki language id or alias, such as `tsx` or `ts`. */
	lang: string
	/** A Shiki theme id, such as `github-dark-default`. */
	theme: string
	/** The source to highlight. */
	code?: string
}

/** The reply to a {@link ShikiRequest}: the markup, nothing for a load, or the message of the error. */
export type ShikiReply = { id: number; html?: string } | { id: number; error: string }

let highlighter: Promise<HighlighterCore> | null = null

/** The pending or settled load of each grammar and each theme, by kind and id. */
const loads = new Map<string, Promise<void>>()

function getHighlighter(): Promise<HighlighterCore> {
	highlighter ??= createHighlighterCore({ engine: createJavaScriptRegexEngine() })

	return highlighter
}

/**
 * Runs `start` once for `key`. A rejection clears the memo before it reaches
 * the caller, so the next call fetches the chunk again. One failed chunk fetch
 * then does not fail each later request.
 */
function once(key: string, start: () => Promise<void>): Promise<void> {
	let load = loads.get(key)

	if (!load) {
		load = start().catch((error: unknown) => {
			loads.delete(key)

			throw error
		})

		loads.set(key, load)
	}

	return load
}

function loadGrammar(lang: string): Promise<void> {
	// A plain-text id, such as `text`, needs no grammar.
	if (isSpecialLang(lang)) return Promise.resolve()

	return once(`lang\u0000${lang}`, async () => {
		// An own key only: a fence id such as `constructor` must not reach the prototype.
		if (!Object.hasOwn(bundledLanguages, lang)) {
			throw new Error(`Shiki bundles no grammar \`${lang}\``)
		}

		const hl = await getHighlighter()

		await hl.loadLanguage(bundledLanguages[lang as keyof typeof bundledLanguages])
	})
}

function loadTheme(theme: string): Promise<void> {
	if (isSpecialTheme(theme)) return Promise.resolve()

	return once(`theme\u0000${theme}`, async () => {
		if (!Object.hasOwn(bundledThemes, theme)) throw new Error(`Shiki bundles no theme \`${theme}\``)

		const hl = await getHighlighter()

		await hl.loadTheme(bundledThemes[theme as keyof typeof bundledThemes])
	})
}

/**
 * Loads the grammar of `lang` and the theme `theme` on first use. Each is a
 * lazy chunk of Shiki's bundled maps.
 *
 * @internal
 */
export async function loadShikiPair(lang: string, theme: string): Promise<void> {
	await Promise.all([loadGrammar(lang), loadTheme(theme)])
}

/**
 * Highlights `code` to the markup that `CodeBlock` renders.
 *
 * @remarks
 * The markup is the output of Shiki's `codeToHtml(code, { lang, theme,
 * tabindex: -1 })`. The `<pre>` takes no tab stop, so a block that fits adds
 * none. `primeCodeBlock` asks for markup of this shape.
 *
 * @internal
 */
export async function highlightShiki(code: string, lang: string, theme: string): Promise<string> {
	await loadShikiPair(lang, theme)

	const hl = await getHighlighter()

	return hl.codeToHtml(code, { lang, theme, tabindex: -1 })
}
