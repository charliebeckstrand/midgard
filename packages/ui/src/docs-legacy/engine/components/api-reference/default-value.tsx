import type { ReactNode } from 'react'
import { cn } from '../../../../core'
import { useScrollOverflow } from '../../../../hooks'
import { omote } from '../../../../recipes/kiso'
import { parseLinkToken } from '../../api-reference/link-syntax'
import { splitTopLevel } from '../../split-top-level'
import { LinkText, Prose } from './doc-inline'

/** The literal shape a default value denotes, read off its source text. */
type LiteralKind = 'string' | 'number' | 'boolean' | 'nullish' | 'array' | 'object'

// Per-kind syntax hues, aligned with the JSON-tree viewer's value palette
// (`recipes/kata/json-tree`) so a default reads with the same color grammar:
// strings emerald, numbers amber, booleans violet, nullish muted; arrays and
// objects borrow the structural sky / rose hues.
const KIND_COLOR: Record<LiteralKind, string> = {
	string: 'text-emerald-700 dark:text-emerald-400',
	number: 'text-amber-700 dark:text-amber-400',
	boolean: 'text-violet-600 dark:text-violet-400',
	nullish: 'text-mist-600 dark:text-mist-400',
	array: 'text-sky-600 dark:text-sky-400',
	object: 'text-rose-600 dark:text-rose-400',
}

/**
 * A prop's default value, rendered inline with no surrounding badge. A
 * self-contained literal collapses to its bare value in a syntax-colored
 * monospace run keyed to its kind. A descriptive `@defaultValue` — prose
 * carrying `{@link}` references and backtick literals — renders as Markdown.
 * Each link resolves to a name and each literal code span is syntax-colored
 * the same way (`` `'horizontal'` `` reads emerald in flow). A structured
 * literal renders as a `<pre>` block with one entry on each line, in the hue of
 * its kind ({@link literalBlock}).
 */
export function DefaultValue({ value }: { value: string }) {
	const kind = classifyLiteral(value)

	// While a line overflows, the edge with more text behind it fades.
	const scrollOverflowRef = useScrollOverflow({ axis: 'horizontal' })

	const block = literalBlock(value)

	if (kind && block) {
		return (
			<pre
				ref={scrollOverflowRef}
				data-slot="default-value"
				className={cn(omote.rail, 'font-mono', KIND_COLOR[kind])}
			>
				{block}
			</pre>
		)
	}

	return (
		<span
			data-slot="default-value"
			className={cn(kind && 'font-mono', kind ? KIND_COLOR[kind] : undefined)}
		>
			{kind ? literalText(value) : renderDefault(value)}
		</span>
	)
}

/**
 * Whether a default is a sentence, not a value. Prose has a backtick span or a
 * `{@link}` mixed with plain words. A lone span, a union, and a JSX expression
 * are values. The API reference moves prose into the description.
 */
export function isProseDefault(raw: string): boolean {
	if (classifyLiteral(raw) || /<[A-Za-z]/.test(raw) || /\s\|\s/.test(raw)) return false

	if (!/`|\{@link/.test(raw)) return false

	return /[A-Za-z]{2,}/.test(raw.replace(/`[^`]*`|\{@link[^}]*\}/g, ''))
}

/**
 * The multi-line form of a structured default, or null for a value that stays
 * on one line. An object literal with one or more entries is structured. An
 * array literal is structured when it holds an object or an array. The block
 * puts each top-level entry on its own line, with a two-space indent and a
 * trailing comma. A nested literal stays on one line, so a list of objects
 * reads as one object on each line.
 */
export function literalBlock(raw: string): string | null {
	const kind = classifyLiteral(raw)

	if (kind !== 'object' && kind !== 'array') return null

	const text = literalText(raw)

	const entries = splitTopLevel(text.slice(1, -1), ',', false).map(flattenEntry)

	if (entries.length === 0) return null

	if (kind === 'array' && !entries.some((entry) => /^[[{]/.test(entry))) return null

	const lines = entries.map((entry) => `  ${entry},`)

	return [text[0], ...lines, text.at(-1)].join('\n')
}

/**
 * One entry of a block on one line. The function joins the source lines with
 * a space, and removes a trailing comma before a closing bracket.
 */
function flattenEntry(entry: string): string {
	return entry.replace(/,(\s*\n\s*[\]})])/g, '$1').replace(/\s*\n\s*/g, ' ')
}

/**
 * A non-literal default. A JSX/element expression (`<TableEmptyAlert />`,
 * `<ChevronRight />`) renders verbatim in monospace. The Markdown inline lexer
 * reads an HTML-like tag as raw HTML and drops it, blanking the cell. Everything
 * else — descriptive prose, `{@link}` references, backtick literals — renders
 * through {@link renderProse}.
 */
function renderDefault(value: string): ReactNode {
	if (/<[A-Za-z]/.test(value)) return <code className="font-mono">{value}</code>

	return renderProse(value)
}

/** Split a descriptive default into prose runs, `{@link}` names, and colored literal code spans. */
function renderProse(text: string): ReactNode[] {
	const nodes: ReactNode[] = []

	// One pass over both token kinds: `{@link …}` (group 1) and an inline-code
	// span (group 2). A fresh regex avoids sharing `lastIndex` across renders.
	const re = /\{@link\s+([^}]+?)\}|`([^`]+)`/g

	let last = 0

	let key = 0

	for (const match of text.matchAll(re)) {
		const index = match.index ?? 0

		if (index > last) nodes.push(<Prose key={key++} text={text.slice(last, index)} />)

		if (match[1] !== undefined) {
			nodes.push(<LinkText key={key++} token={parseLinkToken(match[1])} />)
		} else {
			nodes.push(<Code key={key++} text={match[2] ?? ''} />)
		}

		last = index + match[0].length
	}

	if (last < text.length) nodes.push(<Prose key={key++} text={text.slice(last)} />)

	return nodes
}

/**
 * One inline-code span from a descriptive default. A literal renders bare in its
 * kind's hue, matching a standalone default; anything else (an identifier,
 * `document.body`) falls back to the standard prose code chrome.
 */
function Code({ text }: { text: string }) {
	const kind = classifyLiteral(text)

	if (kind) return <code className={cn('font-mono', KIND_COLOR[kind])}>{text}</code>

	return <Prose text={`\`${text}\``} />
}

/** Unwrap a single inline-code span (`` `'md'` `` → `'md'`); otherwise the trimmed source. */
function literalText(raw: string): string {
	const code = /^`([^`]+)`$/.exec(raw.trim())

	return (code?.[1] ?? raw).trim()
}

/**
 * Classify a fragment by the literal it denotes, unwrapping a single inline-code
 * span first so a backtick-quoted value classifies by its contents. Returns null
 * for anything that is not a self-contained literal — a union, a call,
 * descriptive prose — which then renders as Markdown.
 */
function classifyLiteral(raw: string): LiteralKind | null {
	const text = literalText(raw)

	// A `{@link …}` reference is prose, not a literal — its braces would otherwise
	// read as an object literal.
	if (text.includes('{@link')) return null

	// A single quoted string, allowing an escaped or embedded `|`. Anchored so a
	// union of literals (`'start' | 'end'`) doesn't greedily match as one string.
	if (/^'(?:[^'\\]|\\.)*'$/.test(text) || /^"(?:[^"\\]|\\.)*"$/.test(text)) return 'string'

	// A `|`-joined union isn't a single self-contained value; render it as prose
	// rather than coloring the whole span one kind.
	if (/\s\|\s/.test(text)) return null

	if (text === 'true' || text === 'false') return 'boolean'

	if (text === 'null' || text === 'undefined') return 'nullish'

	if (/^-?(?:\d[\d_]*\.?\d*|\.\d+)(?:e[+-]?\d+)?n?$/i.test(text)) return 'number'

	if (text.startsWith('[') && text.endsWith(']')) return 'array'

	if (text.startsWith('{') && text.endsWith('}')) return 'object'

	return null
}
