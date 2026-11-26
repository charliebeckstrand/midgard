import { foldText } from '../../../utilities/fold-text'

// How the engine cuts a text into terms. The index and the query fold each
// term with the same function, so that a query with no accents finds a label
// with accents.

/** A run of letters and digits. */
const WORD = /[\p{L}\p{N}]+/gu

/** Each place where a camelCase or PascalCase word starts a new part. */
const PART = /(?<=[\p{Ll}\p{N}])(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u

/** The words of `text`, with no punctuation: `<DialogPanel />` gives `DialogPanel`. */
export function tokenizeQuery(text: string): string[] {
	return text.match(WORD) ?? []
}

/**
 * The terms of the text of an entry: each word, and each part of a camelCase
 * word. `onSizeChange` gives `onSizeChange`, `on`, `Size`, and `Change`, so a
 * query finds the entry from the start of the word or from the start of a
 * part, such as `change`.
 */
export function tokenizeText(text: string): string[] {
	return tokenizeQuery(text).flatMap((word) => {
		const parts = word.split(PART)

		return parts.length > 1 ? [word, ...parts] : [word]
	})
}

/** The term in the form that the index holds: with no accents, and in lower case. */
export function processTerm(term: string): string {
	return foldText(term)
}

/** The words of `text`, folded and joined with one space: `<Button />` gives `button`. */
export function normalize(text: string): string {
	return tokenizeQuery(text).map(processTerm).join(' ')
}
