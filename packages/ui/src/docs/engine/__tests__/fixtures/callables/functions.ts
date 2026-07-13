/** A parsed numeric token. */
export type Parsed = {
	/** Numeric value of the token. */
	value: number

	/** Whether the source parsed cleanly. */
	ok: boolean
}

/**
 * Echo a value back unchanged.
 *
 * @param value - The value to return.
 * @returns The same value.
 */
export function identity<T>(value: T): T {
	return value
}

/** Convert a token to a number, or a number back to its token. */
export function convert(input: string): number
export function convert(input: number): string
export function convert(input: string | number): string | number {
	return typeof input === 'string' ? Number(input) : String(input)
}

/**
 * Format a label with emphasis and an optional suffix.
 *
 * @param text - The label body.
 * @param tone - Emphasis level applied to the body.
 */
export function label(text: string, tone: 'muted' | 'strong' = 'muted', suffix?: string): string {
	return `${tone}:${text}${suffix ?? ''}`
}

/**
 * Parse raw text into a {@link Parsed} record.
 *
 * @param text - Raw input to parse.
 * @returns The parsed record.
 */
export function parse(text: string): Parsed {
	const value = Number(text)

	return { value, ok: !Number.isNaN(value) }
}

/**
 * Legacy label formatter.
 *
 * @deprecated Use `label` instead.
 */
export function legacyLabel(text: string): string {
	return text
}

/**
 * Reset the internal counter to zero.
 *
 * @deprecated
 */
export function reset(): number {
	return 0
}
