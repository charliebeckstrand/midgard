'use client'

import { Minus, Plus } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { k } from '../../recipes/kata/input'
import { Button } from '../button'
import type { ControlSize } from '../control/context'
import { useFormField } from '../form/context'
import { Icon } from '../icon'
import { Input, type InputProps } from '../input'

const padding: Record<ControlSize, string> = {
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
	onValueChange?: (value: number | undefined) => void
	min?: number
	max?: number
	step?: number
}

export function NumberInput({
	value,
	defaultValue,
	onValueChange,
	min,
	max,
	step = 1,
	disabled,
	size,
	className,
	name,
	ref,
	...props
}: NumberInputProps) {
	const field = useFormField(name)

	const [current, setCurrent] = useControllable<number>({
		value: field ? (field.value as number) : value,
		defaultValue,
		onChange: field
			? (v) => {
					field.setValue(v)
					onValueChange?.(v)
				}
			: onValueChange,
	})

	const resolvedSize: ControlSize = size ?? 'md'

	const precision = step.toString().split('.')[1]?.length ?? 0

	const round = (n: number) => Number(n.toFixed(precision))

	const clamp = (n: number) => {
		if (min !== undefined && n < min) return min
		if (max !== undefined && n > max) return max

		return n
	}

	const change = (delta: number) => {
		if (current === undefined) {
			setCurrent(round(clamp(0)))

			return
		}

		setCurrent(round(clamp(current + delta)))
	}

	const atMin = min !== undefined && current !== undefined && current <= min
	const atMax = max !== undefined && current !== undefined && current >= max

	const decrease = () => change(-step)
	const increase = () => change(step)

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const v = e.target.value

		if (v === '') {
			setCurrent(undefined)

			return
		}

		const n = Number(v)

		if (Number.isNaN(n)) return

		setCurrent(clamp(n))
	}

	return (
		<Input
			ref={ref}
			type="number"
			inputMode="decimal"
			data-slot="number-input"
			name={name}
			disabled={disabled}
			size={resolvedSize}
			value={current ?? ''}
			onChange={handleChange}
			onBlur={field ? () => field.setTouched() : undefined}
			min={min}
			max={max}
			step={step}
			className={cn(padding[resolvedSize], k.number, className)}
			suffix={
				<span className="pointer-events-auto flex items-center gap-0.5">
					<Button
						variant="plain"
						spring={false}
						tabIndex={-1}
						disabled={disabled || atMin}
						aria-label="Decrease"
						onClick={decrease}
					>
						<Icon icon={<Minus />} />
					</Button>
					<Button
						variant="plain"
						spring={false}
						tabIndex={-1}
						disabled={disabled || atMax}
						aria-label="Increase"
						onClick={increase}
					>
						<Icon icon={<Plus />} />
					</Button>
				</span>
			}
			{...props}
		/>
	)
}
