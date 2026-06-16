'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useControllable } from '../../hooks'

/**
 * Single-open mode: at most one section open at a time.
 * @internal
 */
export type SingleProps = {
	type?: 'single'
	value?: string | null
	defaultValue?: string | null
	onValueChange?: (value: string | null) => void
	/**
	 * Allow closing the open section to leave none open.
	 * @defaultValue true
	 */
	collapsible?: boolean
}

/**
 * Multiple-open mode: any number of sections open at once.
 * @internal
 */
export type MultipleProps = {
	type: 'multiple'
	value?: string[]
	defaultValue?: string[]
	onValueChange?: (value: string[]) => void
}

/** The open-set query/command surface {@link Accordion} shares via context. */
type AccordionSelection = {
	isOpen: (value: string) => boolean
	toggle: (value: string) => void
}

/**
 * Normalizes single-mode `value`/`defaultValue` to the array shape the shared
 * open-set state uses; `null`/`undefined` collapse to an empty array.
 * @internal
 */
function toArray(value: string | string[] | null | undefined): string[] {
	if (value == null) return []

	return Array.isArray(value) ? value : [value]
}

/**
 * Owns {@link Accordion}'s open-set state and its single-/multiple-mode toggle
 * transitions, collapsing both modes onto a shared string-array of open values.
 *
 * @returns `isOpen(value)` and `toggle(value)` over the current open set.
 *
 * @remarks
 * Single mode keeps at most one value open (honouring `collapsible`); multiple
 * mode adds and removes freely. Controlled `value` and uncontrolled
 * `defaultValue` are normalized through {@link useControllable}, and
 * `onValueChange` is read from a ref so a changing callback never resets the
 * controllable binding.
 *
 * @internal
 */
export function useAccordionSelection(props: SingleProps | MultipleProps): AccordionSelection {
	const isMultiple = props.type === 'multiple'

	const collapsible = isMultiple ? true : (props.collapsible ?? true)

	// The single-mode `toArray` wrap mints a new array each call; memoization
	// keeps the context identity stable across controlled renders.
	const controlledValue = useMemo(
		() =>
			props.type === 'multiple'
				? props.value
				: props.value !== undefined
					? toArray(props.value)
					: undefined,
		[props.type, props.value],
	)

	const defaultValue = isMultiple ? (props.defaultValue ?? []) : toArray(props.defaultValue)

	const onValueChangeRef = useRef(props.onValueChange)

	onValueChangeRef.current = props.onValueChange

	const onControllableChange = useCallback(
		(next: string[] | undefined) => {
			const resolved = next ?? []

			const onValueChange = onValueChangeRef.current

			if (isMultiple) {
				;(onValueChange as MultipleProps['onValueChange'])?.(resolved)
			} else {
				;(onValueChange as SingleProps['onValueChange'])?.(resolved[0] ?? null)
			}
		},
		[isMultiple],
	)

	const [current = [], setCurrent] = useControllable<string[]>({
		value: controlledValue,
		defaultValue,
		onValueChange: onControllableChange,
	})

	const isOpen = useCallback((value: string) => current.includes(value), [current])

	const toggle = useCallback(
		(value: string) => {
			if (isMultiple) {
				const next = current.includes(value)
					? current.filter((v) => v !== value)
					: [...current, value]

				setCurrent(next)

				return
			}

			if (current.includes(value)) {
				if (collapsible) setCurrent([])
			} else {
				setCurrent([value])
			}
		},
		[current, collapsible, setCurrent, isMultiple],
	)

	return { isOpen, toggle }
}
