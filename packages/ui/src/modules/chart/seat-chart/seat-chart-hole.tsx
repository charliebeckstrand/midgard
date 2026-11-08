'use client'

import { type ReactNode, useRef, useState } from 'react'
import { cn } from '../../../core/cn'
import { useResizeObserver } from '../../../hooks/use-resize-observer'

/** Props for {@link SeatChartHole}. @internal */
type SeatChartHoleProps = {
	/** The center of the arcs, as a percent of the frame from the start and the top. */
	left: string
	top: string
	/** The radius of the clear hole, in pixels. */
	radius: number
	/**
	 * Whether the frame has its size. Before the first measure the hole has no
	 * place yet, so the content holds its place but does not show.
	 */
	measured: boolean
	children: ReactNode
}

/**
 * The content in the hole of a {@link SeatChart}. Its base sits on the base of
 * the hemicycle, so a box of `w` by `h` fits a half disc of radius `r` when its
 * top corners do: `(w / 2)² + h² <= r²`. Content larger than that scales down
 * to fit, so it never covers a seat. Content that fits keeps its size. The
 * content shows once the frame and the content have their sizes, with the
 * seats, so it never moves after the first paint.
 *
 * @internal
 */
export function SeatChartHole({ left, top, radius, measured, children }: SeatChartHoleProps) {
	const ref = useRef<HTMLDivElement>(null)

	const [size, setSize] = useState<{ width: number; height: number } | null>(null)

	// The layout size, not the painted size, so the scale below does not feed back.
	useResizeObserver(ref, () => {
		const el = ref.current

		if (el) setSize({ width: el.offsetWidth, height: el.offsetHeight })
	})

	const scale =
		size === null || size.width === 0 || size.height === 0
			? 1
			: Math.min(1, radius / Math.hypot(size.width / 2, size.height))

	return (
		<div data-slot="chart-center" className="pointer-events-none absolute inset-0">
			<div
				ref={ref}
				className={cn(
					'absolute w-max origin-bottom -translate-x-1/2 -translate-y-full',
					(!measured || size === null) && 'invisible',
				)}
				style={{ left, top, scale: scale < 1 ? String(scale) : undefined }}
			>
				{children}
			</div>
		</div>
	)
}
