'use client'

import { type RefObject, useLayoutEffect, useState } from 'react'

export type ViewportSize = { width: number; height: number }

/**
 * Tracks the content-box size of `ref.current` (`clientWidth`/`Height` minus padding).
 *
 * Re-measures synchronously when `invalidationKey` changes, so callers can force a
 * measurement before paint — e.g. on rotation flip, where the viewport's aspect
 * ratio changes and we want `fitScale` calculated against the new dimensions
 * before the browser paints, instead of waiting a frame for `ResizeObserver`.
 */
export function useViewportSize(
	ref: RefObject<HTMLElement | null>,
	invalidationKey: unknown,
): ViewportSize | null {
	const [size, setSize] = useState<ViewportSize | null>(null)

	// biome-ignore lint/correctness/useExhaustiveDependencies: invalidationKey is a re-measure trigger — its identity, not its use inside the effect, is the dep
	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

		const measure = () => {
			const styles = window.getComputedStyle(el)

			const padX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
			const padY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)

			setSize({
				width: el.clientWidth - padX,
				height: el.clientHeight - padY,
			})
		}

		measure()

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [ref, invalidationKey])

	return size
}
