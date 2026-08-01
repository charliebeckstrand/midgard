'use client'

import type { ChangeEvent, Ref } from 'react'
import { countMeaningful, cursorForCount } from '../utilities'
import { usePendingCaret } from './use-pending-caret'

type FormattedInputOptions = {
	/** Reformats raw text on every change. */
	format: (raw: string) => string
	/**
	 * Predicate identifying characters preserved across `format`. Keeps the
	 * caret aligned with the typed character when format inserts or removes
	 * separators.
	 * @defaultValue a predicate matching ASCII alphanumerics and `+`
	 * @remarks
	 * A padding formatter breaks this contract: CurrencyInput's `.` → `0.` and
	 * DateInput's `1/` → `01/` insert a *meaningful* character, so the restore
	 * counts the pad and pins the caret one place short. Both call sites answer it
	 * with a type-at-end branch that formats without queueing a restore. At a
	 * third padding consumer, absorb it here as an `atEnd: 'jump' | 'restore'`
	 * option — masks must keep `'restore'`, since a caret before trailing
	 * separators is what makes backspace work.
	 */
	meaningful?: (char: string) => boolean
	/** External ref to compose with the engine's internal input ref. */
	ref?: Ref<HTMLInputElement>
}

const defaultMeaningful = (c: string) => /[A-Za-z0-9+]/.test(c)

/**
 * Caret-preserving reformat engine for formatted text inputs: the stateless
 * core under `useMaskInput` and `CurrencyInput`. `reformat` applies `format`
 * to a change event's text and queues a caret restore (via the returned `ref`)
 * that keeps the cursor on the typed character when formatting inserts
 * separators. The caller owns the state the formatted text commits to.
 *
 * @returns `{ ref, reformat }`. Spread `ref` onto the input; call `reformat(e)`
 * in `onChange` to get the formatted string to commit (it also queues the
 * caret restore as a side effect).
 */
export function useFormattedInput({
	format,
	meaningful = defaultMeaningful,
	ref: externalRef,
}: FormattedInputOptions) {
	const { ref, setCaret } = usePendingCaret(externalRef)

	const reformat = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value

		const cursor = event.target.selectionStart ?? raw.length

		const meaningfulBefore = countMeaningful(raw, cursor, meaningful)

		const formatted = format(raw)

		setCaret(cursorForCount(formatted, meaningfulBefore, meaningful))

		return formatted
	}

	return { ref, reformat }
}
