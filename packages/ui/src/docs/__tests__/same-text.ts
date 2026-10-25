import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { vi } from 'vitest'
import { namedTexts } from '../kit/proper-names.ts'

// The page smoke test renders each page in Spanish and in English. A text that
// shows in both renders is the same in both languages. Such a text is English
// that a translation missed, unless the docs record where it comes from. A text
// comes from a recorded source when one of these holds:
//
// - The text is in an element that is code: `code`, `pre`, `kbd`, or `samp`.
// - The text is in an element with `translate="no"`, or in an element with a
//   `lang` of another language.
// - The text is a name that `names` gives (`kit/proper-names.ts`).
// - The text is the output of an `Intl` formatter in the Spanish render.
// - The text is a message that the Spanish catalog writes as the English does.
//
// A text can join names and formatted values, such as "Mia Chen · 5 mi". It
// comes from recorded sources when no word stays after each recorded text goes
// out of it.

/** Whether a text holds a word, that is, two letters in a row. */
const WORD = /\p{L}{2}/u

/** The attributes that hold text that a reader or a screen reader gets. */
const TEXT_ATTRIBUTES = [
	'alt',
	'aria-description',
	'aria-label',
	'aria-placeholder',
	'aria-roledescription',
	'aria-valuetext',
	'placeholder',
	'title',
]

/** The elements whose text is code. */
const CODE = 'code, pre, kbd, samp, [translate="no"]'

/** Whether `element` is in a part of the page that is code, or that has another language. */
function isExempt(element: Element, language: string): boolean {
	if (element.closest(CODE)) return true

	// The root element has the language of the shell, not of a part of the page.
	const holder = element.closest('[lang]')

	const lang = holder === element.ownerDocument.documentElement ? '' : holder?.getAttribute('lang')

	return Boolean(lang) && !lang?.startsWith(language)
}

/**
 * Adds each text of `root` that holds a word to `texts`: each text node, and
 * each text attribute. A text in code, or in another language than
 * `language`, stays out.
 */
export function readTexts(root: Element, language: string, texts: Set<string>): void {
	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)

	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node.textContent?.trim() ?? ''

		if (WORD.test(text) && node.parentElement && !isExempt(node.parentElement, language)) {
			texts.add(text)
		}
	}

	for (const element of root.querySelectorAll('*')) {
		for (const name of TEXT_ATTRIBUTES) {
			const text = element.getAttribute(name)?.trim() ?? ''

			if (WORD.test(text) && !isExempt(element, language)) texts.add(text)
		}
	}
}

/** One message of a catalog in English, as `pnpm intl` writes it. */
type Descriptor = { defaultMessage: string }

/**
 * Each message that the Spanish catalog writes as the English does, such as
 * "Total". A message with a value stays out, because its text in a page holds
 * the value.
 */
function sameMessages(
	english: Readonly<Record<string, Descriptor>>,
	spanish: Readonly<Record<string, string>>,
): string[] {
	return Object.entries(english)
		.map(([id, { defaultMessage }]) => [defaultMessage, spanish[id]])
		.filter(([message, translation]) => message === translation && !message?.includes('{'))
		.map(([message]) => message ?? '')
}

/**
 * The catalog in `folder` in `language`, as the file holds it. The file goes
 * through no import, because the docs plugin keeps the demo text out of the
 * catalog that the app imports (`plugin/copies.ts`).
 */
function readCatalog<Catalog>(folder: string, language: string): Catalog {
	return JSON.parse(readFileSync(join(import.meta.dirname, folder, `${language}.json`), 'utf8'))
}

/** The messages that are the same in both languages, in the catalogs of ui and of the docs. */
const SAME_MESSAGES = ['../../primitives/intl/lang', '../lang'].flatMap((folder) =>
	sameMessages(readCatalog(folder, 'en'), readCatalog(folder, 'es')),
)

/** The formatters whose methods give text. */
const FORMATTERS = [
	Intl.DateTimeFormat,
	Intl.DisplayNames,
	Intl.ListFormat,
	Intl.NumberFormat,
	Intl.RelativeTimeFormat,
]

/** The methods of the formatters that give text, as a string or as its parts. */
const FORMAT_METHODS = ['format', 'formatToParts', 'formatRange', 'formatRangeToParts', 'of']

/** The text of the result of a format method: a string, or the parts of one. */
function toText(result: unknown): string | undefined {
	if (typeof result === 'string') return result

	if (Array.isArray(result)) return result.map((part: { value?: string }) => part.value).join('')

	return undefined
}

/** A formatter that gives the parts of its text. */
type PartsFormatter = { formatToParts: (...args: unknown[]) => { value: string }[] }

/**
 * Records the text that each `Intl` formatter gives, also through
 * `toLocaleString`, until the returned function runs. Each method is a spy
 * that calls the method, so the text is the result of each call.
 */
export function recordIntl(texts: Set<string>): () => void {
	const spies: { mock: { results: { type: string; value: unknown }[] }; mockRestore(): void }[] = []

	const spy = <Target extends object>(target: Target, name: string) => {
		if (typeof (target as Record<string, unknown>)[name] !== 'function') return

		spies.push(vi.spyOn(target as Record<string, () => unknown>, name))
	}

	for (const formatter of FORMATTERS) {
		for (const name of FORMAT_METHODS) {
			// `format` of `NumberFormat` and of `DateTimeFormat` is a getter, so the
			// spy below takes it.
			if (
				name === 'format' &&
				(formatter === Intl.NumberFormat || formatter === Intl.DateTimeFormat)
			) {
				continue
			}

			spy(formatter.prototype, name)
		}
	}

	for (const name of ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString']) {
		spy(Date.prototype, name)
	}

	spy(Number.prototype, 'toLocaleString')

	// The getter gives a function that joins the parts, which the spy of
	// `formatToParts` records. Each formatter keeps one function, so its
	// `format` stays the same function, as a dependency of an effect needs.
	const prototypes = [Intl.NumberFormat.prototype, Intl.DateTimeFormat.prototype]

	// The spy takes `format` as a property, the value that the getter gives.
	for (const prototype of prototypes as unknown as { readonly format: unknown }[]) {
		const formats = new WeakMap<object, (...args: unknown[]) => string>()

		const getter = vi.spyOn(prototype, 'format', 'get')

		getter.mockImplementation(function (this: PartsFormatter) {
			const format =
				formats.get(this) ??
				((...args: unknown[]) =>
					this.formatToParts(...args)
						.map(({ value }) => value)
						.join(''))

			formats.set(this, format)

			return format
		})

		spies.push(getter)
	}

	return () => {
		for (const each of spies) {
			for (const { type, value } of each.mock.results) {
				const text = type === 'return' ? toText(value)?.trim() : undefined

				if (text && WORD.test(text)) texts.add(text)
			}

			each.mockRestore()
		}
	}
}

/**
 * Each text of `spanish` that `english` also shows, and that does not come from
 * recorded sources. `formatted` holds the output of the formatters in the
 * Spanish render.
 */
export function findSameText(
	spanish: ReadonlySet<string>,
	english: ReadonlySet<string>,
	formatted: ReadonlySet<string>,
): string[] {
	// The longest text goes out first, so a name such as "New York City" goes
	// out before "New York".
	const recorded = [...new Set([...namedTexts, ...formatted, ...SAME_MESSAGES])]
		.filter((text) => WORD.test(text))
		.toSorted((a, b) => b.length - a.length)

	return [...spanish].filter((text) => {
		if (!english.has(text)) return false

		let rest = text

		for (const source of recorded) {
			if (rest.includes(source)) rest = rest.replaceAll(source, ' ')
		}

		return WORD.test(rest)
	})
}
