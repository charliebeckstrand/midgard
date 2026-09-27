'use client'

import type { ChangeEvent, Ref } from 'react'
import { countMeaningful, cursorForCount } from '../utilities'
import { usePendingCaret } from './use-pending-caret'

/** Options for {@link useFormattedInput}: the `format` pass, the meaningful-character test the caret rides, and the ref to compose. */
export type FormattedInputOptions = {
	/** Reformats raw text on every change. */
	format: (raw: string) => string
	/**
	 * Predicate identifying characters preserved across `format`. Keeps the
	 * caret aligned with the typed character when format inserts or removes
	 * separators.
	 * @defaultValue a predicate matching ASCII alphanumerics and `+`
	 */
	meaningful?: (char: string) => boolean
	/**
	 * What a keystroke at the end of the text does with the caret.
	 *
	 * A padding formatter breaks the `meaningful` contract. CurrencyInput pads
	 * `.` to `0.`, and DateInput pads `1/` to `01/`. Each pad inserts a
	 * meaningful character, and the restore then pins the caret one place short.
	 * With `'jump'`, a keystroke at the end queues no restore, and the value swap
	 * puts the caret at the end. Masks must keep `'restore'`, because a caret
	 * before trailing separators is what makes backspace work.
	 *
	 * @defaultValue 'restore'
	 */
	atEnd?: 'jump' | 'restore'
	/** External ref to compose with the engine's internal input ref. */
	ref?: Ref<HTMLInputElement>
}

const defaultMeaningful = (c: string) => /[A-Za-z0-9+]/.test(c)

/**
 * Caret-preserving reformat engine for formatted text inputs: the stateless
 * core under `useMaskInput`, `CurrencyInput` and `DateInput`. `reformat` applies `format`
 * to a change event's text and queues a caret restore, via the returned `ref`.
 * That restore keeps the cursor on the typed character when formatting inserts
 * separators. The caller owns the state the formatted text commits to.
 *
 * @returns `{ ref, reformat }`. Spread `ref` onto the input. Call `reformat(e)`
 * in `onChange` to get the formatted string to commit. That call also queues
 * the caret restore, as a side effect.
 */
export function useFormattedInput({
	format,
	meaningful = defaultMeaningful,
	atEnd = 'restore',
	ref: externalRef,
}: FormattedInputOptions) {
	const { ref, setCaret } = usePendingCaret(externalRef)

	const reformat = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value

		const cursor = event.target.selectionStart ?? raw.length

		if (atEnd === 'jump' && cursor >= raw.length) return format(raw)

		const meaningfulBefore = countMeaningful(raw, cursor, meaningful)

		const formatted = format(raw)

		setCaret(cursorForCount(formatted, meaningfulBefore, meaningful))

		return formatted
	}

	return { ref, reformat }
}
