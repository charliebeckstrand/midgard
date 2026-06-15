'use client'

import { cn } from '../../../core'
import { DocDescription } from './doc-description'

/** The literal shape a default value denotes, read off its source text. */
type DefaultKind = 'string' | 'number' | 'boolean' | 'nullish' | 'array' | 'object' | 'expression'

// Per-kind syntax hues, aligned with the JSON-tree viewer's value palette
// (`recipes/kata/json-tree`) so a default reads with the same colour grammar:
// strings emerald, numbers amber, booleans violet, nullish muted; arrays and
// objects borrow the structural sky / rose hues. An `expression` carries no
// colour — a descriptive default renders as prose through `DocDescription`.
const KIND_COLOR: Record<Exclude<DefaultKind, 'expression'>, string> = {
	string: 'text-emerald-700 dark:text-emerald-400',
	number: 'text-amber-700 dark:text-amber-400',
	boolean: 'text-violet-600 dark:text-violet-400',
	nullish: 'text-zinc-500 dark:text-zinc-400',
	array: 'text-sky-700 dark:text-sky-400',
	object: 'text-rose-600 dark:text-rose-400',
}

/**
 * A prop's default value, rendered inline with no surrounding badge. A single
 * literal collapses to its bare value in a syntax-coloured monospace run keyed
 * to its kind; anything else — a descriptive `@defaultValue` carrying prose,
 * `{@link}` references, or backtick code — renders as Markdown through
 * {@link DocDescription}.
 */
export function DefaultValue({ value }: { value: string }) {
	const kind = classifyDefault(value)

	if (kind === 'expression') return <DocDescription description={value} />

	return (
		<span data-slot="default-value" className={cn('font-mono text-sm', KIND_COLOR[kind])}>
			{literalText(value)}
		</span>
	)
}

/** Unwrap a single inline-code span (`` `'md'` `` → `'md'`); otherwise the trimmed source. */
function literalText(raw: string): string {
	const code = /^`([^`]+)`$/.exec(raw.trim())

	return (code?.[1] ?? raw).trim()
}

/**
 * Classify a default's source text by the literal it denotes. A value wrapped in
 * a single inline-code span is unwrapped first, so a backtick-quoted
 * `@defaultValue` classifies by its contents. Anything that is not a
 * self-contained literal — a union, a call, descriptive prose with `{@link}`
 * references — falls through to `expression`.
 */
function classifyDefault(raw: string): DefaultKind {
	const text = literalText(raw)

	if (/^'.*'$/s.test(text) || /^".*"$/s.test(text)) return 'string'

	if (text === 'true' || text === 'false') return 'boolean'

	if (text === 'null' || text === 'undefined') return 'nullish'

	if (/^-?(?:\d[\d_]*\.?\d*|\.\d+)(?:e[+-]?\d+)?n?$/i.test(text)) return 'number'

	if (text.startsWith('[') && text.endsWith(']')) return 'array'

	if (text.startsWith('{') && text.endsWith('}')) return 'object'

	return 'expression'
}
