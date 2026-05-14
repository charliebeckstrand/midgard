'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'

interface ValueStepperProps {
	value: number
	onValueChange: (value: number) => void
	min?: number
	max: number
	step?: number
}

export function ValueStepper({ value, onValueChange, min = 0, max, step = 1 }: ValueStepperProps) {
	return (
		<div className="flex items-center gap-1">
			<Button
				variant="plain"
				disabled={value <= min}
				onClick={() => onValueChange(Math.max(min, value - step))}
			>
				<Icon icon={<Minus />} />
			</Button>
			<Button
				variant="plain"
				disabled={value >= max}
				onClick={() => onValueChange(Math.min(max, value + step))}
			>
				<Icon icon={<Plus />} />
			</Button>
		</div>
	)
}
