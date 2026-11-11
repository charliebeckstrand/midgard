/**
 * The address of the prediction form. `?predict=w5` opens the form on week 5,
 * so the form is a link and a reload keeps it open.
 */

/** The name of the search parameter. */
export const PREDICT_PARAM = 'predict'

/** The value of the parameter for `week`. */
export function formatPredictValue(week: number): string {
	return `w${week}`
}

/** The week that a value of the parameter names, or `null` for a value that names none. */
export function parsePredictValue(value: string | null): number | null {
	const match = value === null ? null : /^w([1-9]\d?)$/.exec(value)

	return match?.[1] === undefined ? null : Number(match[1])
}
