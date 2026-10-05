'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { DEFAULT_HSVA } from './color-constants'
import { clampHsva, sameColorValue, serializeColor, toHsva } from './color-utilities'
import type { ColorFormat, Hsva } from './types'

export type ColorStateOptions = {
	/** The controlled color. `null` keeps the state controlled with no color (CONVENTIONS §7.3). */
	value?: string | Hsva | null
	defaultValue?: string | Hsva
	format: ColorFormat
	alpha: boolean
	onValueChange?: (value: string | Hsva) => void
}

export type ColorState = {
	hsva: Hsva
	setHsva: (next: Hsva | ((prev: Hsva) => Hsva)) => void
}

/** Whether two HSVA values are the same in each channel. @internal */
function sameHsva(a: Hsva, b: Hsva): boolean {
	return a.h === b.h && a.s === b.s && a.v === b.v && a.a === b.a
}

/** The HSVA with its alpha pinned to `1` when `alpha` is off, else the HSVA as it is. @internal */
function pinAlpha(hsva: Hsva, alpha: boolean): Hsva {
	return alpha ? hsva : { ...hsva, a: 1 }
}

/**
 * Controlled/uncontrolled color state. Keeps HSVA internally regardless of
 * the consumer's wire format; hex drops hue at grayscale and black.
 *
 * Owns the HSVA and reconciles against the `value` prop, skipping echoes of
 * its own emission, compared on the serialized form.
 *
 * @returns The live `hsva` and a `setHsva` accepting a value or an updater.
 * `setHsva` clamps, pins alpha to `1` when `alpha` is off, and emits the
 * serialized value through `onValueChange`.
 * @remarks
 * When `alpha` is off, the hook pins alpha to `1` on each color that it
 * holds: the seed, an adopted `value`, and the held color when `alpha`
 * switches off. The panel does not show the alpha then, and a translucent
 * color cannot match an opaque swatch.
 *
 * A controlled `value` wins (CONVENTIONS §7.2). A `null` value paints
 * {@link DEFAULT_HSVA} and ignores `defaultValue`. Reconciliation runs in a
 * layout effect keyed on `value`, `hsva`, and `alpha`, before paint. A
 * `value` that differs from the last emission snaps the HSVA back, so an
 * owner that does not adopt an emission keeps its color. An owner that
 * echoes the emission is skipped, so the HSVA keeps the hue that hex drops.
 * An owner that adopts after a delay sees each change snap back until its
 * value arrives.
 * `setHsva` is a stable event. It reads the newest `format`, `alpha`, and
 * `onValueChange` when it runs, and keeps one identity across renders.
 * @internal
 */
export function useColorState({
	value,
	defaultValue,
	format,
	alpha,
	onValueChange,
}: ColorStateOptions): ColorState {
	const [hsva, setInternal] = useState<Hsva>(() =>
		pinAlpha(toHsva(value === undefined ? defaultValue : value) ?? DEFAULT_HSVA, alpha),
	)

	// The newest HSVA, so that a second `setHsva` in one event resolves its
	// updater against the first. Only the effects below and `setHsva` write it,
	// and each write goes with the `setInternal` call that makes it the state.
	const hsvaRef = useRef(hsva)

	// Last external value adopted or emitted, in the consumer's wire format;
	// the echo guard the reconcile effect compares against.
	const cacheRef = useRef<string | Hsva | null>(serializeColor(hsva, format, alpha))

	// Keyed on `hsva` too: an owner that does not adopt an emission keeps the
	// same `value`, and the check must still run to snap the HSVA back (§7.2).
	useLayoutEffect(() => {
		if (value === undefined) return

		// Skip echoes of the last adopted or emitted value.
		if (sameColorValue(value, cacheRef.current)) return

		// A controlled empty value has no color of its own, so it paints black.
		const parsed = value === null ? DEFAULT_HSVA : toHsva(value)

		if (!parsed) return

		cacheRef.current = value

		const adopted = pinAlpha(parsed, alpha)

		// The HSVA already holds the value, so no write is needed.
		if (sameHsva(adopted, hsva)) return

		hsvaRef.current = adopted
		setInternal(adopted)
	}, [value, hsva, alpha])

	// A switch of `alpha` to off pins the alpha of the held color. The effect
	// above runs first, so this effect reads the color that it adopts.
	useLayoutEffect(() => {
		const held = hsvaRef.current
		const pinned = pinAlpha(held, alpha)

		if (sameHsva(pinned, held)) return

		hsvaRef.current = pinned
		setInternal(pinned)
	}, [alpha])

	const setHsva = useStableEvent((next: Hsva | ((prev: Hsva) => Hsva)) => {
		const prev = hsvaRef.current
		const resolved = typeof next === 'function' ? next(prev) : next
		const normalized = clampHsva(pinAlpha(resolved, alpha))

		hsvaRef.current = normalized

		const external = serializeColor(normalized, format, alpha)
		cacheRef.current = external

		setInternal(normalized)
		onValueChange?.(external)
	})

	return { hsva, setHsva }
}
