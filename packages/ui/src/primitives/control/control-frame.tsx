import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { k } from '../../recipes/kata/control'
import { PolymorphicStatic } from '../polymorphic'

/** Props for {@link ControlFrame}: the density step and the standard `span` attributes. */
export type ControlFrameProps = ComponentProps<'span'> & {
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the frame a density scope.
	 */
	density?: DensityStep
}

/**
 * Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs.
 *
 * @remarks
 * Its corner radius takes the step of the nearest density scope through
 * stepped `density-*` classes, so it reads no context.
 */
export function ControlFrame({ className, density, children, ...props }: ControlFrameProps) {
	return (
		<PolymorphicStatic
			as="span"
			data-slot="control-frame"
			density={density}
			className={cn(k.frame.base, k.frame.radius, className)}
			{...props}
		>
			{children}
		</PolymorphicStatic>
	)
}
