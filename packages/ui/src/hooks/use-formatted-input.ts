'use client'

import type { ChangeEvent, Ref } from 'react'
import { countMeaningful, cursorForCount } from '../utilities'
import { usePendingCaret } from './use-pending-caret'

type FormattedInputOptions = {
	/** Reformats raw text on every change. */
	format: (raw: string) => string
	/**
	 * Predicate identifying characters preserved across `format`. Used to keep
	 * the caret aligned with the typed character when format inserts or removes
	 * separators. Defaults to ASCII alphanumerics and `+`.
	 */
	meaningful?: (char: string) => boolean
	/** External ref to compose with the engine's internal input ref. */
	ref?: Ref<HTMLInputElement>
}

const defaultMeaningful = (c: string) => /[A-Za-z0-9+]/.test(c)

/**
 * Caret-preserving reformat engine for formatted text inputs — the stateless
 * core under `useMaskInput` and `CurrencyInput`. `reformat` applies `format`
 * to a change event's text and queues a caret restore (via the returned `ref`)
 * so separators inserted by formatting don't shove the cursor to the end on
 * every keystroke. The caller owns the state the formatted text commits to.
 */
export function useFormattedInput({
	format,
	meaningful = defaultMeaningful,
	ref: externalRef,
}: FormattedInputOptions) {
	const { ref, setCaret } = usePendingCaret(externalRef)

	const reformat = (e: ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value

		const cursor = e.target.selectionStart ?? raw.length

		const meaningfulBefore = countMeaningful(raw, cursor, meaningful)

		const formatted = format(raw)

		setCaret(cursorForCount(formatted, meaningfulBefore, meaningful))

		return formatted
	}

	return { ref, reformat }
}
