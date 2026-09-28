'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** Argument to {@link useControllable}'s setter: a next value, `null`/`undefined` to clear, or a functional updater over the previous value. */
export type SetValue<T> = T | null | undefined | ((prev: T | undefined) => T | null | undefined)

/** Options for {@link useControllable}: the controlled `value`, the uncontrolled `defaultValue`, and the change report. */
export type ControllableOptions<T> = {
	/** Controlled value. `undefined` leaves the hook uncontrolled; pass `null` to stay controlled with no current value. */
	value?: T | null
	/** Initial value when uncontrolled. Pass a thunk for a lazy initializer, evaluated once on mount (mirrors `useState`). */
	defaultValue?: T | (() => T)
	/** Fires with the committed value, or `null` once it is cleared (CONVENTIONS §7.3). */
	onValueChange?: (value: T | null) => void
}

/**
 * Manages controlled / uncontrolled value state with a unified setter.
 *
 * @typeParam T - The value type; the hook stores and emits `T | undefined`.
 * @returns A `[value, setValue]` tuple. `setValue` accepts a next value or a
 * functional updater, writes the shadow state, and fires `onValueChange`;
 * controlled-ness is decided per render from the `value` prop.
 */
export function useControllable<T>({
	value,
	defaultValue,
	onValueChange,
}: ControllableOptions<T>): [T | undefined, (value: SetValue<T>) => void] {
	const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

	const isControlled = value !== undefined

	const currentValue = isControlled ? (value ?? undefined) : internalValue

	// Resolution base for functional updaters: re-synced to the committed value
	// on each commit, advanced eagerly on every `setValue` call so updaters
	// batched in one tick chain instead of resolving against the same stale value.
	const valueRef = useRef(currentValue)

	// A ref, not an effect event. A caller can set the value during render
	// (`useTooltipState` closes a tooltip that turns off, as an adjustment during
	// render), and an effect event throws when render calls it.
	const onValueChangeRef = useRef(onValueChange)

	// Synced before paint, not during render. Events run after the commit, and a
	// set during render adjusts from the committed value, which is the value the
	// refs hold. Run on every commit, not keyed on the value: a controlled owner
	// that refuses a change keeps its `value`, and the eager write above must still
	// fall back to it once the render lands.
	useLayoutEffect(() => {
		valueRef.current = currentValue

		onValueChangeRef.current = onValueChange
	})

	const setValue = useCallback((next: SetValue<T>) => {
		const resolved =
			typeof next === 'function'
				? (next as (prev: T | undefined) => T | null | undefined)(valueRef.current)
				: next

		// Internally "no value" is always `undefined`, so a `null` clear from a
		// caller and an `undefined` one converge on one stored representation.
		const normalized = resolved ?? undefined

		valueRef.current = normalized

		// Written even while controlled: `value !== undefined` decides
		// controlled-ness per render, so a controlled consumer that clears to
		// `undefined` flips the hook to uncontrolled; the shadow keeps that
		// flip resolving to the last committed value instead of a stale one.
		setInternalValue(normalized)

		// §7.3: the public callback reports a cleared value as `null` — echoing
		// `undefined` back into `value` would read as uncontrolled.
		onValueChangeRef.current?.(normalized ?? null)
	}, [])

	return [currentValue, setValue]
}

/** Options for {@link useControllableFlag}: the controlled `value`, the uncontrolled `defaultValue`, and the change report. */
export type ControllableFlagOptions = {
	/** Controlled flag. `undefined` leaves the hook uncontrolled. */
	value?: boolean
	/**
	 * Initial flag when uncontrolled.
	 * @defaultValue false
	 */
	defaultValue?: boolean
	/** Fires with the committed flag. A cleared flag reports `false`. */
	onValueChange?: (value: boolean) => void
}

/**
 * The boolean form of {@link useControllable}, for an `open`, `pressed`, or
 * `checked` prop with its `default` and `on…Change` twins.
 *
 * @returns A `[value, setValue]` tuple. `value` is never `undefined`.
 * @remarks A flag has no "no value" state, so a `null` or `undefined` from the
 * setter reads and reports as `false`. This is the one place where the §7.3 clear
 * becomes `false` for a flag.
 */
export function useControllableFlag({
	value,
	defaultValue = false,
	onValueChange,
}: ControllableFlagOptions): [boolean, (value: SetValue<boolean>) => void] {
	const [current = false, setValue] = useControllable<boolean>({
		value,
		defaultValue,
		onValueChange: onValueChange && ((next) => onValueChange(next ?? false)),
	})

	return [current, setValue]
}
