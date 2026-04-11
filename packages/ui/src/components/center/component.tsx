import type React from 'react'
import { cn } from '../../core'
import { type CenterMaxW, type CenterMinH, maxWMap, minHMap } from './variants'

export type CenterProps = {
	/** Minimum height constraint. Useful for fullscreen centering. */
	minH?: CenterMinH
	/** Constrain the centered content to a maximum width. */
	maxW?: CenterMaxW
	/** Render as `inline-flex` instead of `flex`. */
	inline?: boolean
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

export function Center({ minH, maxW, inline, className, children, ...props }: CenterProps) {
	const content = maxW ? (
		<div data-slot="center-content" className={cn('w-full', maxWMap[maxW])}>
			{children}
		</div>
	) : (
		children
	)

	return (
		<div
			data-slot="center"
			className={cn(
				inline ? 'inline-flex' : 'flex',
				'items-center justify-center',
				minH && minHMap[minH],
				className,
			)}
			{...props}
		>
			{content}
		</div>
	)
}
