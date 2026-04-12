type InputType = 'text' | 'number'

/** Replace or insert a character at position `i` in the current value. */
export function replaceChar(val: string, i: number, char: string): string {
	if (i >= val.length) {
		return val.padEnd(i, ' ') + char
	}

	return val.substring(0, i) + char + val.substring(i + 1)
}

/** Remove the character at position `i`, or the one before it if `i` is empty. */
export function deleteChar(val: string, i: number): { next: string; focus: number | null } {
	if (val[i]) {
		return { next: val.substring(0, i) + val.substring(i + 1), focus: null }
	}

	if (i > 0) {
		return { next: val.substring(0, i - 1) + val.substring(i), focus: i - 1 }
	}

	return { next: val, focus: null }
}

/** Validate a single character against the input type. */
export function isValidChar(char: string, type: InputType): boolean {
	if (type === 'number') return /^\d$/.test(char)

	return true
}

/** Validate a pasted string against the input type. */
export function isValidPaste(text: string, type: InputType): boolean {
	if (type === 'number') return /^\d*$/.test(text)

	return true
}
