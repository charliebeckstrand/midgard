'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { DEFAULT_HSVA } from './color-constants'
import { clampHsva, pinAlpha, sameColorValue, serializeColor, toHsva } from './color-utilities'
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
		let next = hsva

		// Skip echoes of the last adopted or emitted value. A controlled empty
		// value has no color of its own, so it paints black.
		if (value !== undefined && !sameColorValue(value, cacheRef.current)) {
			const parsed = value === null ? DEFAULT_HSVA : toHsva(value)

			if (parsed) {
				cacheRef.current = value

				next = parsed
			}
		}

		// Each held color is already pinned, so this pin changes the color only
		// when `alpha` switches off.
		next = pinAlpha(next, alpha)

		// The HSVA already holds the color, so no write is needed.
		if (sameHsva(next, hsva)) return

		hsvaRef.current = next
		setInternal(next)
	}, [value, hsva, alpha])

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
