'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
import { createKeyedStore, type KeyedStore } from '../../utilities'

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
	// Single mode's own prop. Declared here so that the root can take it out of
	// the rest in either mode. It stays undocumented, so the props table keeps
	// the single-mode description alone.
	collapsible?: never
}

/** The open-set query/command surface {@link Accordion} shares via context. */
type AccordionSelection = {
	/** Whether each value is open. An item subscribes to its own value. */
	openStore: KeyedStore<string, boolean>
	/** Toggles a value. It keeps its identity across renders. */
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
 * @returns `openStore`, which holds whether each value is open, and a stable
 * `toggle(value)` over the current open set.
 *
 * @remarks
 * Single mode keeps at most one value open (honoring `collapsible`); multiple
 * mode adds and removes freely. Controlled `value` and uncontrolled
 * `defaultValue` are normalized through {@link useControllable}, and
 * `onValueChange` is read from a ref so a changing callback never resets the
 * controllable binding.
 *
 * Each item reads its own value from `openStore`, so a toggle renders only the
 * items whose open state changed. The open set stays out of the context value,
 * because a new set would render each item.
 *
 * @internal
 */
export function useAccordionSelection(props: SingleProps | MultipleProps): AccordionSelection {
	const isMultiple = props.type === 'multiple'

	// Single-mode state only: the multiple-mode `toggle` branch adds and removes
	// unconditionally and returns before any read.
	const collapsible = isMultiple ? undefined : (props.collapsible ?? true)

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

	// A plain closure: `useControllable` reads its own `onValueChange` off a ref
	// behind a stable `setValue`, so an inline callback needs no ref or memo here.
	const onControllableChange = (next: string[] | null) => {
		const resolved = next ?? []

		const onValueChange = props.onValueChange

		if (isMultiple) {
			;(onValueChange as MultipleProps['onValueChange'])?.(resolved)
		} else {
			;(onValueChange as SingleProps['onValueChange'])?.(resolved[0] ?? null)
		}
	}

	const [current = [], setCurrent] = useControllable<string[]>({
		value: controlledValue,
		defaultValue,
		onValueChange: onControllableChange,
	})

	// The open set of the last commit, for a toggle that keeps its identity.
	const latest = useRef(current)

	const [openStore] = useState(() => {
		const open = new Set(current)

		return createKeyedStore((value: string) => open.has(value))
	})

	useLayoutEffect(() => {
		latest.current = current

		const open = new Set(current)

		openStore.publish((value) => open.has(value))
	}, [openStore, current])

	const toggle = useCallback(
		(value: string) => {
			const open = latest.current

			if (isMultiple) {
				setCurrent(open.includes(value) ? open.filter((v) => v !== value) : [...open, value])

				return
			}

			if (open.includes(value)) {
				if (collapsible) setCurrent([])
			} else {
				setCurrent([value])
			}
		},
		[collapsible, setCurrent, isMultiple],
	)

	return { openStore, toggle }
}
