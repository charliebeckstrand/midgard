'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'

type ValueStepperProps = {
	value: number
	onValueChange: (value: number) => void
	min?: number
	max: number
	step?: number
	/** What the stepper drives, woven into each button's accessible name (`Decrease <label>`). */
	label?: string
}

/** A compact −/+ stepper for driving a numeric demo control, clamped to `[min, max]`. */
export function ValueStepper({
	value,
	onValueChange,
	min = 0,
	max,
	step = 1,
	label,
}: ValueStepperProps) {
	const suffix = label ? ` ${label}` : ''

	return (
		<div className="flex items-center gap-1">
			<Button
				variant="plain"
				aria-label={`Decrease${suffix}`}
				disabled={value <= min}
				onClick={() => onValueChange(Math.max(min, value - step))}
			>
				<Icon icon={<Minus />} />
			</Button>
			<Button
				variant="plain"
				aria-label={`Increase${suffix}`}
				disabled={value >= max}
				onClick={() => onValueChange(Math.min(max, value + step))}
			>
				<Icon icon={<Plus />} />
			</Button>
		</div>
	)
}
