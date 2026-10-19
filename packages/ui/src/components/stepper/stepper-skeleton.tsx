import { Fragment } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stepper'
import type { Responsive } from '../../types'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'
import { type StepperOrientation, stepperLayout } from './context'

/** Props for {@link StepperSkeleton}: the placeholder step count and the `orientation` of the stepper. */
export type StepperSkeletonProps = {
	/**
	 * Step placeholders to render.
	 * @defaultValue 3
	 */
	steps?: number
	/**
	 * The orientation of the stepper it stands in for, single or per breakpoint,
	 * as on Stepper.
	 * @defaultValue 'vertical'
	 */
	orientation?: Responsive<StepperOrientation>
	className?: string
}

/**
 * A placeholder for a Stepper while it loads. It shows indicator dots with
 * title lines, joined by the real separator rule. The root, the steps, the
 * separators, and the title offset come from the stepper recipes, so each
 * layout matches the real stepper. Keyed off the step count rather than a size
 * step; it does not use the size-driven `createSkeleton` factory.
 *
 * @remarks
 * `steps` sets the silhouette's segment count; match it to the expected step
 * count so the placeholder mirrors the loaded stepper's footprint.
 *
 * @see {@link Stepper}
 */
export function StepperSkeleton({
	steps = 3,
	orientation = 'vertical',
	className,
}: StepperSkeletonProps) {
	const stepKeys = rangeKeys(steps, 'step')

	const layout = stepperLayout(orientation)

	return (
		<div className={cn(k.base.base, layout.base, className)}>
			{stepKeys.map((stepKey, index) => (
				<Fragment key={stepKey}>
					{index > 0 && <div className={cn(k.separator.base, layout.separator)} />}
					<div className={cn(k.step.base, layout.step, 'cursor-default')}>
						<Placeholder className={cn(k.skeleton.indicator)} />
						<div className={cn(k.content.base, layout.content)}>
							<Placeholder className={cn(k.title.base(), layout.title, k.skeleton.title)} />
						</div>
					</div>
				</Fragment>
			))}
		</div>
	)
}
