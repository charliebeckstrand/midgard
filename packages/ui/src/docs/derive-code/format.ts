import { isValidElement } from 'react'
import { getElementName, isPrimitive } from './tree'
import type { Context } from './types'

export const INDENT = '  '

// Stand-in for content that's present but has no clean literal form — an
// unrenderable child subtree, or a prop value like a Date or config object.
export const PLACEHOLDER = '…'

// Props that never belong in derived code — either structural (children, key,
// ref) or styling noise (className).
const IGNORED_PROPS: ReadonlySet<string> = new Set(['children', 'className', 'key', 'ref'])

// ---------------------------------------------------------------------------
// Prop formatting
// ---------------------------------------------------------------------------

export function formatProps(props: Record<string, unknown>, context: Context): string[] {
	const parts: string[] = []

	for (const [key, value] of Object.entries(props)) {
		if (IGNORED_PROPS.has(key)) continue

		const formatted = formatProp(key, value, context)

		if (formatted !== null) parts.push(formatted)
	}

	return parts
}

function formatProp(key: string, value: unknown, context: Context): string | null {
	if (value === undefined || value === null || value === false) return null

	if (value === true) return key

	if (typeof value === 'string') return `${key}=${jsxString(value)}`

	if (typeof value === 'number') return `${key}={${value}}`

	// Event handlers and other callbacks would render as opaque closures.
	if (typeof value === 'function') return null

	if (isValidElement(value)) {
		const name = getElementName(value, context)

		if (!name) return null

		const childProps = formatProps(value.props as Record<string, unknown>, context)

		const propStr = childProps.length > 0 ? ` ${childProps.join(' ')}` : ''

		return `${key}={<${name}${propStr} />}`
	}

	if (Array.isArray(value) && value.every(isPrimitive)) {
		return `${key}={[${value.map(formatLiteral).join(', ')}]}`
	}

	// Present but unserializable — a Date, a config object, an array of objects.
	// The source identifier (`min={min}`) is unavailable at render time.
	// Emit a `…` placeholder rather than silently dropping the prop.
	return `${key}={${PLACEHOLDER}}`
}

// ---------------------------------------------------------------------------
// Literal formatting
// ---------------------------------------------------------------------------

// Double-quoted JSX attribute; falls back to braces + JSON when the value
// contains characters requiring escaping.
function jsxString(value: string): string {
	if (!value.includes('"') && !value.includes('\n')) return `"${value}"`

	return `{${JSON.stringify(value)}}`
}

function formatLiteral(value: string | number | boolean): string {
	// `JSON.stringify` escapes embedded quotes, backslashes, and control
	// characters; a bare template literal emits invalid JS for strings
	// containing single quotes.
	if (typeof value === 'string') return JSON.stringify(value)

	return String(value)
}

// ---------------------------------------------------------------------------
// Tag assembly
// ---------------------------------------------------------------------------

/**
 * Build an opening JSX tag. Decides between inline (`<Foo a="1" b="2">`) and
 * multi-line (one prop per line) based on total length.
 */
export function renderOpenTag(
	name: string,
	propParts: string[],
	indent: string,
	hasChildren: boolean,
): string {
	if (propParts.length === 0) {
		return hasChildren ? `<${name}>` : `<${name} />`
	}

	const close = hasChildren ? '>' : ' />'

	const inline = `<${name} ${propParts.join(' ')}${close}`

	if (inline.length <= 80 && !propParts.some((p) => p.includes('\n'))) {
		return inline
	}

	const propIndent = indent + INDENT

	return `<${name}\n${propParts.map((p) => propIndent + p).join('\n')}\n${indent}${hasChildren ? '>' : '/>'}`
}
