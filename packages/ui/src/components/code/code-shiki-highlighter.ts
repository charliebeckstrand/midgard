import type { HighlighterCore } from 'shiki'
import { createHighlighterCore, isSpecialLang, isSpecialTheme } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { bundledLanguages } from 'shiki/langs'
import { bundledThemes } from 'shiki/themes'
import { getOrCompute } from '../../utilities/get-or-compute'

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

/**
 * A request to the worker. A request with no `code` loads the grammar and the
 * theme, and warms the grammar (see {@link warmShikiPair}).
 */
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

// Short samples of frequent TSX and TypeScript forms: imports, generics,
// template literals, destructuring, and JSX. The engine builds the RegExp of a
// grammar rule when the tokenizer first runs the rule, and that build is most
// of the cost of a first highlight. A warm-up tokenizes the samples of its
// grammar one time, so the first real block finds the RegExps of the frequent
// rules ready. The key is the name of the grammar, so an alias such as `ts`
// finds the samples too. A warm-up removes the entry that it tokenized.
const unwarmed = new Map<string, readonly string[]>([
	[
		'tsx',
		[
			`import { Select, type SelectOption } from 'ui/select'`,
			`const options: SelectOption<string>[] = [{ value: 'a', label: \`Beta \${1 + 2}\`, disabled: false }]`,
			`export function Demo({ label = 'Pick' }: { label?: string }) {\n\tconst [value, setValue] = useState<string | null>(null)\n}`,
			`// Reset on click.\n<Button color="blue" size={2} disabled={!value} onClick={() => setValue(null)}>\n\t{value ?? label}\n</Button>`,
			`<>\n\t<Select options={options} value={value} onChange={(next) => setValue(next)} />\n</>`,
		],
	],
	['typescript', [`export function greet(name: string): string {\n\treturn 'Hello, ' + name\n}`]],
])

/**
 * Creates the highlighter on first use.
 *
 * @internal
 */
export function getHighlighter(): Promise<HighlighterCore> {
	highlighter ??= createHighlighterCore({ engine: createJavaScriptRegexEngine() })

	return highlighter
}

/**
 * Runs `start` one time for `key`. A rejection clears the memo before it
 * reaches the caller, so the next call fetches the chunk again. One failed
 * chunk fetch then does not fail each later request.
 */
function loadOnce(key: string, start: () => Promise<void>): Promise<void> {
	return getOrCompute(loads, key, () =>
		start().catch((error: unknown) => {
			loads.delete(key)

			throw error
		}),
	)
}

function loadGrammar(lang: string): Promise<void> {
	// A plain-text id, such as `text`, needs no grammar.
	if (isSpecialLang(lang)) return Promise.resolve()

	return loadOnce(`lang\u0000${lang}`, async () => {
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

	return loadOnce(`theme\u0000${theme}`, async () => {
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
 * Loads the grammar of `lang` and the theme `theme`, and then tokenizes the
 * samples of the grammar one time. A grammar with no samples only loads.
 *
 * @remarks
 * A warm-up request (`loadShiki`) runs this. A highlight request does not: its
 * own code builds the RegExps that it needs, and a sample first only delays it.
 *
 * @internal
 */
export async function warmShikiPair(lang: string, theme: string): Promise<void> {
	await loadShikiPair(lang, theme)

	if (isSpecialLang(lang)) return

	const hl = await getHighlighter()

	const { name } = hl.getLanguage(lang)

	const samples = unwarmed.get(name) ?? []

	unwarmed.delete(name)

	for (const sample of samples) hl.codeToTokensBase(sample, { lang, theme })
}

/**
 * Highlights `code` to the markup that `CodeBlock` renders.
 *
 * @remarks
 * The markup is the output of Shiki's `codeToHtml(code, { lang, theme,
 * tabindex: -1, tokenizeTimeLimit: 0 })`. The `<pre>` takes no tab stop, so a
 * block that fits adds none. `primeCodeBlock` asks for markup of this shape.
 *
 * By default, Shiki stops a line after 500 ms and gives the rest of the line as
 * one token. The first line of a cold grammar builds its RegExps, and on a slow
 * device that can take more than 500 ms. The worker does not block the page, so
 * it sets no limit, and each line gets all of its tokens.
 *
 * @internal
 */
export async function highlightShiki(code: string, lang: string, theme: string): Promise<string> {
	await loadShikiPair(lang, theme)

	const hl = await getHighlighter()

	return hl.codeToHtml(code, { lang, theme, tabindex: -1, tokenizeTimeLimit: 0 })
}
