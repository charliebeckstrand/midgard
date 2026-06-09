/** Return `value` with every non-digit character removed. */
export function digitsOnly(value: string): string {
	return value.replace(/\D/g, '')
}
