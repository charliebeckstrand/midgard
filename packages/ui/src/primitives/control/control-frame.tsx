import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/control'

/** Props for {@link ControlFrame}: the standard `span` attributes. */
export type ControlFrameProps = ComponentProps<'span'>

/**
 * Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs.
 *
 * @remarks
 * Its corner radius takes the step of the nearest density scope through
 * stepped `density-*` classes, so it reads no context.
 */
export function ControlFrame({ className, ...props }: ControlFrameProps) {
	return (
		<span
			data-slot="control-frame"
			className={cn(k.frame.base, k.frame.radius, className)}
			{...props}
		/>
	)
}
