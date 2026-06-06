'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_HSVA } from './color-constants'
import { clampHsva, sameColorValue, serializeColor, toHsva } from './color-utilities'
import type { ColorFormat, Hsva } from './types'

export type ColorStateOptions = {
	value?: string | Hsva
	defaultValue?: string | Hsva
	format: ColorFormat
	alpha: boolean
	onValueChange?: (value: string | Hsva) => void
}

export type ColorState = {
	hsva: Hsva
	setHsva: (next: Hsva | ((prev: Hsva) => Hsva)) => void
}

/**
 * Controlled/uncontrolled colour state that keeps HSVA internally regardless of
 * the consumer's wire format. Holding HSVA (not the serialised hex) is what
 * preserves hue while dragging through greyscale or black, where a hex
 * round-trip would otherwise reset it.
 *
 * `useControllable` can't be reused here: it stores the external value verbatim,
 * so a controlled hex consumer would lose that hue. Instead we own the HSVA and
 * reconcile against the `value` prop, skipping the echo of our own emission
 * (compared on the serialised form) so a parent that simply mirrors
 * `onValueChange` never clobbers the in-flight hue.
 */
export function useColorState({
	value,
	defaultValue,
	format,
	alpha,
	onValueChange,
}: ColorStateOptions): ColorState {
	const [hsva, setInternal] = useState<Hsva>(() => toHsva(value ?? defaultValue) ?? DEFAULT_HSVA)

	const hsvaRef = useRef(hsva)
	hsvaRef.current = hsva

	// Last external value we adopted or emitted, in the consumer's wire format —
	// the echo guard the reconcile effect compares against.
	const cacheRef = useRef<string | Hsva>(serializeColor(hsva, format, alpha))

	const formatRef = useRef(format)
	formatRef.current = format

	const alphaRef = useRef(alpha)
	alphaRef.current = alpha

	const onChangeRef = useRef(onValueChange)
	onChangeRef.current = onValueChange

	useEffect(() => {
		if (value === undefined) return

		// Ignore the controlled parent echoing back what we just emitted; only a
		// genuinely different value should re-seat the internal HSVA.
		if (sameColorValue(value, cacheRef.current)) return

		const parsed = toHsva(value)

		if (!parsed) return

		cacheRef.current = value
		hsvaRef.current = parsed
		setInternal(parsed)
	}, [value])

	const setHsva = useCallback((next: Hsva | ((prev: Hsva) => Hsva)) => {
		const prev = hsvaRef.current
		const resolved = typeof next === 'function' ? next(prev) : next
		const normalized = clampHsva(alphaRef.current ? resolved : { ...resolved, a: 1 })

		hsvaRef.current = normalized

		const external = serializeColor(normalized, formatRef.current, alphaRef.current)
		cacheRef.current = external

		setInternal(normalized)
		onChangeRef.current?.(external)
	}, [])

	return { hsva, setHsva }
}
