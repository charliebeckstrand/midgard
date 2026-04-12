'use client'

import { Minus, Plus } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '../../core'
import { useButtonHold, useControllable } from '../../hooks'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'

type Size = 'sm' | 'md' | 'lg'

const padding: Record<Size, string> = {
	sm: 'pr-[4rem]',
	md: 'pr-[4.5rem]',
	lg: 'pr-[5rem]',
}

export type NumberInputProps = Omit<
	InputProps,
	'type' | 'value' | 'defaultValue' | 'onChange' | 'suffix' | 'prefix' | 'min' | 'max' | 'step'
> & {
	value?: number | null
	defaultValue?: number
	onChange?: (value: number | undefined) => void
	min?: number
	max?: number
	step?: number
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
	{ value, defaultValue, onChange, min, max, step = 1, disabled, size, className, ...props },
	ref,
) {
	const [current, setValue] = useControllable<number>({ value, defaultValue, onChange })

	const resolvedSize: Size = size ?? 'md'

	const precision = step.toString().split('.')[1]?.length ?? 0

	const round = (n: number) => Number(n.toFixed(precision))

	const clamp = (n: number) => {
		if (min !== undefined && n < min) return min
		if (max !== undefined && n > max) return max

		return n
	}

	const change = (delta: number) => {
		const base = current ?? clamp(0)

		setValue(round(clamp(base + delta)))
	}

	const atMin = min !== undefined && current !== undefined && current <= min
	const atMax = max !== undefined && current !== undefined && current >= max

	const decreaseHold = useButtonHold(() => change(-step), { disabled: disabled || atMin })
	const increaseHold = useButtonHold(() => change(step), { disabled: disabled || atMax })

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value

		if (v === '') {
			setValue(undefined)

			return
		}

		const n = Number(v)

		if (Number.isNaN(n)) return

		setValue(clamp(n))
	}

	return (
		<Input
			ref={ref}
			type="number"
			inputMode="decimal"
			data-slot="number-input"
			disabled={disabled}
			size={resolvedSize}
			value={current ?? ''}
			onChange={handleChange}
			min={min}
			max={max}
			step={step}
			className={cn(padding[resolvedSize], katachi.input.number, className)}
			suffix={
				<span className="pointer-events-auto flex items-center gap-0.5">
					<Button
						variant="plain"
						spring={false}
						tabIndex={-1}
						disabled={disabled || atMin}
						aria-label="Decrease"
						{...decreaseHold}
					>
						<Icon icon={<Minus />} />
					</Button>
					<Button
						variant="plain"
						spring={false}
						tabIndex={-1}
						disabled={disabled || atMax}
						aria-label="Increase"
						{...increaseHold}
					>
						<Icon icon={<Plus />} />
					</Button>
				</span>
			}
			{...props}
		/>
	)
})
