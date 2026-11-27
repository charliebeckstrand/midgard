// The code of a default as the API reference shows it. An object puts each
// key on a line of its own, as Biome formats it, so that a long default does
// not wrap at a random point on a narrow screen.

type Value =
	| { kind: 'atom'; text: string }
	| { kind: 'array'; items: Value[] }
	| { kind: 'object'; entries: { key?: string; value: Value }[] }

const INDENT = '  '

const PUNCTUATION = new Set(['{', '}', '[', ']', ',', ':'])

const CLOSE: Readonly<Record<string, string>> = { '{': '}', '[': ']' }

// A string literal, a punctuation mark, or the text up to the next of either.
// The sticky flag stops the match at a quote that does not close.
const TOKEN = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|[{}[\],:]|[^'"`{}[\],:]+/gy

type Parsed = { value: Value; next: number } | undefined

/**
 * The tokens of `code`: each punctuation mark of an object or an array, and
 * the text between them, with its string literals. Returns `undefined` for a
 * string that does not close.
 */
function tokenize(code: string): string[] | undefined {
	const tokens: string[] = []

	let length = 0

	for (const [match] of code.matchAll(TOKEN)) {
		length += match.length

		const last = tokens.at(-1)

		// Text and a string next to it, such as `-'a'`, are one token.
		if (PUNCTUATION.has(match) || last === undefined || PUNCTUATION.has(last)) tokens.push(match)
		else tokens[tokens.length - 1] = last + match
	}

	if (length !== code.length) return undefined

	return tokens.map((token) => token.trim()).filter(Boolean)
}

/** Reads one value from `tokens` at `start`. Returns `undefined` for code that is not a literal. */
function parse(tokens: string[], start: number): Parsed {
	const token = tokens[start]

	if (token === undefined) return undefined

	if (CLOSE[token]) return parseList(tokens, start)

	if (PUNCTUATION.has(token)) return undefined

	return { value: { kind: 'atom', text: token }, next: start + 1 }
}

/**
 * Reads one entry of a list at `start`. In an object, a key is the text
 * before a colon. An entry with no colon, such as a spread, is a value.
 */
function parseEntry(
	tokens: string[],
	start: number,
	object: boolean,
): { key?: string; value: Value; next: number } | undefined {
	const key = object && tokens[start + 1] === ':' ? tokens[start] : undefined

	if (key === undefined) return parse(tokens, start)

	if (PUNCTUATION.has(key)) return undefined

	const item = parse(tokens, start + 2)

	return item && { key, ...item }
}

/** Reads the object or the array that opens at `start`. */
function parseList(tokens: string[], start: number): Parsed {
	const open = tokens[start] as string

	const close = CLOSE[open]

	const entries: { key?: string; value: Value }[] = []

	let index = start + 1

	while (tokens[index] !== close) {
		const entry = parseEntry(tokens, index, open === '{')

		if (!entry) return undefined

		entries.push(entry)

		index = entry.next

		if (tokens[index] === ',') index++
		else if (tokens[index] !== close) return undefined
	}

	const value: Value =
		open === '{'
			? { kind: 'object', entries }
			: { kind: 'array', items: entries.map((entry) => entry.value) }

	return { value, next: index + 1 }
}

function print(value: Value, depth: number): string {
	if (value.kind === 'atom') return value.text

	const lines =
		value.kind === 'object'
			? value.entries.map(
					(entry) => (entry.key ? `${entry.key}: ` : '') + print(entry.value, depth + 1),
				)
			: value.items.map((item) => print(item, depth + 1))

	const [open, close] = value.kind === 'object' ? ['{', '}'] : ['[', ']']

	if (lines.length === 0) return `${open}${close}`

	// An array of literals, such as `['csv', 'excel']`, stays on one line.
	if (value.kind === 'array' && value.items.every((item) => item.kind === 'atom')) {
		return `${open}${lines.join(', ')}${close}`
	}

	const indent = INDENT.repeat(depth + 1)

	return [open, ...lines.map((line) => `${indent}${line},`), INDENT.repeat(depth) + close].join(
		'\n',
	)
}

/**
 * The code of a default with each key of an object on a line of its own, such
 * as `{ toolbar: false }` on three lines. An array of literals and an empty
 * object stay on one line. Code that is not one object or one array, such as
 * a function, stays as it is.
 */
export function formatCode(code: string): string {
	const trimmed = code.trim()

	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return code

	const tokens = tokenize(trimmed)

	const parsed = tokens && parse(tokens, 0)

	if (!parsed || parsed.next !== tokens.length) return code

	return print(parsed.value, 0)
}
