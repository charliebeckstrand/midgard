/**
 * Downloads a blob under `filename` through a transient object-URL anchor.
 *
 * @remarks The click starts the download asynchronously. A revoke in the same
 * tick can stop the download before the browser reads the blob (Firefox and
 * Safari, with larger files). Thus the revoke waits for the next macrotask.
 *
 * @internal
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)

	const anchor = document.createElement('a')

	anchor.href = url

	anchor.download = filename

	anchor.rel = 'noopener'

	document.body.append(anchor)

	anchor.click()

	anchor.remove()

	setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Writes text to the clipboard when the API is available.
 *
 * @remarks A rejected write (a denied permission, an unfocused document) does
 * nothing, because no affordance shows a failed copy. The optional chain stops
 * the expression when the API is absent, so `.catch` never runs on a nullish
 * clipboard.
 *
 * @internal
 */
export function copyText(text: string): void {
	navigator.clipboard?.writeText(text).catch(() => {})
}

/** A leading character a spreadsheet unconditionally reads as a formula/command start. @internal */
const FORMULA_LEAD = /^[=@\t\r]/

/** A leading sign — a formula start unless the whole field is a plain number. @internal */
const SIGNED_LEAD = /^[+-]/

/** A well-formed signed decimal (optional exponent) — legitimate data, not a formula. @internal */
const PLAIN_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

/**
 * Neutralizes spreadsheet formula injection. A field a spreadsheet would
 * evaluate on open is prefixed with a single quote, so the app imports it as
 * literal text. Such a field is led by `=`, `@`, a tab, or a carriage return, or
 * by `+`/`-` when the field isn't a plain number. Signed numbers (`-5`, `+1.2e3`) pass
 * through untouched so numeric columns still parse.
 *
 * @internal
 */
export function neutralizeFormula(value: string): string {
	if (FORMULA_LEAD.test(value)) return `'${value}`

	if (SIGNED_LEAD.test(value) && !PLAIN_NUMBER.test(value)) return `'${value}`

	return value
}
