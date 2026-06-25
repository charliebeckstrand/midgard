'use client'

import type { ReactNode } from 'react'
import { cn } from 'ui/core'
import { parseLinkToken } from '../../api-reference/link-syntax'
import { LinkText, Prose } from './doc-inline'

/** The literal shape a default value denotes, read off its source text. */
type LiteralKind = 'string' | 'number' | 'boolean' | 'nullish' | 'array' | 'object'

// Per-kind syntax hues, aligned with the JSON-tree viewer's value palette
// (`recipes/kata/json-tree`) so a default reads with the same colour grammar:
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
 * self-contained literal collapses to its bare value in a syntax-coloured
 * monospace run keyed to its kind. A descriptive `@defaultValue` — prose
 * carrying `{@link}` references and backtick literals — renders as Markdown,
 * with each link resolved to a name and each literal code span syntax-coloured
 * the same way (`` `'horizontal'` `` reads emerald in flow).
 */
export function DefaultValue({ value }: { value: string }) {
	const kind = classifyLiteral(value)

	return (
		<span
			data-slot="default-value"
			className={cn(kind && 'font-mono', kind ? KIND_COLOR[kind] : undefined)}
		>
			{kind ? literalText(value) : renderProse(value)}
		</span>
	)
}

/** Split a descriptive default into prose runs, `{@link}` names, and coloured literal code spans. */
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

	if (/^'.*'$/s.test(text) || /^".*"$/s.test(text)) return 'string'

	if (text === 'true' || text === 'false') return 'boolean'

	if (text === 'null' || text === 'undefined') return 'nullish'

	if (/^-?(?:\d[\d_]*\.?\d*|\.\d+)(?:e[+-]?\d+)?n?$/i.test(text)) return 'number'

	if (text.startsWith('[') && text.endsWith(']')) return 'array'

	if (text.startsWith('{') && text.endsWith('}')) return 'object'

	return null
}
