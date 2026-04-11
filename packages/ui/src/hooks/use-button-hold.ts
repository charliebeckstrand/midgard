'use client'

import type React from 'react'
import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_DELAY = 400
const DEFAULT_INTERVAL = 50

type UseButtonHoldOptions = {
	/** When true, the hold does not start and any in-progress repeat is stopped. */
	disabled?: boolean
	/** Delay in ms before the repeat begins after the initial press. */
	delay?: number
	/** Interval in ms between repeats once the hold has started. */
	interval?: number
}

/**
 * Press-and-hold activation for a button.
 *
 * The returned handlers fire `onAction` once on press, then repeat it at
 * `interval` ms after an initial `delay` ms while the pointer is held down.
 * Release, leave, or cancel stops the repeat. Flip `disabled` to true to stop
 * the repeat declaratively — useful when a bound has been reached.
 *
 * Keyboard activation (space/enter) flows through `onClick` as a single fire,
 * without double-triggering after a pointer interaction.
 */
export function useButtonHold(
	onAction: () => void,
	{
		disabled = false,
		delay = DEFAULT_DELAY,
		interval = DEFAULT_INTERVAL,
	}: UseButtonHoldOptions = {},
) {
	const actionRef = useRef(onAction)

	actionRef.current = onAction

	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	const pointerHandledRef = useRef(false)

	const stop = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)

			timeoutRef.current = null
		}

		if (intervalRef.current) {
			clearInterval(intervalRef.current)

			intervalRef.current = null
		}
	}, [])

	useEffect(() => stop, [stop])

	useEffect(() => {
		if (disabled) stop()
	}, [disabled, stop])

	const onPointerDown = (e: React.PointerEvent) => {
		if (disabled) return

		e.preventDefault()

		pointerHandledRef.current = true

		stop()

		actionRef.current()

		timeoutRef.current = setTimeout(() => {
			intervalRef.current = setInterval(() => {
				actionRef.current()
			}, interval)
		}, delay)
	}

	const onPointerUp = () => stop()

	const onPointerLeave = () => {
		stop()

		pointerHandledRef.current = false
	}

	const onPointerCancel = onPointerLeave

	const onClick = () => {
		if (pointerHandledRef.current) {
			pointerHandledRef.current = false

			return
		}

		if (disabled) return

		actionRef.current()
	}

	return { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel, onClick }
}
