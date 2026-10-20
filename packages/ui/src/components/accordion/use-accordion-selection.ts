'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useControllable } from '../../hooks'
import { useKeyedStore } from '../../hooks/use-keyed-store'
import { type KeyedStore, toggleListItem } from '../../utilities'

/**
 * The open set of a single accordion that can close to none.
 * @internal
 */
type CollapsibleSingle = {
	/**
	 * Lets a toggle close the open section, so that none is open. `false` requires
	 * a `value` or a `defaultValue`, so that a section is open from the start.
	 *
	 * @remarks
	 * With `false`, one section stays open: a toggle of the open section does
	 * nothing, and a toggle of another section moves the open section to it.
	 *
	 * @defaultValue true
	 */
	collapsible?: true
	value?: string | null
	defaultValue?: string | null
	/**
	 * Fires when the open sections change: a single accordion gives the open
	 * value, or `null` for none, and a multiple accordion gives the open values.
	 * A held accordion never closes to none, so it never fires with `null`.
	 */
	onValueChange?: (value: string | null) => void
}

/**
 * The open set of a single accordion that holds one section open. It starts
 * with that section open, so it takes the section from `value` or
 * `defaultValue`.
 * @internal
 */
type HeldSingle = {
	collapsible: false
	/**
	 * Fires when the open sections change: a single accordion gives the open
	 * value, or `null` for none, and a multiple accordion gives the open values.
	 * A held accordion never closes to none, so it never fires with `null`.
	 */
	onValueChange?: (value: string) => void
} & ({ value: string; defaultValue?: string } | { value?: undefined; defaultValue: string })

/**
 * Single-open mode: at most one section open at a time.
 * @internal
 */
export type SingleProps = {
	/** The open mode. Single mode keeps one section open at most. @defaultValue 'single' */
	type?: 'single'
} & (CollapsibleSingle | HeldSingle)

/**
 * Multiple-open mode: any number of sections open at once.
 * @internal
 */
export type MultipleProps = {
	type: 'multiple'
	value?: string[]
	defaultValue?: string[]
	/**
	 * Fires when the open sections change: a single accordion gives the open
	 * value, or `null` for none, and a multiple accordion gives the open values.
	 * A held accordion never closes to none, so it never fires with `null`.
	 */
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
	/**
	 * Whether a toggle can close an open section. Only a single accordion with
	 * `collapsible={false}` holds its open section.
	 */
	collapsible: boolean
}

/** Reads whether a value is in the open list. It builds a set once for each list. */
function openReader(open: readonly string[]): (value: string) => boolean {
	const set = new Set(open)

	return (value) => set.has(value)
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
 * `toggle(value)` over the current open set. Also `collapsible`, which says
 * whether a toggle can close an open section.
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
	const multiple = props.type === 'multiple'

	// A multiple accordion closes each open section on a toggle.
	const collapsible = multiple || (props.collapsible ?? true)

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

	// Set while a toggle that changes nothing runs. `useControllable` compares
	// by identity, and the array that the owner passes back is not the array of
	// the last report, so such a toggle would report the open set again.
	const unchangedRef = useRef(false)

	const defaultValue = multiple ? (props.defaultValue ?? []) : toArray(props.defaultValue)

	// A plain closure: `useControllable` reads its own `onValueChange` off a ref
	// behind a stable `setValue`, so an inline callback needs no ref or memo here.
	const onControllableChange = (next: string[] | null) => {
		if (unchangedRef.current) return

		const values = next ?? []

		const onValueChange = props.onValueChange

		if (multiple) {
			;(onValueChange as MultipleProps['onValueChange'])?.(values)
		} else {
			// A held accordion never empties its open set, so only a collapsible one
			// reports `null`.
			;(onValueChange as CollapsibleSingle['onValueChange'])?.(values[0] ?? null)
		}
	}

	const [open = [], setOpen] = useControllable<string[]>({
		value: controlledValue,
		defaultValue,
		onValueChange: onControllableChange,
	})

	const openStore = useKeyedStore(open, openReader)

	// The updater starts from the set of the last toggle in the batch, so a
	// second toggle in the same batch starts from the first. A toggle that
	// changes nothing gives the same set back, which reports no change.
	const toggle = useCallback(
		(value: string) => {
			setOpen((prev = []) => {
				const next = nextOpenSet(prev, value, multiple, collapsible)

				unchangedRef.current = next === null

				return next ?? prev
			})

			unchangedRef.current = false
		},
		[collapsible, setOpen, multiple],
	)

	return { openStore, toggle, collapsible }
}

/**
 * The open set after a toggle of `value`, or `null` when the toggle changes
 * nothing. A single accordion with `collapsible={false}` keeps its open section.
 */
function nextOpenSet(
	open: readonly string[],
	value: string,
	multiple: boolean,
	collapsible: boolean,
): string[] | null {
	if (multiple) return toggleListItem(open, value)

	if (!open.includes(value)) return [value]

	return collapsible ? [] : null
}
