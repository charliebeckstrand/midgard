'use client'

import { type ChangeEvent, type Ref, useLayoutEffect, useRef } from 'react'
import { countMeaningful, cursorForCount } from '../utilities'
import { useComposedRef } from './use-composed-ref'
import { useControllable } from './use-controllable'

type UseMaskedInputOptions = {
	value?: string
	defaultValue?: string
	onChange?: (value: string) => void
	format: (raw: string) => string
	/** External ref to compose with the hook's internal input ref. */
	ref?: Ref<HTMLInputElement>
	/**
	 * Predicate identifying characters preserved across `format`. Used to keep
	 * the caret aligned with the typed character when format inserts or removes
	 * separators. Defaults to ASCII alphanumerics and `+`.
	 */
	meaningful?: (char: string) => boolean
}

const defaultMeaningful = (c: string) => /[A-Za-z0-9+]/.test(c)

/**
 * Controlled/uncontrolled string state for masked text inputs. Applies `format`
 * to the seed and to every subsequent change, returning props ready to spread
 * onto an `Input`. Restores the caret to its pre-format position when the
 * returned `ref` is attached, so separators inserted by `format` don't push
 * the cursor to the end on every keystroke.
 */
export function useMaskedInput({
	value,
	defaultValue,
	onChange,
	format,
	ref: externalRef,
	meaningful = defaultMeaningful,
}: UseMaskedInputOptions) {
	const [current, setCurrent] = useControllable<string>({
		value,
		defaultValue: defaultValue !== undefined ? format(defaultValue) : '',
		onValueChange: onChange ? (v) => onChange(v ?? '') : undefined,
	})

	const inputRef = useRef<HTMLInputElement | null>(null)

	const pendingCursorRef = useRef<number | null>(null)

	const setRef = useComposedRef(inputRef, externalRef)

	useLayoutEffect(() => {
		const target = pendingCursorRef.current

		if (target === null) return

		pendingCursorRef.current = null

		const el = inputRef.current

		if (el && document.activeElement === el) {
			el.setSelectionRange(target, target)
		}
	})

	return {
		value: current ?? '',
		ref: setRef,
		setValue: (raw: string) => setCurrent(format(raw)),
		onChange: (e: ChangeEvent<HTMLInputElement>) => {
			const raw = e.target.value

			const cursor = e.target.selectionStart ?? raw.length

			const meaningfulBefore = countMeaningful(raw, cursor, meaningful)

			const formatted = format(raw)

			pendingCursorRef.current = cursorForCount(formatted, meaningfulBefore, meaningful)

			setCurrent(formatted)
		},
	}
}
