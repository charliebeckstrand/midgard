import type React from 'react'
import { cn } from '../../core'

export type SpacerProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

/** Fills available space inside a flex container. */
export function Spacer({ className, ...props }: SpacerProps) {
	return (
		<div
			data-slot="spacer"
			aria-hidden="true"
			className={cn('flex-1 self-stretch', className)}
			{...props}
		/>
	)
}
