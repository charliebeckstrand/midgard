import { Fragment } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stepper'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link StepperSkeleton}; the placeholder step count. */
export type StepperSkeletonProps = {
	/**
	 * Step placeholders to render.
	 * @defaultValue 3
	 */
	steps?: number
	className?: string
}

/**
 * Stepper-shaped placeholder: indicator dots with title lines below,
 * joined by the real separator rule. Horizontal orientation only. Keyed
 * off the step count rather than a size step; it does not use the
 * size-driven `createSkeleton` factory.
 *
 * @remarks
 * `steps` sets the silhouette's segment count; match it to the expected step
 * count so the placeholder mirrors the loaded stepper's footprint.
 *
 * @see {@link Stepper}
 */
export function StepperSkeleton({ steps = 3, className }: StepperSkeletonProps) {
	const stepKeys = rangeKeys(steps, 'step')

	return (
		<div className={cn(k.root({ orientation: 'horizontal' }), className)}>
			{stepKeys.map((stepKey, index) => (
				<Fragment key={stepKey}>
					{index > 0 && <div className={cn(k.separator({ orientation: 'horizontal' }))} />}
					<div className={cn(k.skeleton.step)}>
						<Placeholder className={cn(k.skeleton.indicator)} />
						<Placeholder className={cn(k.skeleton.title)} />
					</div>
				</Fragment>
			))}
		</div>
	)
}
