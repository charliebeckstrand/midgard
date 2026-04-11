import type React from 'react'
import { cn } from '../../core'

export type SpacerProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

/**
 * Flexible spacer that fills available space inside a flex container.
 * Use inside `<Stack>` to push siblings apart.
 */
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
