import { Fragment } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stepper'
import { Placeholder } from '../placeholder'

export type StepperSkeletonProps = {
	/** Step placeholders to render, separated like the real horizontal stepper. */
	steps?: number
	className?: string
}

/**
 * Stepper-shaped placeholder: indicator dots with title lines below,
 * joined by the real separator rule. Horizontal orientation only; keyed
 * off the step count rather than a size step, so it does not use the
 * size-driven `createSkeleton` factory.
 */
export function StepperSkeleton({ steps = 3, className }: StepperSkeletonProps) {
	const stepKeys = Array.from({ length: steps }, (_, i) => `step-${i}`)

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
