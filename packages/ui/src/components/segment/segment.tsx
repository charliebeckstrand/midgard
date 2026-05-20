'use client'

import { type ReactNode, useMemo } from 'react'
import { CurrentProvider, useCurrentState } from '../../primitives/current'
import type { SegmentControlVariants } from '../../recipes/kata/segment'
import { SegmentProvider } from './context'

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
	const currentContext = useCurrentState({
		value: valueProp,
		defaultValue,
		onValueChange,
	})

	const segmentContext = useMemo(() => ({ size: size ?? ('md' as const) }), [size])

	return (
		<CurrentProvider value={currentContext}>
			<SegmentProvider value={segmentContext}>
				<div data-slot="segment" className={className}>
					{children}
				</div>
			</SegmentProvider>
		</CurrentProvider>
	)
}
