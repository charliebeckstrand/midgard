import type { ComponentProps } from 'react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { useHeadless } from '../../providers/headless/context'
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
 * The frame of a form control: the element that draws the focus ring, the
 * border, and the disabled state.
 *
 * @remarks
 * The frame has no classes of its own. The control that renders it gives the
 * `base` slot of its unit as `className`, and each unit of the control group
 * holds the chrome, the radius, and the surface of its frame. The classes take
 * the step of the nearest density scope through stepped `density-*` classes,
 * so the frame reads no context.
 *
 * Under `<HeadlessProvider>`, the frame renders its children alone, with no
 * element, so a headless control is its bare field.
 */
export function ControlFrame({ className, density, children, ...props }: ControlFrameProps) {
	if (useHeadless()) return children

	return (
		<PolymorphicStatic
			as="span"
			density={density}
			className={cn(className)}
			{...props}
			data-slot="control-frame"
		>
			{children}
		</PolymorphicStatic>
	)
}
