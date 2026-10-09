'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** Argument to {@link useControllable}'s setter: a next value, `null`/`undefined` to clear, or a functional updater over the previous value. */
export type SetValue<T> = T | null | undefined | ((prev: T | undefined) => T | null | undefined)

/** Options for {@link useControllable}: the controlled `value`, the uncontrolled `defaultValue`, and the change report. */
export type ControllableOptions<T> = {
	/**
	 * Controlled value. `undefined` leaves the hook uncontrolled; pass `null` to stay controlled with no current value.
	 * After the first value that is not `undefined`, the hook stays controlled, and a later `undefined` reads as `null`.
	 */
	value?: T | null
	/** Initial value when uncontrolled. Pass a thunk for a lazy initializer, evaluated once on mount (mirrors `useState`). */
	defaultValue?: T | (() => T)
	/**
	 * Fires with the next value, or `null` once it is cleared (CONVENTIONS §7.3). It fires only for a change: a set
	 * to the value on screen that is also the value of the last report reports nothing.
	 */
	onValueChange?: (value: T | null) => void
}

// The mark for "no set in this batch". A set value can be `undefined`, so the
// mark must be a value that no set can give.
const NONE: unique symbol = Symbol('none')

/**
 * Manages controlled / uncontrolled value state with a unified setter.
 *
 * @typeParam T - The value type; the hook stores and emits `T | undefined`.
 * @returns A `[value, setValue]` tuple. `setValue` accepts a next value or a
 * functional updater. It reports a change to `onValueChange`, and an
 * uncontrolled hook also stores it.
 * @remarks A report goes out only for a change. A set is not a change when its
 * value is the value on screen and also the value of the last report. Thus a
 * controlled owner that refuses a change gets the next request for that change
 * too. An owner that shows a value other than the value it holds gets the
 * report that moves its state back. After a refusal, the hook can report the
 * value on screen once, which the owner already holds.
 *
 * The hook is uncontrolled until `value` is not `undefined` for the first
 * time. After that it stays controlled, and a `value` of `undefined` reads as
 * an empty value. An owner that clears its state to `undefined` thus shows an
 * empty control, not a value from before it took control. A controlled set
 * stores nothing in the hook, so a refused change renders nothing.
 */
export function useControllable<T>({
	value,
	defaultValue,
	onValueChange,
}: ControllableOptions<T>): [T | undefined, (value: SetValue<T>) => void] {
	const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)

	// Adjusted during render: the first render with a value takes control.
	const [controlled, setControlled] = useState(value !== undefined)

	if (value !== undefined && !controlled) setControlled(true)

	const isControlled = controlled || value !== undefined

	const currentValue = isControlled ? (value ?? undefined) : internalValue

	// The value on screen, as of the last commit.
	const shownRef = useRef(currentValue)

	// The value that the owner holds, as far as the hook knows: the value of the
	// last report. An owner can show a value that it does not hold. AddressInput
	// shows its menu closed until results arrive, and Tooltip shows a held tooltip
	// open. Such an owner must hear a change back from the value of the last
	// report, though the screen does not move.
	const heldRef = useRef(currentValue)

	// The value of the last set in this batch. Updaters batched in one tick
	// chain from it, instead of from the same stale value. A commit clears it,
	// and so does the end of the task, because a refused controlled change
	// commits nothing.
	const pendingRef = useRef<T | undefined | typeof NONE>(NONE)

	const controlledRef = useRef(isControlled)

	// A ref, not an effect event. A caller can set the value during render
	// (`useTooltipState` closes a tooltip that turns off, as an adjustment during
	// render), and an effect event throws when render calls it.
	const onValueChangeRef = useRef(onValueChange)

	// Synced before paint, not during render. Events run after the commit, and a
	// set during render adjusts from the committed value, which is the value the
	// refs hold.
	useLayoutEffect(() => {
		shownRef.current = currentValue

		pendingRef.current = NONE

		controlledRef.current = isControlled

		onValueChangeRef.current = onValueChange
	})

	const setValue = useCallback((next: SetValue<T>) => {
		const pending = pendingRef.current

		const base = pending === NONE ? shownRef.current : pending

		const resolved =
			typeof next === 'function'
				? (next as (prev: T | undefined) => T | null | undefined)(base)
				: next

		// Internally "no value" is always `undefined`, so a `null` clear from a
		// caller and an `undefined` one converge on one stored representation.
		const normalized = resolved ?? undefined

		if (Object.is(normalized, base) && Object.is(normalized, heldRef.current)) return

		// A controlled set commits nothing when the owner refuses it, so the end
		// of the task clears the batch value.
		if (pending === NONE && controlledRef.current) {
			queueMicrotask(() => {
				pendingRef.current = NONE
			})
		}

		pendingRef.current = normalized

		heldRef.current = normalized

		if (!controlledRef.current) setInternalValue(normalized)

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

	// A clear becomes `false` before the change check, so a clear of a flag that
	// is already `false` reports nothing.
	const setFlag = useCallback(
		(next: SetValue<boolean>) =>
			setValue(
				typeof next === 'function' ? (prev) => next(prev ?? false) ?? false : (next ?? false),
			),
		[setValue],
	)

	return [current, setFlag]
}
