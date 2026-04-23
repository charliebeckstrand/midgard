'use client'

import { type ReactNode, useMemo } from 'react'
import { CurrentProvider, useCurrent } from '../../primitives'
import { SegmentProvider } from './context'
import type { SegmentControlVariants } from './variants'

// ── Segment ─────────────────────────────────────────────

export type SegmentProps = SegmentControlVariants & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	className?: string
	children?: ReactNode
}

export function Segment({
	value: valueProp,
	defaultValue,
	onValueChange,
	size = 'md',
	className,
	children,
}: SegmentProps) {
	const [currentCtx] = useCurrent({
		value: valueProp,
		defaultValue,
		onChange: onValueChange,
	})

	const segmentCtx = useMemo(() => ({ size: size ?? ('md' as const) }), [size])

	return (
		<CurrentProvider value={currentCtx}>
			<SegmentProvider value={segmentCtx}>
				<div data-slot="segment" className={className}>
					{children}
				</div>
			</SegmentProvider>
		</CurrentProvider>
	)
}
