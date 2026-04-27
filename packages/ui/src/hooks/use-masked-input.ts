'use client'

import { type ChangeEvent, type Ref, useCallback, useLayoutEffect, useRef } from 'react'
import { useControllable } from './use-controllable'

export type UseMaskedInputOptions = {
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

export type UseMaskedInputReturn = {
	value: string
	/** Attach to the input to enable caret restoration after format. */
	ref: (node: HTMLInputElement | null) => void
	setValue: (raw: string) => void
	onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

const defaultMeaningful = (c: string) => /[A-Za-z0-9+]/.test(c)

function countMeaningful(s: string, end: number, test: (c: string) => boolean) {
	const limit = Math.min(end, s.length)

	let count = 0

	for (let i = 0; i < limit; i++) if (test(s.charAt(i))) count++

	return count
}

function cursorForCount(s: string, target: number, test: (c: string) => boolean) {
	if (target <= 0) return 0

	let count = 0

	for (let i = 0; i < s.length; i++) {
		if (test(s.charAt(i))) {
			count++

			if (count === target) return i + 1
		}
	}

	return s.length
}

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
}: UseMaskedInputOptions): UseMaskedInputReturn {
	const [current, setCurrent] = useControllable<string>({
		value,
		defaultValue: defaultValue !== undefined ? format(defaultValue) : '',
		onChange: onChange ? (v) => onChange(v ?? '') : undefined,
	})

	const inputRef = useRef<HTMLInputElement | null>(null)

	const pendingCursorRef = useRef<number | null>(null)

	const setRef = useCallback(
		(node: HTMLInputElement | null) => {
			inputRef.current = node

			if (typeof externalRef === 'function') externalRef(node)
			else if (externalRef) externalRef.current = node
		},
		[externalRef],
	)

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
		setValue: (raw) => setCurrent(format(raw)),
		onChange: (event) => {
			const raw = event.target.value

			const cursor = event.target.selectionStart ?? raw.length

			const meaningfulBefore = countMeaningful(raw, cursor, meaningful)

			const formatted = format(raw)

			pendingCursorRef.current = cursorForCount(formatted, meaningfulBefore, meaningful)

			setCurrent(formatted)
		},
	}
}
