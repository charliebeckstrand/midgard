import { downloadBlob } from '../core/download-blob'

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

/**
 * A formatted number: digits with signs, separators, spaces, currency, or a
 * percent. It holds no letter and no operator, so a spreadsheet cannot run it.
 * The spaces are the plain, the no-break, and the narrow no-break space. A tab
 * or a line break is not a space here, because a spreadsheet reads it as the
 * start of a formula.
 *
 * @internal
 */
const FORMATTED_NUMBER = /^[+-]?[\d.,'’%$€£¥ \u00a0\u202f]*\d[\d.,'’%$€£¥ \u00a0\u202f]*$/

/** Options for {@link csvField}. @internal */
export type CsvFieldOptions = {
	/**
	 * Keeps a formatted number (`-1,234.5`, `12 %`) as it is, so the column of a
	 * formatted readout still parses. Without it, only a plain number keeps its
	 * sign (see {@link neutralizeFormula}).
	 * @defaultValue false
	 */
	formatted?: boolean
}

/**
 * Escapes one CSV field per RFC 4180. A field that holds the delimiter, a quote,
 * or a line break gets double quotes, and its own quotes are doubled. A field
 * that a spreadsheet reads as a formula first gets a quote prefix (see
 * {@link neutralizeFormula}).
 *
 * @internal
 */
export function csvField(value: string, { formatted = false }: CsvFieldOptions = {}): string {
	const guarded = formatted && FORMATTED_NUMBER.test(value) ? value : neutralizeFormula(value)

	return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

/**
 * Downloads a CSV document as a UTF-8 file.
 *
 * @remarks The file starts with a UTF-8 byte order mark. Without it, a
 * spreadsheet app such as Excel can read the text in a legacy encoding. Then a
 * character outside ASCII (`—`, `é`) shows as mojibake.
 *
 * @param filename - The name of the download, such as `grid.csv`.
 * @param csv - The CSV document.
 * @internal
 */
export function downloadCsv(filename: string, csv: string): void {
	downloadBlob(
		new Blob([String.fromCharCode(0xfeff), csv], { type: 'text/csv;charset=utf-8' }),
		filename,
	)
}
